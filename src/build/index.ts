import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import Handlebars from "handlebars";
import { type Catalog, placeholdersIn } from "../copy";
import { type CompiledAttachment, compileAttachments } from "./attachments";
import {
  type CompiledCatalog,
  type CompiledLetter,
  type CompiledPartial,
  emitModules,
} from "./emit";
import { type CopyUse, type Fields, inferBody, subjectPlaceholders } from "./fields";
import { type LetterHeader, parseHeader, splitFile } from "./frontmatter";

export {
  type CompiledAttachment,
  compileAttachments,
  contentTypeFor,
  MAX_INLINE_BYTES,
} from "./attachments";
export type { CompiledCatalog, CompiledLetter, CompiledPartial } from "./emit";
export { type EmittedModules, emitModules } from "./emit";
export {
  type CopyUse,
  type Field,
  type Fields,
  type FieldType,
  inferBody,
  typeOf,
} from "./fields";
export {
  type HeaderAttachment,
  type HeaderSubject,
  type LetterHeader,
  parseHeader,
  splitFile,
} from "./frontmatter";

export type CopyOptions = {
  /** The locale a reader with none, or one missing a key, reads instead. */
  default: string;
  /**
   * A directory of JSON files named after their locale, or a map of locale to file.
   *
   * The locale names are yours: `de`, `de-CH`, `de-Test-CH` and `pirate` are all fine, and
   * nothing here parses them. A name reaches `Intl` when something is formatted, and one it
   * cannot read falls back to the default locale.
   */
  catalogs: string | Readonly<Record<string, string>>;
  /**
   * Values every key may use without being passed them, for the links and addresses that
   * turn up in every letter's closing. They are yours, so unlike a caller's values they
   * are inserted without being escaped, which is what lets them carry markup.
   */
  values?: Readonly<Record<string, string>>;
};

export type BuildOptions = {
  /** The directory holding the letter files, or the files themselves. */
  letters: string | readonly string[];
  /** Where to write the generated module. */
  out: string;
  /**
   * The sender keys a letter may name. Generated code cannot be checked against the
   * senders by the compiler, so `from:` is checked here instead.
   */
  senders?: readonly string[];
  copy?: CopyOptions;
  /** What the generated module imports `defineTemplates` from. */
  packageImport?: string;
  /** Report whether what is on disk is current and write nothing. For CI. */
  check?: boolean;
  cwd?: string;
};

export type BuildResult = {
  /** The typed registry. */
  out: string;
  /** The precompiled bodies, beside it. */
  bodiesOut: string;
  letters: readonly string[];
  partials: readonly string[];
  locales: readonly string[];
  /** Copy keys no letter asked for. Not an error, but worth printing. */
  unusedKeys: readonly string[];
  written: boolean;
  /** True when what is on disk is not what the letter files produce. */
  stale: boolean;
};

const EXTENSION = ".hbs";

async function filesIn(directory: string, extension: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && extname(entry.name) === extension)
    .map((entry) => join(directory, entry.name))
    .sort();
}

function nameOf(file: string, extension: string): string {
  return basename(file, extension);
}

function forwardSlashes(path: string): string {
  return path.split(sep).join("/");
}

function importPath(from: string, to: string): string {
  const path = forwardSlashes(relative(dirname(from), to));

  return path.startsWith(".") ? path : `./${path}`;
}

/** A locale name is anything at all, so it needs an identifier to be imported as. */
function bindingFor(locale: string, taken: readonly string[]): string {
  const parts = locale.split(/[^a-zA-Z0-9]+/).filter((part) => part !== "");
  const joined = parts
    .map((part, index) => (index === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`))
    .join("");
  const start = /^[a-zA-Z_]/.test(joined) ? joined : `copy${joined}`;

  let binding = start;
  let count = 1;

  while (taken.includes(binding)) {
    count += 1;
    binding = `${start}${count}`;
  }

  return binding;
}

function asCatalog(value: unknown, file: string): Catalog {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${file}: a catalog has to be a map of keys to sentences`);
  }

  const catalog: Record<string, string> = {};

  for (const key of Object.keys(value)) {
    const message: unknown = Reflect.get(value, key);

    if (typeof message !== "string") {
      throw new Error(`${file}: the copy for '${key}' has to be a string`);
    }

    catalog[key] = message;
  }

  return catalog;
}

