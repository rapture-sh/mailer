import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import Handlebars from "handlebars";
import { type CompiledLetter, type CompiledPartial, emitModules } from "./emit";
import { type Fields, inferBody, subjectPlaceholders } from "./fields";
import { type LetterHeader, parseHeader, splitFile } from "./frontmatter";

export type { CompiledLetter, CompiledPartial } from "./emit";
export { type EmittedModules, emitModules } from "./emit";
export { type Field, type Fields, type FieldType, inferBody, typeOf } from "./fields";
export { type LetterHeader, parseHeader, splitFile } from "./frontmatter";

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
  /** What the generated module imports `defineTemplates` from. */
  packageImport?: string;
  /** Report whether the file on disk is current and write nothing. For CI. */
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
  written: boolean;
  /** True when what is on disk is not what the letter files produce. */
  stale: boolean;
};

const EXTENSION = ".hbs";

async function filesIn(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && extname(entry.name) === EXTENSION)
    .map((entry) => join(directory, entry.name))
    .sort();
}

function nameOf(file: string): string {
  return basename(file, EXTENSION);
}

/** Field types from the header always beat what the body implies. */
function withWrittenTypes(fields: Fields, header: LetterHeader): Fields {
  const merged: Fields = { ...fields };

  for (const [name, type] of Object.entries(header.fields)) {
    merged[name] = { type: { kind: "written", type }, optional: fields[name]?.optional ?? false };
  }

  for (const name of subjectPlaceholders(header.subject)) {
    merged[name] ??= { type: { kind: "string" }, optional: false };
  }

  return merged;
}

function checkLetter(
  header: LetterHeader,
  fields: Fields,
  senders: readonly string[] | undefined,
  partials: readonly string[],
  known: readonly string[],
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
    if (!known.includes(partial)) {
      throw new Error(`there is no partial named '${partial}'`);
    }
  }

  const required = Object.entries(fields)
    .filter(([, field]) => !field.optional)
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

/**
 * Letter files in, one typed module out.
 *
 * A file with a `---` header is a letter; a file without one is a partial, which is how a
 * layout is recognised without being named anywhere. The fields come off the body's syntax
 * tree rather than out of a declaration, so a placeholder is all it takes to add one.
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
  const cwd = options.cwd ?? process.cwd();
  const at = (path: string): string => (isAbsolute(path) ? path : resolve(cwd, path));

  const files =
    typeof options.letters === "string"
      ? await filesIn(at(options.letters))
      : options.letters.map(at);

  const letters: CompiledLetter[] = [];
  const partials: CompiledPartial[] = [];
  const pending: {
    name: string;
    header: LetterHeader;
    body: string;
    fields: Fields;
    used: readonly string[];
  }[] = [];

  for (const file of files) {
    const name = nameOf(file);
    const source = await readFile(file, "utf8");

    try {
      const { header, body } = splitFile(source);

      if (header === undefined) {
        partials.push({ name, spec: String(Handlebars.precompile(body)) });

        continue;
      }

      const parsed = parseHeader(header);
      const inferred = inferBody(body);

      pending.push({
        name,
        header: parsed,
        body,
        fields: withWrittenTypes(inferred.fields, parsed),
        used: inferred.partials,
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);

      throw new Error(`${file}: ${reason}`);
    }
  }

  const known = partials.map((partial) => partial.name);

  for (const letter of pending) {
    try {
      checkLetter(letter.header, letter.fields, options.senders, letter.used, known);

      letters.push({
        name: letter.name,
        header: letter.header,
        fields: letter.fields,
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

  const emitted = emitModules({
    letters,
    partials,
    // Relative and with forward slashes, so the generated file reads the same on every
    // machine and the output stays reproducible.
    source:
      typeof options.letters === "string"
        ? (relative(cwd, at(options.letters)) || ".").split(sep).join("/")
        : `${files.length} files`,
    packageImport: options.packageImport ?? "@rapture-sh/mailer",
    bodiesImport: `./${bodiesName}`,
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
    stale,
  };

  if (!stale || options.check === true) return { ...summary, written: false };

  await writeFile(out, emitted.templates, "utf8");
  await writeFile(bodiesOut, emitted.bodies, "utf8");

  return { ...summary, written: true };
}
