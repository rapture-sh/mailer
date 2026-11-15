import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { build } from "~/build/index";

/**
 * What the build refuses, which is the point of checking the copy there rather than in the
 * type system: every message names a file and says what is wrong with it.
 */
type Catalogs = Readonly<Record<string, Readonly<Record<string, string>>>>;

async function project(letter: string, catalogs: Catalogs): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mailer-copy-"));

  await mkdir(join(root, "letters"));
  await mkdir(join(root, "copy"));
  await writeFile(join(root, "letters", "note.hbs"), letter, "utf8");

  for (const [locale, catalog] of Object.entries(catalogs)) {
    await writeFile(join(root, "copy", `${locale}.json`), JSON.stringify(catalog, null, 2), "utf8");
  }

  return root;
}

async function run(
  letter: string,
  catalogs: Catalogs,
  options: { default?: string; values?: Record<string, string>; copy?: boolean } = {},
) {
  const root = await project(letter, catalogs);

  return build({
    letters: join(root, "letters"),
    out: join(root, "templates.ts"),
    ...(options.copy === false
      ? {}
      : {
          copy: {
            default: options.default ?? "en",
            catalogs: join(root, "copy"),
            ...(options.values === undefined ? {} : { values: options.values }),
          },
        }),
  });
}

const note = ["---", "subject: Note", "---", '<p>{{ t "note.body" }}</p>'].join("\n");

describe("the catalog checks", () => {
  it("should accept catalogs that agree", async () => {
    await expect(
      run(note, { en: { "note.body": "A note." }, de: { "note.body": "Eine Notiz." } }),
    ).resolves.toMatchObject({ locales: ["de", "en"], written: true });
  });

  it("should refuse a translation that is missing a key", async () => {
    await expect(run(note, { en: { "note.body": "A note." }, de: {} })).rejects.toThrow(
      /de is missing 1 key that en has: note\.body/,
    );
  });

  it("should refuse two catalogs that disagree about a placeholder", async () => {
    const letter = ["---", "subject: Note", "---", '<p>{{ t "note.body" who=name }}</p>'].join(
      "\n",
    );

    await expect(
      run(letter, {
        en: { "note.body": "A note for {who}." },
        de: { "note.body": "Eine Notiz für {wer}." },
      }),
    ).rejects.toThrow(/de and en disagree about 'note\.body': \[wer\] against \[who\]/);
  });

  it("should refuse a default locale with no catalog", async () => {
    await expect(run(note, { en: { "note.body": "A note." } }, { default: "fr" })).rejects.toThrow(
      /the default locale 'fr' has no catalog/,
    );
  });

  it("should refuse a key no catalog has", async () => {
    await expect(run(note, { en: { "other.key": "Something else." } })).rejects.toThrow(
      /there is no copy for 'note\.body' in en/,
    );
  });

  it("should refuse a key that needs a value nobody passed", async () => {
    await expect(run(note, { en: { "note.body": "A note for {who}." } })).rejects.toThrow(
      /'note\.body' needs a value for \{who\}/,
    );
  });

  it("should accept a value every key may use without being passed it", async () => {
    await expect(
      run(
        note,
        { en: { "note.body": "A note. Write to {supportLink}." } },
        { values: { supportLink: "<a>support</a>" } },
      ),
    ).resolves.toMatchObject({ written: true });
  });

  it("should refuse a value the key has no placeholder for", async () => {
    const letter = ["---", "subject: Note", "---", '<p>{{ t "note.body" who=name }}</p>'].join(
      "\n",
    );

    await expect(run(letter, { en: { "note.body": "A note." } })).rejects.toThrow(
      /'note\.body' has no \{who\} in it/,
    );
  });

  it("should refuse t at all when no catalogs are configured", async () => {
    await expect(run(note, { en: { "note.body": "A note." } }, { copy: false })).rejects.toThrow(
      /asks for the copy key 'note\.body' with no catalogs configured/,
    );
  });

  it("should refuse a copy key that is not written out", async () => {
    const letter = ["---", "subject: Note", "---", "<p>{{ t someKey }}</p>"].join("\n");

    await expect(run(letter, { en: { "note.body": "A note." } })).rejects.toThrow(
      /t needs a copy key written out/,
    );
  });

  it("should refuse a helper it does not have", async () => {
    const letter = ["---", "subject: Note", "---", "<p>{{ uppercase name }}</p>"].join("\n");

    await expect(run(letter, { en: { "note.body": "A note." } })).rejects.toThrow(
      /the helper 'uppercase' is not part of the body language/,
    );
  });

  it("should take locale names that are not language tags at all", async () => {
    await expect(
      run(note, {
        en: { "note.body": "A note." },
        "pirate-Speak": { "note.body": "A note, matey." },
        "internal-debug-9": { "note.body": "note.body" },
      }),
    ).resolves.toMatchObject({ locales: ["en", "internal-debug-9", "pirate-Speak"] });
  });
});