type LoadedCopy = {
  default: string;
  catalogs: Record<string, Catalog>;
  files: Record<string, string>;
  values: readonly string[];
};

async function loadCopy(options: CopyOptions, at: (path: string) => string): Promise<LoadedCopy> {
  const files: Record<string, string> =
    typeof options.catalogs === "string"
      ? Object.fromEntries(
          (await filesIn(at(options.catalogs), ".json")).map((file) => [
            nameOf(file, ".json"),
            file,
          ]),
        )
      : Object.fromEntries(
          Object.entries(options.catalogs).map(([locale, file]) => [locale, at(file)]),
        );

  const locales = Object.keys(files);

  if (locales.length === 0) throw new Error("copy was configured with no catalogs in it");

  if (!locales.includes(options.default)) {
    throw new Error(
      `the default locale '${options.default}' has no catalog. Found: ${locales.join(", ")}`,
    );
  }

  const catalogs: Record<string, Catalog> = {};

  for (const [locale, file] of Object.entries(files)) {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));

    catalogs[locale] = asCatalog(parsed, file);
  }

  return {
    default: options.default,
    catalogs,
    files,
    values: Object.keys(options.values ?? {}),
  };
}

/**
 * The authoritative catalog decides what a key is and which values it needs, so every
 * other locale has to have the same keys and agree about the placeholders inside them.
 *
 * A translation that renames `{otp}` to `{code}` would otherwise ship that brace to a
 * reader, which is the failure this exists to prevent.
 */
function checkCatalogs(copy: LoadedCopy): void {
  const source = copy.catalogs[copy.default] ?? {};
  const keys = Object.keys(source).sort();

  for (const [locale, catalog] of Object.entries(copy.catalogs)) {
    if (locale === copy.default) continue;

    const missing = keys.filter((key) => catalog[key] === undefined);

    if (missing.length > 0) {
      const shown = missing.slice(0, 5).join(", ");

      throw new Error(
        `${locale} is missing ${missing.length} key${
          missing.length === 1 ? "" : "s"
        } that ${copy.default} has: ${shown}${missing.length > 5 ? ", ..." : ""}`,
      );
    }

    for (const key of keys) {
      const here = [...placeholdersIn(catalog[key] ?? "")].sort().join(", ");
      const there = [...placeholdersIn(source[key] ?? "")].sort().join(", ");

      if (here !== there) {
        throw new Error(
          `${locale} and ${copy.default} disagree about '${key}': [${here}] against [${there}]`,
        );
      }
    }
  }
}

/** Field types from the header always beat what the body implies. */
function withWrittenTypes(fields: Fields, header: LetterHeader): Fields {
  const merged: Fields = { ...fields };

  for (const [name, type] of Object.entries(header.fields)) {
    merged[name] = {
      type: { kind: "written", type },
      optional: fields[name]?.optional ?? false,
    };
  }

  if ("text" in header.subject) {
    for (const name of subjectPlaceholders(header.subject.text)) {
      merged[name] ??= { type: { kind: "string" }, optional: false };
    }
  }

  return merged;
}

/**
 * An attachment the caller passes is a field of the letter, typed as an `Attachment`, so
 * the call site has to supply one. It is not rendered, which is why it is added after the
 * body's own fields and refuses to share a name with one.
 */
function withAttachmentFields(fields: Fields, attachments: readonly CompiledAttachment[]): Fields {
  const merged: Fields = { ...fields };

  for (const attachment of attachments) {
    if (attachment.kind !== "field") continue;

    if (merged[attachment.field] !== undefined) {
      throw new Error(
        `attachments: '${attachment.field}' is already a field of this letter, so it cannot also be one the caller attaches`,
      );
    }

    merged[attachment.field] = {
      type: { kind: "written", type: "Attachment" },
      optional: attachment.optional,
    };
  }

  return merged;
}

