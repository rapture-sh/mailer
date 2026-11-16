import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { HeaderAttachment } from "./frontmatter";

/**
 * What one `attachments:` entry becomes.
 *
 * A file is read and encoded now, so the generated module carries it and nothing touches
 * the filesystem at send time: this package runs in edge runtimes and Convex isolates,
 * where there is no `fs` to read a logo out of. A field is left to the caller and becomes
 * a typed field of the letter instead.
 */
export type CompiledAttachment =
  | {
      kind: "file";
      /** How the bodies module keys the encoded bytes. */
      key: string;
      filename: string;
      contentType: string | undefined;
      cid: string | undefined;
      base64: string;
    }
  | { kind: "field"; field: string; optional: boolean };

/**
 * Inlining a large file bloats the generated module and every bundle that imports it, and
 * the caller almost always meant to pass it in instead. Raw bytes, before base64 adds its
 * third.
 */
export const MAX_INLINE_BYTES = 2 * 1024 * 1024;

/**
 * Enough to label the files a letter actually carries. An unknown extension is left
 * unlabelled rather than guessed at, and the provider or the reader's client works it out.
 */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".html": "text/html",
  ".json": "application/json",
  ".xml": "application/xml",
  ".ics": "text/calendar",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".woff2": "font/woff2",
};

export function contentTypeFor(filename: string): string | undefined {
  return CONTENT_TYPES[extname(filename).toLowerCase()];
}

/**
 * The header's attachments, with every file read and encoded.
 *
 * `at` resolves a path against the letter file's own directory, so a letter refers to its
 * logo the way it sits beside it on disk, and `letter` namespaces the keys.
 */
export async function compileAttachments(
  letter: string,
  declared: readonly HeaderAttachment[],
  at: (path: string) => string,
): Promise<readonly CompiledAttachment[]> {
  const compiled: CompiledAttachment[] = [];
  const keys = new Set<string>();

  for (const entry of declared) {
    if (entry.kind === "field") {
      compiled.push({ kind: "field", field: entry.field, optional: entry.optional });

      continue;
    }

    const path = at(entry.path);
    const bytes = await readFile(path).catch(() => undefined);

    if (bytes === undefined) throw new Error(`there is no file at '${entry.path}' to attach`);

    if (bytes.length > MAX_INLINE_BYTES) {
      throw new Error(
        `'${entry.path}' is ${Math.round(bytes.length / 1024)}KB, over the ${
          MAX_INLINE_BYTES / 1024 / 1024
        }MB an inlined attachment may be. Declare it as a field and pass it at the call site.`,
      );
    }

    const filename = entry.filename ?? basename(path);
    // Keyed by the letter as well as the name, because the bodies module holds the files
    // of every letter in one object and two letters may both attach a `logo.png`.
    let key = `${letter}/${filename}`;
    let count = 1;

    while (keys.has(key)) {
      count += 1;
      key = `${letter}/${count}-${filename}`;
    }

    keys.add(key);

    compiled.push({
      kind: "file",
      key,
      filename,
      contentType: entry.contentType ?? contentTypeFor(filename),
      cid: entry.cid,
      base64: bytes.toString("base64"),
    });
  }

  return compiled;
}
