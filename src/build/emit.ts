import { type Field, type Fields, subjectPlaceholders, typeOf } from "./fields";
import type { LetterHeader } from "./frontmatter";

export type CompiledLetter = {
  name: string;
  header: LetterHeader;
  fields: Fields;
  /** The placeholders a copy key subject needs, which are fields of the letter. */
  subjectValues: readonly string[];
  /** The precompiled handlebars body, as JavaScript source. */
  spec: string;
};

export type CompiledPartial = {
  name: string;
  spec: string;
};

/** One catalog, as the generated module will import it. */
export type CompiledCatalog = {
  locale: string;
  /** A JavaScript identifier to import it as. */
  binding: string;
  /** The path to import, relative to the generated module. */
  from: string;
};

export type EmitOptions = {
  letters: readonly CompiledLetter[];
  partials: readonly CompiledPartial[];
  /** Where the letters came from, for the line at the top of the file. */
  source: string;
  packageImport: string;
  /** What the typed module imports the compiled bodies from. */
  bodiesImport: string;
  copy?: {
    default: string;
    catalogs: readonly CompiledCatalog[];
    values?: Readonly<Record<string, string>>;
  };
};

export type EmittedModules = {
  /** The typed registry. Ordinary TypeScript, checked like anything else. */
  templates: string;
  /** The precompiled bodies. Machine written JavaScript, which strict mode cannot read. */
  bodies: string;
};

const INDENT = "  ";
const NEWLINE = "\n";

function quote(name: string): string {
  return JSON.stringify(name);
}