function checkCopyUses(uses: readonly CopyUse[], copy: LoadedCopy | undefined): void {
  if (uses.length === 0) return;

  if (copy === undefined) {
    throw new Error(`it asks for the copy key '${uses[0]?.key}' with no catalogs configured`);
  }

  const source = copy.catalogs[copy.default] ?? {};

  for (const use of uses) {
    const message = source[use.key];

    if (message === undefined) {
      throw new Error(`there is no copy for '${use.key}' in ${copy.default}`);
    }

    const needed = placeholdersIn(message);

    for (const name of needed) {
      if (!use.values.includes(name) && !copy.values.includes(name)) {
        throw new Error(`'${use.key}' needs a value for {${name}}`);
      }
    }

    for (const name of use.values) {
      if (!needed.includes(name)) throw new Error(`'${use.key}' has no {${name}} in it`);
    }
  }
}

function checkLetter(
  header: LetterHeader,
  fields: Fields,
  senders: readonly string[] | undefined,
  partials: readonly string[],
  known: readonly string[],
  attached: readonly string[],
): void {
  if (header.from !== undefined && senders !== undefined && !senders.includes(header.from)) {
    throw new Error(
      `from: '${header.from}' is not a sender. Expected one of: ${senders.join(", ")}`,
    );
  }

  if (header.replyTo !== undefined && fields[header.replyTo] === undefined) {
    throw new Error(`reply-to: '${header.replyTo}' is not a field of this letter`);
  }

  for (const partial of partials) {
    if (!known.includes(partial)) throw new Error(`there is no partial named '${partial}'`);
  }

  for (const field of attached) {
    if (header.sample?.[field] !== undefined) {
      throw new Error(`the sample has '${field}', which is an attachment rather than copy`);
    }
  }

  // An attachment is not rendered, so a sample has nothing useful to say about one.
  const required = Object.entries(fields)
    .filter(([name, field]) => !field.optional && !attached.includes(name))
    .map(([field]) => field);

  if (required.length === 0) return;

  if (header.sample === undefined) {
    throw new Error(
      `the header needs a sample, so the preview and the checks can render it: ${required.join(", ")}`,
    );
  }

  for (const field of required) {
    if (header.sample[field] === undefined) {
      throw new Error(`the sample has no '${field}', which is a field of this letter`);
    }
  }

  for (const field of Object.keys(header.sample)) {
    if (fields[field] === undefined) {
      throw new Error(`the sample has '${field}', which is not a field of this letter`);
    }
  }
}

type Pending = {
  name: string;
  header: LetterHeader;
  body: string;
  fields: Fields;
  attachments: readonly CompiledAttachment[];
  used: readonly string[];
  copy: readonly CopyUse[];
  subjectValues: readonly string[];
};

