import Handlebars from "handlebars";

export type FieldType =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "moment" }
  | { kind: "strings" }
  | { kind: "rows"; row: Fields }
  | { kind: "written"; type: string };

export type Field = { type: FieldType; optional: boolean };

export type Fields = Record<string, Field>;

/** One `t "key"` in a body, with the values it was given. */
export type CopyUse = { key: string; values: readonly string[] };

/** Names the render context supplies, so a body may use them and they are not fields. */
const CONTEXT = new Set(["reader", "locale"]);

/** Block helpers the body language has. */
const BLOCKS = new Set(["if", "unless", "each"]);

/**
 * Inline helpers the body language has, and what each one's arguments must be.
 *
 * Everything else is refused by name, because a mistyped helper quietly treated as a field
 * would put an empty string in a letter instead of failing the build.
 */
const HELPERS: Readonly<Record<string, readonly FieldType["kind"][]>> = {
  t: [],
  date: ["moment"],
  time: ["moment"],
  dateTime: ["moment"],
  money: ["number", "string"],
  list: ["strings"],
};

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

const isStringLiteral = (expression: hbs.AST.Expression): expression is hbs.AST.StringLiteral =>
  expression.type === "StringLiteral";

type Frame = {
  fields: Fields;
  /** Set when the scope is read as a value, as in `{{ this }}` inside an each. */
  scalar: boolean;
};

type Walk = {
  frames: readonly Frame[];
  optional: boolean;
  uses: CopyUse[];
};

function at(frames: readonly Frame[], depth: number): Frame | undefined {
  return frames[frames.length - 1 - depth];
}

/** A specific type beats the string a bare placeholder implies, and the first one wins. */
function merge(existing: Field | undefined, type: FieldType, optional: boolean): Field {
  if (existing === undefined) return { type, optional };

  const kept = existing.type.kind === "string" && type.kind !== "string" ? type : existing.type;

  return { type: kept, optional: existing.optional && optional };
}

function record(
  walk: Walk,
  path: hbs.AST.PathExpression,
  optional: boolean,
  type: FieldType = { kind: "string" },
): void {
  // `@index`, `@first` and friends belong to handlebars, not to the caller.
  if (path.data) return;

  const frame = at(walk.frames, path.depth);

  if (frame === undefined) {
    throw new Error(`'${path.original}' reaches further out than this letter's fields`);
  }

  if (path.parts.length === 0) {
    frame.scalar = true;

    return;
  }

  const [name, ...rest] = path.parts;

  if (name === undefined) return;
  if (path.depth === 0 && walk.frames.length === 1 && CONTEXT.has(name)) return;

  if (rest.length > 0) {
    throw new Error(
      `'${path.original}' reads through a field, so declare '${name}' under fields: in the header`,
    );
  }

  frame.fields[name] = merge(frame.fields[name], type, optional);
}

function typeFor(kind: FieldType["kind"]): FieldType {
  switch (kind) {
    case "number":
      return { kind: "number" };
    case "moment":
      return { kind: "moment" };
    case "strings":
      return { kind: "strings" };
    case "rows":
      return { kind: "rows", row: {} };
    default:
      return { kind: "string" };
  }
}

/** A helper call, wherever it appears: `{{ money total currency }}` or `(t "key")`. */
function walkHelper(
  name: string,
  params: readonly hbs.AST.Expression[],
  hash: hbs.AST.Hash | undefined,
  walk: Walk,
): void {
  const shape = HELPERS[name];

  if (shape === undefined) {
    throw new Error(`the helper '${name}' is not part of the body language`);
  }

  if (name === "t") {
    const key = params[0];

    if (key === undefined || !isStringLiteral(key)) {
      throw new Error("t needs a copy key written out, so the build can check it");
    }

    const values: string[] = [];

    for (const pair of hash?.pairs ?? []) {
      values.push(pair.key);
      walkExpression(pair.value, walk);
    }

    walk.uses.push({ key: key.value, values });

    return;
  }

  params.forEach((param, index) => {
    const kind = shape[index];

    if (kind === undefined) throw new Error(`${name} takes ${shape.length} arguments`);

    if (isPath(param)) {
      record(walk, param, walk.optional, typeFor(kind));

      return;
    }

    walkExpression(param, walk);
  });

  for (const pair of hash?.pairs ?? []) {
    // `zone=timezone` is a field; `style="long"` is a literal and nothing else.
    if (isPath(pair.value)) record(walk, pair.value, walk.optional);
    else walkExpression(pair.value, walk);
  }
}