function escapeLiteral(text: string): string {
  return text.replace(/[\\`]/g, (character) => `\\${character}`).replace(/\$\{/g, "\\${");
}

function values(names: readonly string[]): string {
  return names.map((name) => `${name}: fields.${name}`).join(", ");
}

function subjectExpression(letter: CompiledLetter): string {
  const { subject } = letter.header;

  if ("key" in subject) {
    if (letter.subjectValues.length === 0) {
      return `(_fields, { t }) => t(${quote(subject.key)})`;
    }

    return `(fields, { t }) => t(${quote(subject.key)}, { ${values(letter.subjectValues)} })`;
  }

  const placeholders = subjectPlaceholders(subject.text);

  if (placeholders.length === 0) return quote(subject.text);

  const filled = escapeLiteral(subject.text).replace(
    /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,
    (whole, name: string) => (placeholders.includes(name) ? `\${fields.${name}}` : whole),
  );

  return `(fields) => \`${filled}\``;
}

function fieldsType(fields: Fields): string {
  const names = Object.keys(fields).sort();

  if (names.length === 0) return "Record<never, never>";

  const entries = names.map((name) => {
    const field = fields[name];

    if (field === undefined) return "";

    return `${name}${field.optional ? "?" : ""}: ${typeOf(field)}`;
  });

  return `{ ${entries.join("; ")} }`;
}

function sampleValue(value: unknown, field: Field | undefined): string {
  if (value instanceof Date) return `new Date(${quote(value.toISOString())})`;

  // A moment is typed as a Date or an epoch, and YAML hands back a plain string, so a
  // written out timestamp becomes the Date its field says it is.
  if (field?.type.kind === "moment" && typeof value === "string") {
    return `new Date(${quote(value)})`;
  }

  return JSON.stringify(value);
}

function sampleLiteral(sample: Record<string, unknown>, indent: string, fields: Fields): string {
  const lines = Object.entries(sample).map(
    ([name, value]) => `${indent}${INDENT}${name}: ${sampleValue(value, fields[name])},`,
  );

  return `{\n${lines.join("\n")}\n${indent}}`;
}

function letterEntry(letter: CompiledLetter): string {
  const { header } = letter;
  const outer = `${INDENT}${INDENT}`;
  const inner = `${outer}${INDENT}`;
  const lines = [`${outer}${quote(letter.name)}: {`];

  lines.push(`${inner}addressed: ${header.inbox === undefined ? '"caller"' : '"inbox"'},`);

  if (header.inbox !== undefined) lines.push(`${inner}inbox: ${quote(header.inbox)},`);
  if (header.from !== undefined) lines.push(`${inner}from: ${quote(header.from)},`);

  lines.push(`${inner}subject: ${subjectExpression(letter)},`);

  if (header.replyTo !== undefined) {
    lines.push(`${inner}replyToField: ${quote(header.replyTo)},`);
  }

  lines.push(`${inner}html: bodies[${quote(letter.name)}],`);

  if (header.sample !== undefined) {
    lines.push(`${inner}sample: ${sampleLiteral(header.sample, inner, letter.fields)},`);
  }

  lines.push(`${outer}},`);

  return lines.join(NEWLINE);
}

/**
 * Two files, because they are different kinds of thing.
 *
 * `templates.ts` is the typed registry: the letter kinds, the field types, the locales and
 * the samples, all checked by the consumer's own compiler, which is the whole reason for
 * generating it. `templates.bodies.ts` is what handlebars' precompiler emits, which is
 * plain JavaScript with no annotations and cannot pass strict mode, so it carries
 * `@ts-nocheck` and nothing else. Keeping them apart is what stops that one suppression
 * from covering the types. The catalogs are imported by the bodies, because that is where
 * the helpers are registered, and the typed module reads the copy back out of it.
 */
export function emitModules(options: EmitOptions): EmittedModules {
  const letters = [...options.letters].sort((one, other) => one.name.localeCompare(other.name));
  const partials = [...options.partials].sort((one, other) => one.name.localeCompare(other.name));
  const copy = options.copy;

  const spec = letters.map(
    (letter) =>
      `${INDENT}${quote(letter.name)}: { addressed: ${
        letter.header.inbox === undefined ? '"caller"' : '"inbox"'
      }; fields: ${fieldsType(letter.fields)} };`,
  );

  const templates = [
    `// Generated by the mailer build from ${options.source}. Do not edit.`,
    "//",
    `// ${letters.length} letter${letters.length === 1 ? "" : "s"}, ${partials.length} partial${
      partials.length === 1 ? "" : "s"
    }${copy === undefined ? "" : `, ${copy.catalogs.length} locales`}. Change a letter file and run the build again.`,
    "",
    `import { defineTemplates } from ${quote(options.packageImport)};`,
    copy === undefined
      ? `import { bodies } from ${quote(options.bodiesImport)};`
      : `import { bodies, copy } from ${quote(options.bodiesImport)};`,
    "",
    "export type Letters = {",
    ...spec,
    "};",
    "",
  ];

  if (copy !== undefined) {
    templates.push(
      "/** The locales your catalogs declare. A reader may carry one of these and nothing else. */",
      `export type Locale = keyof typeof copy.catalogs;`,
      "",
    );
  }

  templates.push(
    copy === undefined
      ? "export const templates = defineTemplates<Letters>({"
      : "export const templates = defineTemplates<Letters, typeof copy>({",
    ...(copy === undefined ? [] : [`${INDENT}copy,`]),
    `${INDENT}letters: {`,
    ...letters.map(letterEntry),
    `${INDENT}},`,
    "});",
    "",
  );

  const bodies = [
    "// @ts-nocheck Handlebars' precompiler emits plain JavaScript, which has no",
    "// annotations to satisfy strict mode. Generated alongside the typed registry beside",
    "// it. Do not edit.",
    "",
    'import runtime from "handlebars/runtime";',
  ];

  if (copy !== undefined) {
    bodies.push(
      `import { registerCopyHelpers } from ${quote(`${options.packageImport}/handlebars`)};`,
      ...copy.catalogs.map((catalog) => `import ${catalog.binding} from ${quote(catalog.from)};`),
      "",
      "export const copy = {",
      `${INDENT}default: ${quote(copy.default)},`,
      `${INDENT}catalogs: {`,
      ...copy.catalogs.map(
        (catalog) => `${INDENT}${INDENT}${quote(catalog.locale)}: ${catalog.binding},`,
      ),
      `${INDENT}},`,
      ...(copy.values === undefined
        ? []
        : [
            `${INDENT}values: ${JSON.stringify(copy.values, null, 2).split("\n").join(`\n${INDENT}`)},`,
          ]),
      "};",
      "",
      "registerCopyHelpers(runtime, copy);",
    );
  }

  bodies.push("");

  if (partials.length > 0) {
    bodies.push(
      "const partials = {",
      ...partials.map(
        (partial) => `${INDENT}${quote(partial.name)}: runtime.template(${partial.spec}),`,
      ),
      "};",
      "",
      "for (const [name, partial] of Object.entries(partials)) {",
      `${INDENT}runtime.registerPartial(name, partial);`,
      "}",
      "",
    );
  }

  bodies.push(
    "export const bodies = {",
    ...letters.map((letter) => `${INDENT}${quote(letter.name)}: runtime.template(${letter.spec}),`),
    "};",
    "",
  );

  return { templates: templates.join(NEWLINE), bodies: bodies.join(NEWLINE) };
}