/**
 * Letter files in, one typed module out.
 *
 * A file with a `---` header is a letter; a file without one is a partial, which is how a
 * layout is recognised without being named anywhere. The fields come off the body's syntax
 * tree rather than out of a declaration, so a placeholder is all it takes to add one, and
 * every copy key is checked against every catalog before anything is written.
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
  const cwd = options.cwd ?? process.cwd();
  const at = (path: string): string => (isAbsolute(path) ? path : resolve(cwd, path));

  const files =
    typeof options.letters === "string"
      ? await filesIn(at(options.letters), EXTENSION)
      : options.letters.map(at);

  const copy = options.copy === undefined ? undefined : await loadCopy(options.copy, at);

  if (copy !== undefined) checkCatalogs(copy);

  const source = copy?.catalogs[copy.default] ?? {};
  const letters: CompiledLetter[] = [];
  const partials: CompiledPartial[] = [];
  const pending: Pending[] = [];
  const asked = new Set<string>();

  for (const file of files) {
    const name = nameOf(file, EXTENSION);
    const text = await readFile(file, "utf8");

    try {
      const { header, body } = splitFile(text);

      if (header === undefined) {
        partials.push({ name, spec: String(Handlebars.precompile(body)) });

        continue;
      }

      const parsed = parseHeader(header);
      const inferred = inferBody(body);
      const attachments = await compileAttachments(name, parsed.attachments, (path) =>
        resolve(dirname(file), path),
      );
      const fields = withAttachmentFields(withWrittenTypes(inferred.fields, parsed), attachments);
      const subject = parsed.subject;
      const subjectValues =
        "key" in subject
          ? placeholdersIn(source[subject.key] ?? "").filter(
              (value) => !copy?.values.includes(value),
            )
          : [];

      for (const value of subjectValues) {
        fields[value] ??= { type: { kind: "string" }, optional: false };
      }

      pending.push({
        name,
        header: parsed,
        body,
        fields,
        attachments,
        used: inferred.partials,
        copy:
          "key" in subject
            ? [...inferred.copy, { key: subject.key, values: subjectValues }]
            : inferred.copy,
        subjectValues,
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);

      throw new Error(`${file}: ${reason}`);
    }
  }

  const known = partials.map((partial) => partial.name);

  for (const letter of pending) {
    try {
      checkCopyUses(letter.copy, copy);
      checkLetter(
        letter.header,
        letter.fields,
        options.senders,
        letter.used,
        known,
        letter.attachments.flatMap((attachment) =>
          attachment.kind === "field" ? [attachment.field] : [],
        ),
      );

      for (const use of letter.copy) asked.add(use.key);

      letters.push({
        name: letter.name,
        header: letter.header,
        fields: letter.fields,
        subjectValues: letter.subjectValues,
        attachments: letter.attachments,
        spec: String(Handlebars.precompile(letter.body)),
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);

      throw new Error(`${letter.name}${EXTENSION}: ${reason}`);
    }
  }

  if (letters.length === 0) {
    throw new Error(
      `no letters found. A letter is a ${EXTENSION} file whose first line is ---; a file without a header is a partial.`,
    );
  }

  const out = at(options.out);
  const bodiesName = `${basename(out, ".ts")}.bodies`;
  const bodiesOut = join(dirname(out), `${bodiesName}.ts`);
  const catalogs: CompiledCatalog[] = [];

  for (const [locale, file] of Object.entries(copy?.files ?? {})) {
    catalogs.push({
      locale,
      binding: bindingFor(
        locale,
        catalogs.map((catalog) => catalog.binding),
      ),
      from: importPath(bodiesOut, file),
    });
  }

  const emitted = emitModules({
    letters,
    partials,
    // Relative and with forward slashes, so the generated file reads the same on every
    // machine and the output stays reproducible.
    source:
      typeof options.letters === "string"
        ? forwardSlashes(relative(cwd, at(options.letters))) || "."
        : `${files.length} files`,
    packageImport: options.packageImport ?? "@rapture-sh/mailer",
    bodiesImport: `./${bodiesName}`,
    ...(copy === undefined
      ? {}
      : {
          copy: {
            default: copy.default,
            catalogs,
            ...(options.copy?.values === undefined ? {} : { values: options.copy.values }),
          },
        }),
  });

  const current = await Promise.all([
    readFile(out, "utf8").catch(() => undefined),
    readFile(bodiesOut, "utf8").catch(() => undefined),
  ]);

  const stale = current[0] !== emitted.templates || current[1] !== emitted.bodies;
  const summary = {
    out,
    bodiesOut,
    letters: letters.map((letter) => letter.name),
    partials: known,
    locales: Object.keys(copy?.catalogs ?? {}),
    unusedKeys: Object.keys(source)
      .filter((key) => !asked.has(key))
      .sort(),
    stale,
  };

  if (!stale || options.check === true) return { ...summary, written: false };

  await writeFile(out, emitted.templates, "utf8");
  await writeFile(bodiesOut, emitted.bodies, "utf8");

  return { ...summary, written: true };
}
