import { parse as parseYaml } from "yaml";

/** A plain object, copied key by key, or nothing if the value was not one. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;

  const record: Record<string, unknown> = {};

  for (const key of Object.keys(value)) record[key] = Reflect.get(value, key);

  return record;
}

export type LetterHeader = {
  from: string | undefined;
  /** Present for a letter that comes to us, which is then addressed without a caller. */
  inbox: string | undefined;
  subject: string;
  /** The name of the field holding a reply address. */
  replyTo: string | undefined;
  /** Field name to the TypeScript type written for it, which always beats inference. */
  fields: Record<string, string>;
  sample: Record<string, unknown> | undefined;
};

const FENCE = "---";

const KEYS = new Set(["from", "inbox", "subject", "reply-to", "fields", "sample"]);

export type SplitFile = {
  /** The header's YAML, or nothing for a file that has none, which makes it a partial. */
  header: string | undefined;
  body: string;
};

/**
 * Splits a letter file into its header and its handlebars body.
 *
 * A file with no header is a partial rather than a letter, which is how `layout.hbs` is
 * recognised without naming it anywhere.
 */
export function splitFile(source: string): SplitFile {
  const text = source.replace(/^﻿/, "");

  if (!text.startsWith(`${FENCE}\n`) && !text.startsWith(`${FENCE}\r\n`)) {
    return { header: undefined, body: text };
  }

  const lines = text.split(/\r?\n/);
  const end = lines.indexOf(FENCE, 1);

  if (end === -1) throw new Error("the header opens with --- but never closes");

  return {
    header: lines.slice(1, end).join("\n"),
    body: lines.slice(end + 1).join("\n"),
  };
}

function asString(value: unknown, what: string): string {
  if (typeof value !== "string") throw new Error(`${what} has to be a string`);

  return value;
}

function asTypes(value: unknown): Record<string, string> {
  const record = asRecord(value);

  if (record === undefined) throw new Error("fields has to be a map of name to type");

  const types: Record<string, string> = {};

  for (const [name, type] of Object.entries(record)) {
    types[name] = asString(type, `the type of field '${name}'`);
  }

  return types;
}

export function parseHeader(yaml: string): LetterHeader {
  const parsed: unknown = parseYaml(yaml === "" ? "{}" : yaml);
  const record = asRecord(parsed);

  if (record === undefined) throw new Error("the header has to be a map of keys to values");

  for (const key of Object.keys(record)) {
    if (!KEYS.has(key)) {
      throw new Error(`'${key}' is not a header key. Expected one of: ${[...KEYS].join(", ")}`);
    }
  }

  if (record.subject === undefined) throw new Error("the header needs a subject");

  const sample = record.sample === undefined ? undefined : asRecord(record.sample);

  if (record.sample !== undefined && sample === undefined) {
    throw new Error("sample has to be a map of field names to values");
  }

  return {
    from: record.from === undefined ? undefined : asString(record.from, "from"),
    inbox: record.inbox === undefined ? undefined : asString(record.inbox, "inbox"),
    subject: asString(record.subject, "subject"),
    replyTo:
      record["reply-to"] === undefined ? undefined : asString(record["reply-to"], "reply-to"),
    fields: record.fields === undefined ? {} : asTypes(record.fields),
    sample,
  };
}
