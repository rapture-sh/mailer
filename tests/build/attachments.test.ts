import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compileAttachments, contentTypeFor, MAX_INLINE_BYTES } from "~/build/attachments";
import type { HeaderAttachment } from "~/build/frontmatter";

type FileAttachment = Extract<HeaderAttachment, { kind: "file" }>;

const file = (
  path: string,
  extra: Partial<Omit<FileAttachment, "kind" | "path">> = {},
): HeaderAttachment => ({
  kind: "file",
  path,
  filename: undefined,
  contentType: undefined,
  cid: undefined,
  ...extra,
});

async function withFile(name: string, contents: Uint8Array | string) {
  const directory = await mkdtemp(join(tmpdir(), "mailer-attach-"));

  await writeFile(join(directory, name), contents);

  return { directory, at: (path: string) => join(directory, path) };
}

describe("contentTypeFor", () => {
  it("should label the files a letter actually carries", () => {
    expect([contentTypeFor("logo.png"), contentTypeFor("invoice.pdf")]).toEqual([
      "image/png",
      "application/pdf",
    ]);
  });

  it("should ignore the case of the extension", () => {
    expect(contentTypeFor("SCAN.PDF")).toBe("application/pdf");
  });

  it("should leave an extension it does not know unlabelled", () => {
    expect(contentTypeFor("archive.sgi")).toBeUndefined();
  });

  it("should leave a file with no extension unlabelled", () => {
    expect(contentTypeFor("LICENSE")).toBeUndefined();
  });
});

describe("compileAttachments", () => {
  it("should read a file and hand back its bytes as base64", async () => {
    const { at } = await withFile("logo.png", "Acme");

    const compiled = await compileAttachments("receipt", [file("logo.png")], at);

    expect(compiled).toEqual([
      {
        kind: "file",
        key: "receipt/logo.png",
        filename: "logo.png",
        contentType: "image/png",
        cid: undefined,
        base64: "QWNtZQ==",
      },
    ]);
  });

  it("should key a file by the letter, so two letters may both attach a logo", async () => {
    const { at } = await withFile("logo.png", "Acme");

    const one = await compileAttachments("receipt", [file("logo.png")], at);
    const other = await compileAttachments("welcome", [file("logo.png")], at);

    expect([one[0], other[0]]).toMatchObject([
      { key: "receipt/logo.png" },
      { key: "welcome/logo.png" },
    ]);
  });

  it("should keep one letter's two same named files apart", async () => {
    const { at } = await withFile("logo.png", "Acme");

    const compiled = await compileAttachments("receipt", [file("logo.png"), file("logo.png")], at);

    expect(compiled.map((entry) => entry.kind === "file" && entry.key)).toEqual([
      "receipt/logo.png",
      "receipt/2-logo.png",
    ]);
  });

  it("should take the filename and the content type the header wrote", async () => {
    const { at } = await withFile("blob", "Acme");

    const compiled = await compileAttachments(
      "receipt",
      [file("blob", { filename: "invoice.pdf", contentType: "application/x-pdf" })],
      at,
    );

    expect(compiled[0]).toMatchObject({
      filename: "invoice.pdf",
      contentType: "application/x-pdf",
    });
  });

  it("should carry a content id for a file meant to be shown in the body", async () => {
    const { at } = await withFile("logo.png", "Acme");

    const compiled = await compileAttachments("receipt", [file("logo.png", { cid: "logo" })], at);

    expect(compiled[0]).toMatchObject({ cid: "logo" });
  });

  it("should leave a field for the caller to pass", async () => {
    const { at } = await withFile("ignored", "");

    const compiled = await compileAttachments(
      "receipt",
      [
        { kind: "field", field: "invoice", optional: false },
        { kind: "field", field: "terms", optional: true },
      ],
      at,
    );

    expect(compiled).toEqual([
      { kind: "field", field: "invoice", optional: false },
      { kind: "field", field: "terms", optional: true },
    ]);
  });

  it("should say which file is missing rather than failing on a read", async () => {
    const { at } = await withFile("logo.png", "Acme");

    await expect(compileAttachments("receipt", [file("nope.png")], at)).rejects.toThrow(
      /no file at 'nope.png'/,
    );
  });

  it("should refuse a file too large to inline, and say what to do instead", async () => {
    const { at } = await withFile("huge.pdf", new Uint8Array(MAX_INLINE_BYTES + 1));

    await expect(compileAttachments("receipt", [file("huge.pdf")], at)).rejects.toThrow(
      /Declare it as a field/,
    );
  });
});
