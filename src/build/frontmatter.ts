import { parse as parseYaml } from "yaml";

/** A plain object, copied key by key, or nothing if the value was not one. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;

  const record: Record<string, unknown> = {};

  for (const key of Object.keys(value)) record[key] = Reflect.get(value, key);

  return record;
}

/**
 * A subject is either written out, where `{field}` placeholders are filled in, or a copy
 * key, written as `subject: { key: welcome.subject }`. Which one it is comes from how it
 * was written rather than from guessing at the shape of the string.
 */
export type HeaderSubject = { text: string } | { key: string };

/**
 * One `attachments:` entry.
 *
 * A `path` is a file beside the letter, which the build reads and inlines. A `field` is
 * left to the caller and becomes a field of the letter typed as an `Attachment`, so a
 * receipt that always carries an invoice says so once and the call site has to supply one.
 */
export type HeaderAttachment =
  | {
      kind: "file";
      path: string;
      filename: string | undefined;
      contentType: string | undefined;
      /** Set to reference the file from the html as `cid:<cid>` instead of attaching it. */
      cid: string | undefined;
    }
  | { kind: "field"; field: string; optional: boolean };

export type LetterHeader = {
  from: string | undefined;
  /** Present for a letter that comes to us, which is then addressed without a caller. */
  inbox: string | undefined;
  subject: HeaderSubject;
  /** The name of the field holding a reply address. */
  replyTo: string | undefined;
  /** Field name to the TypeScript type written for it, which always beats inference. */
  fields: Record<string, string>;
  attachments: readonly HeaderAttachment[];
  sample: Record<string, unknown> | undefined;
};

const FENCE = "---";

const KEYS = new Set(["from", "inbox", "subject", "reply-to", "fields", "attachments", "sample"]);

const ATTACHMENT_KEYS = new Set(["path", "field", "filename", "content-type", "cid", "optional"]);

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

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  return record[key] === undefined ? undefined : asString(record[key], key);
}

function asAttachment(value: unknown, at: number): HeaderAttachment {
  const where = `attachment ${at + 1}`;
  const record = asRecord(value);

  if (record === undefined) {
    throw new Error(`${where} has to be a map with a path or a field in it`);
  }

  for (const key of Object.keys(record)) {
    if (!ATTACHMENT_KEYS.has(key)) {
      throw new Error(
        `'${key}' is not an attachment key. Expected one of: ${[...ATTACHMENT_KEYS].join(", ")}`,
      );
    }
  }

  const path = optionalString(record, "path");
  const field = optionalString(record, "field");

  if (path !== undefined && field !== undefined) {
    throw new Error(`${where} has both a path and a field, which cannot both be the source`);
  }

  if (field !== undefined) {
    if (record.cid !== undefined) {
      throw new Error(
        `${where} is a field, so the caller sets its cid on the attachment it passes`,
      );
    }

    return { kind: "field", field, optional: record.optional === true };
  }

  if (path === undefined) {
    throw new Error(`${where} needs a path to a file, or a field the caller passes`);
  }

  return {
    kind: "file",
    path,
    filename: optionalString(record, "filename"),
    contentType: optionalString(record, "content-type"),
    cid: optionalString(record, "cid"),
  };
}

function asAttachments(value: unknown): readonly HeaderAttachment[] {
  if (!Array.isArray(value)) throw new Error("attachments has to be a list");

  return value.map((entry: unknown, at) => asAttachment(entry, at));
}

function asSubject(value: unknown): HeaderSubject {
  if (typeof value === "string") return { text: value };

  const record = asRecord(value);
  const key = record?.key;

  if (typeof key === "string") return { key };

  throw new Error("subject has to be a line of text, or a copy key as { key: some.key }");
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
    subject: asSubject(record.subject),
    replyTo:
      record["reply-to"] === undefined ? undefined : asString(record["reply-to"], "reply-to"),
    fields: record.fields === undefined ? {} : asTypes(record.fields),
    attachments: record.attachments === undefined ? [] : asAttachments(record.attachments),
    sample,
  };
}
