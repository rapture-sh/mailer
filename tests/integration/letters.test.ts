import { describe, expect, it } from "vitest";
import type { Attachment } from "~/message";
import { ada, captured, detail, inbox, mailerFor, reachable } from "./mock-resend";

/**
 * The generated registry under `tests/build/generated`, posted at a real mock-resend: the
 * whole path from a letter file and three catalogs to a message a server accepted and
 * stored. The fixtures are the same ones the unit tier renders.
 */
const booking = {
  activityName: "Kayak tour, Lake Thun",
  participants: 3,
  startsAt: new Date("2026-07-02T08:00:00.000Z"),
  timezone: "Europe/Zurich",
  tickets: ["2 Adult", "1 Child"],
  totalMinor: 12_500,
  currency: "CHF",
};

const invoice: Attachment = {
  filename: "invoice.pdf",
  content: new TextEncoder().encode("REF-4182 CHF 125.00"),
  contentType: "application/pdf",
};

describe.skipIf(!reachable)("a generated letter, over http", () => {
  it("should send from the sender its header names", async () => {
    const key = inbox("sender");
    const result = await mailerFor(key).sendTemplate("magic-code", {
      to: ada,
      fields: { code: "519204" },
    });

    if (!result.ok) throw new Error(result.error.message);

    // The subject comes out of the default catalog, with the field filled into it.
    expect(await captured(key, result.id)).toMatchObject({
      from: "Acme <auth@example.com>",
      subject: "Your code is 519204",
    });
  });

  it("should write the subject in the reader's locale", async () => {
    const key = inbox("locale-subject");
    const mailer = mailerFor(key);

    const english = await mailer.sendTemplate("magic-code", {
      to: ada,
      fields: { code: "519204" },
    });
    const swiss = await mailer.sendTemplate("magic-code", {
      to: { ...ada, locale: "de-CH" },
      fields: { code: "519204" },
    });

    if (!english.ok || !swiss.ok) throw new Error("both sends should have been accepted");

    const [one, other] = await Promise.all([captured(key, english.id), captured(key, swiss.id)]);

    expect([one.subject, other.subject]).toEqual(["Your code is 519204", "Dein Code ist 519204"]);
  });

  it("should format the dates and the money in the reader's locale", async () => {
    const key = inbox("locale-body");
    const mailer = mailerFor(key);

    const english = await mailer.sendTemplate("booking", { to: ada, fields: booking });
    const swiss = await mailer.sendTemplate("booking", {
      to: { ...ada, locale: "de-CH" },
      fields: booking,
    });

    if (!english.ok || !swiss.ok) throw new Error("both sends should have been accepted");

    const [one, other] = await Promise.all([captured(key, english.id), captured(key, swiss.id)]);

    expect(String(one.html)).toContain("2 July 2026");
    expect(String(other.html)).toContain("2. Juli 2026");
    // The money too. Intl separates an amount from its currency with a non-breaking
    // space, which is correct and invisible, so it is normalised before comparing.
    expect(String(one.html).replaceAll(" ", " ")).toContain("You paid CHF 125.00.");
  });

  it("should address a letter with an inbox to itself, with the reply address it names", async () => {
    const key = inbox("internal");
    const result = await mailerFor(key).sendTemplate("feedback", {
      fields: { note: "The map is slow on mobile.", from: "host@example.com" },
    });

    if (!result.ok) throw new Error(result.error.message);

    expect(await captured(key, result.id)).toMatchObject({
      to: ["feedback@example.com"],
      reply_to: ["host@example.com"],
    });
  });

  it("should derive a text part from the html it rendered", async () => {
    const key = inbox("autotext");
    const result = await mailerFor(key).sendTemplate("welcome", { to: ada });

    if (!result.ok) throw new Error(result.error.message);

    const message = await captured(key, result.id);

    // The letter declares no text body, so this is what the html became.
    expect(message.text).toBeTruthy();
    expect(String(message.text)).not.toContain("<");
  });
});

describe.skipIf(!reachable)("a letter that attaches files, over http", () => {
  it("should be accepted by the same validation resend applies", async () => {
    const key = inbox("attach");
    const result = await mailerFor(key).sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    expect(result).toMatchObject({ ok: true });
  });

  it("should carry the file its header inlined, decoded to the right size", async () => {
    const key = inbox("inline");
    const result = await mailerFor(key).sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    if (!result.ok) throw new Error(result.error.message);

    const logo = (await detail(key, result.id)).attachments[0];

    // 70 bytes is the 1x1 png under fixtures/assets. The build inlined it as base64 and
    // the server decoded it back, so the round trip is what this asserts.
    expect(logo).toMatchObject({ content_type: "image/png", content_id: "logo", bytes: 70 });
  });

  it("should carry the attachment the caller passed, with its name", async () => {
    const key = inbox("passed");
    const result = await mailerFor(key).sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    if (!result.ok) throw new Error(result.error.message);

    const { attachments } = await detail(key, result.id);

    expect(attachments).toHaveLength(2);
    expect(attachments[1]).toMatchObject({
      filename: "invoice.pdf",
      content_type: "application/pdf",
      bytes: 19,
    });
  });

  it("should reference the inlined file from the html by content id", async () => {
    const key = inbox("cid");
    const result = await mailerFor(key).sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    if (!result.ok) throw new Error(result.error.message);

    expect(String((await captured(key, result.id)).html)).toContain('src="cid:logo"');
  });

  it("should leave out an optional attachment nobody passed", async () => {
    const key = inbox("optional");
    const result = await mailerFor(key).sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    if (!result.ok) throw new Error(result.error.message);

    expect((await detail(key, result.id)).attachments).toHaveLength(2);
  });

  it("should attach an optional one that was passed", async () => {
    const key = inbox("optional-given");
    const result = await mailerFor(key).sendTemplate("receipt", {
      to: ada,
      fields: {
        reference: "REF-4182",
        invoice,
        terms: { filename: "terms.txt", content: "VGVybXM=", contentType: "text/plain" },
      },
    });

    if (!result.ok) throw new Error(result.error.message);

    const { attachments } = await detail(key, result.id);

    expect(attachments).toHaveLength(3);
    // "Terms" is 5 bytes once the server decodes the base64 string we passed through.
    expect(attachments[2]).toMatchObject({ filename: "terms.txt", bytes: 5 });
  });
});