function walkExpression(expression: hbs.AST.Expression, walk: Walk): void {
  if (isPath(expression)) {
    record(walk, expression, walk.optional);

    return;
  }

  if (isSubExpression(expression)) {
    walkHelper(expression.path.original, expression.params, expression.hash, walk);
  }
}

function walkHash(hash: hbs.AST.Hash | undefined, walk: Walk): void {
  for (const pair of hash?.pairs ?? []) walkExpression(pair.value, walk);
}

function walkProgram(program: hbs.AST.Program | undefined, walk: Walk): void {
  for (const statement of program?.body ?? []) {
    if (isSkippable(statement)) continue;

    if (isMustache(statement)) {
      if (!isPath(statement.path)) continue;

      if (statement.params.length > 0 || statement.hash?.pairs.length > 0) {
        walkHelper(statement.path.original, statement.params, statement.hash, walk);

        continue;
      }

      if (statement.path.original === "t") {
        throw new Error("t needs a copy key written out, so the build can check it");
      }

      record(walk, statement.path, walk.optional);

      continue;
    }

    if (isBlock(statement)) {
      walkBlock(statement, walk);

      continue;
    }

    if (isPartialBlock(statement)) {
      walkHash(statement.hash, walk);
      walkProgram(statement.program, walk);

      continue;
    }

    if (isPartial(statement)) {
      walkHash(statement.hash, walk);

      continue;
    }

    throw new Error(`${statement.type} is not part of the body language`);
  }
}

function walkBlock(statement: hbs.AST.BlockStatement, walk: Walk): void {
  const name = statement.path.original;

  if (typeof name !== "string" || !BLOCKS.has(name)) {
    throw new Error(`the block helper '${String(name)}' is not part of the body language`);
  }

  const subject = statement.params[0];

  if (subject === undefined || !isPath(subject)) {
    throw new Error(`#${name} needs a field to work on`);
  }

  if (name === "each") {
    const frame: Frame = { fields: {}, scalar: false };

    walkProgram(statement.program, {
      ...walk,
      frames: [...walk.frames, frame],
      optional: false,
    });
    walkProgram(statement.inverse, walk);

    record(walk, subject, walk.optional);

    const outer = at(walk.frames, subject.depth);
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
  record(walk, subject, true);
  walkProgram(statement.program, { ...walk, optional: true });
  walkProgram(statement.inverse, { ...walk, optional: true });
}

/** The `{name}` placeholders in a subject line, which are fields like any other. */
export function subjectPlaceholders(subject: string): readonly string[] {
  return [...subject.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1] ?? "");
}

export type InferredBody = {
  fields: Fields;
  partials: readonly string[];
  /** Every `t "key"` the body asked for, for the build to check against the catalogs. */
  copy: readonly CopyUse[];
};

/** Reads the fields a body asks for straight off its handlebars syntax tree. */
export function inferBody(source: string): InferredBody {
  const program = Handlebars.parse(source);
  const frame: Frame = { fields: {}, scalar: false };
  const partials: string[] = [];
  const uses: CopyUse[] = [];

  collectPartials(program, partials);
  walkProgram(program, { frames: [frame], optional: false, uses });

  return { fields: frame.fields, partials, copy: uses };
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
  if (field.type.kind === "number") return "number";
  if (field.type.kind === "moment") return "number | Date";
  if (field.type.kind === "strings") return "readonly string[]";
  if (field.type.kind === "written") return field.type.type;

  const row = Object.entries(field.type.row)
    .map(([name, inner]) => `${name}${inner.optional ? "?" : ""}: ${typeOf(inner)}`)
    .sort();

  return `readonly { ${row.join("; ")} }[]`;
}
