import Handlebars from "handlebars";

export type FieldType =
  | { kind: "string" }
  | { kind: "strings" }
  | { kind: "rows"; row: Fields }
  | { kind: "written"; type: string };

export type Field = { type: FieldType; optional: boolean };

export type Fields = Record<string, Field>;

/**
 * Names the render context supplies, so a body may use them and they are not fields.
 */
const CONTEXT = new Set(["reader"]);

/**
 * Block helpers the body language has. Everything else is refused by name, because a
 * mistyped helper that was quietly treated as a field would put an empty string in a
 * letter instead of failing the build.
 */
const BLOCKS = new Set(["if", "unless", "each"]);

const isMustache = (statement: hbs.AST.Statement): statement is hbs.AST.MustacheStatement =>
  statement.type === "MustacheStatement";

const isBlock = (statement: hbs.AST.Statement): statement is hbs.AST.BlockStatement =>
  statement.type === "BlockStatement";

const isPartial = (statement: hbs.AST.Statement): statement is hbs.AST.PartialStatement =>
  statement.type === "PartialStatement";

const isPartialBlock = (statement: hbs.AST.Statement): statement is hbs.AST.PartialBlockStatement =>
  statement.type === "PartialBlockStatement";

const isSkippable = (statement: hbs.AST.Statement): boolean =>
  statement.type === "ContentStatement" || statement.type === "CommentStatement";

const isPath = (expression: hbs.AST.Expression): expression is hbs.AST.PathExpression =>
  expression.type === "PathExpression";

const isSubExpression = (expression: hbs.AST.Expression): expression is hbs.AST.SubExpression =>
  expression.type === "SubExpression";

type Frame = {
  fields: Fields;
  /** Set when the scope is read as a value, as in `{{ this }}` inside an each. */
  scalar: boolean;
};

function at(frames: readonly Frame[], depth: number): Frame | undefined {
  return frames[frames.length - 1 - depth];
}

function record(frames: readonly Frame[], path: hbs.AST.PathExpression, optional: boolean): void {
  // `@index`, `@first` and friends belong to handlebars, not to the caller.
  if (path.data) return;

  const frame = at(frames, path.depth);

  if (frame === undefined) {
    throw new Error(`'${path.original}' reaches further out than this letter's fields`);
  }

  if (path.parts.length === 0) {
    frame.scalar = true;

    return;
  }

  const [name, ...rest] = path.parts;

  if (name === undefined) return;
  if (path.depth === 0 && frames.length === 1 && CONTEXT.has(name)) return;

  if (rest.length > 0) {
    throw new Error(
      `'${path.original}' reads through a field, so declare '${name}' under fields: in the header`,
    );
  }

  const existing = frame.fields[name];

  frame.fields[name] = {
    type: existing?.type ?? { kind: "string" },
    // A name used once behind an `#if` is optional; used anywhere unconditionally, it is not.
    optional: existing === undefined ? optional : existing.optional && optional,
  };
}

function walkExpression(
  expression: hbs.AST.Expression,
  frames: readonly Frame[],
  optional: boolean,
): void {
  if (isPath(expression)) {
    record(frames, expression, optional);

    return;
  }

  if (isSubExpression(expression)) {
    throw new Error(`the helper '${expression.path.original}' is not available yet`);
  }
}

function walkHash(
  hash: hbs.AST.Hash | undefined,
  frames: readonly Frame[],
  optional: boolean,
): void {
  for (const pair of hash?.pairs ?? []) walkExpression(pair.value, frames, optional);
}

function walkProgram(
  program: hbs.AST.Program | undefined,
  frames: readonly Frame[],
  optional: boolean,
): void {
  for (const statement of program?.body ?? []) {
    if (isSkippable(statement)) continue;

    if (isMustache(statement)) {
      if (!isPath(statement.path)) continue;

      if (statement.params.length > 0 || statement.hash?.pairs.length > 0) {
        throw new Error(`the helper '${statement.path.original}' is not available yet`);
      }

      record(frames, statement.path, optional);

      continue;
    }

    if (isBlock(statement)) {
      walkBlock(statement, frames, optional);

      continue;
    }

    if (isPartialBlock(statement)) {
      walkHash(statement.hash, frames, optional);
      walkProgram(statement.program, frames, optional);

      continue;
    }

    if (isPartial(statement)) {
      walkHash(statement.hash, frames, optional);

      continue;
    }

    throw new Error(`${statement.type} is not part of the body language`);
  }
}

function walkBlock(
  statement: hbs.AST.BlockStatement,
  frames: readonly Frame[],
  optional: boolean,
): void {
  const name = statement.path.original;

  if (typeof name !== "string" || !BLOCKS.has(name)) {
    throw new Error(`the block helper '${String(name)}' is not available yet`);
  }

  const subject = statement.params[0];

  if (subject === undefined || !isPath(subject)) {
    throw new Error(`#${name} needs a field to work on`);
  }

  if (name === "each") {
    const frame: Frame = { fields: {}, scalar: false };

    walkProgram(statement.program, [...frames, frame], false);
    walkProgram(statement.inverse, frames, optional);

    record(frames, subject, optional);

    const outer = at(frames, subject.depth);
    const field = outer?.fields[subject.parts.join(".")];

    if (outer !== undefined && field !== undefined) {
      outer.fields[subject.parts.join(".")] = {
        type: frame.scalar ? { kind: "strings" } : { kind: "rows", row: frame.fields },
        optional: field.optional,
      };
    }

    return;
  }

  // Everything an `#if` guards is conditional, so the field it tests and every field
  // inside it are optional.
  record(frames, subject, true);
  walkProgram(statement.program, frames, true);
  walkProgram(statement.inverse, frames, true);
}

/** The `{name}` placeholders in a subject line, which are fields like any other. */
export function subjectPlaceholders(subject: string): readonly string[] {
  return [...subject.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1] ?? "");
}

export type InferredBody = {
  fields: Fields;
  partials: readonly string[];
};

/** Reads the fields a body asks for straight off its handlebars syntax tree. */
export function inferBody(source: string): InferredBody {
  const program = Handlebars.parse(source);
  const frame: Frame = { fields: {}, scalar: false };
  const partials: string[] = [];

  collectPartials(program, partials);
  walkProgram(program, [frame], false);

  return { fields: frame.fields, partials };
}

function collectPartials(program: hbs.AST.Program | undefined, found: string[]): void {
  for (const statement of program?.body ?? []) {
    if (isPartial(statement) || isPartialBlock(statement)) {
      const path = isPath(statement.name) ? statement.name : undefined;
      const name = path === undefined || path.data ? undefined : path.original;

      if (typeof name === "string" && !found.includes(name)) found.push(name);
    }

    if (isBlock(statement)) {
      collectPartials(statement.program, found);
      collectPartials(statement.inverse, found);
    }

    if (isPartialBlock(statement)) collectPartials(statement.program, found);
  }
}

export function typeOf(field: Field): string {
  if (field.type.kind === "string") return "string";
  if (field.type.kind === "strings") return "readonly string[]";
  if (field.type.kind === "written") return field.type.type;

  const row = Object.entries(field.type.row)
    .map(([name, inner]) => `${name}${inner.optional ? "?" : ""}: ${typeOf(inner)}`)
    .sort();

  return `readonly { ${row.join("; ")} }[]`;
}
