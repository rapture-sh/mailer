import { describe, expect, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import { templates } from "./generated/templates";

/**
 * The generated module, used exactly as a caller would. The fixtures under `fixtures/`
 * produced it, `tsc` checks it, and these tests render it, so the whole path from a letter
 * file and three catalogs to a posted message is covered.
 */
function setup() {
  const provider = memory();

  const mailer = createMailer({
    provider,
    senders: {
      auth: "Acme <auth@example.com>",
      notifications: "Acme <notifications@example.com>",
    },
    from: "notifications",
    templates,
  });

  return { provider, mailer };
}

const ada = { email: "ada@example.com", name: "Ada" };

const booking = {
  activityName: "Kayak tour, Lake Thun",
  participants: 3,
  startsAt: new Date("2026-07-02T08:00:00.000Z"),
  timezone: "Europe/Zurich",
  tickets: ["2 Adult", "1 Child"],
  totalMinor: 12_500,
  currency: "CHF",
};

describe("a generated letter", () => {
  it("should send from the sender its header names", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.from).toBe("Acme <auth@example.com>");
  });

  it("should fall back to the default sender when the header names none", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("welcome", { to: ada });

    expect(provider.sent[0]?.from).toBe("Acme <notifications@example.com>");
  });

  it("should address a letter with an inbox to itself", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", from: "host@example.com" },
    });

    expect(provider.sent[0]?.to).toEqual({ email: "feedback@example.com" });
  });

  it("should read reply-to out of the field its header names", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", from: "host@example.com" },
    });

    expect(provider.sent[0]?.replyTo).toBe("host@example.com");
  });

  it("should leave out a conditional block when its field is absent", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", { to: ada, fields: booking });

    expect(provider.sent[0]?.html).not.toContain("Voucher");
  });

  it("should include a conditional block when its field is there", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", {
      to: ada,
      fields: { ...booking, voucherCode: "SPRING26" },
    });

    expect(provider.sent[0]?.html).toContain("Voucher SPRING26 applied.");
  });
});

describe("the copy", () => {
  it("should take the subject from the key the header names", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.subject).toBe("Your code is 519204");
  });

  it("should write the whole letter in the reader's locale", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", {
      to: { ...ada, locale: "de-CH" },
      fields: { code: "519204" },
    });

    const sent = provider.sent[0];

    expect(sent?.subject).toBe("Dein Code ist 519204");
    expect(sent?.html).toContain("<h1>Anmelden</h1>");
    expect(sent?.html).toContain("Hallo Ada,");
    expect(sent?.html).toContain("Anmeldung abzuschliessen");
  });

  it("should take a locale called whatever its catalog is called", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", {
      to: { ...ada, locale: "pirate-Speak" },
      fields: { code: "519204" },
    });

    const sent = provider.sent[0];

    expect(sent?.subject).toBe("Yer code be 519204");
    expect(sent?.html).toContain("Ahoy Ada,");
  });

  it("should leave markup in the copy alone, because the copy is ours", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.html).toContain("<b>10 minutes</b>");
  });

  it("should escape a value put into the copy, because a value is not ours", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", {
      to: { email: "ada@example.com", name: "<script>alert(1)</script>" },
      fields: { code: "519204" },
    });

    const html = provider.sent[0]?.html ?? "";

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("should fill in a value every key may use without being passed it", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.html).toContain(
      '<a href="mailto:support@example.com">support@example.com</a>',
    );
  });
});

describe("the formatters", () => {
  it("should write the day in the reader's language and the activity's zone", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", { to: ada, fields: booking });

    // 08:00 UTC is a July day in Zurich, named the way en-GB names it.
    expect(provider.sent[0]?.html).toContain("2 July 2026");
  });

  it("should write the same day the way another locale names it", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", {
      to: { ...ada, locale: "de-CH" },
      fields: booking,
    });

    expect(provider.sent[0]?.html).toContain("2. Juli 2026");
  });

  it("should turn minor units into the reader's currency format", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", { to: ada, fields: booking });

    // Intl separates the currency from the amount with a non-breaking space, which is
    // correct in a letter and invisible in a diff.
    const html = (provider.sent[0]?.html ?? "").replaceAll(" ", " ");

    expect(html).toContain("You paid CHF 125.00.");
  });

  it("should join a list the way the language joins one", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", { to: ada, fields: booking });

    expect(provider.sent[0]?.html).toContain("2 Adult and 1 Child");
  });

  it("should join the same list with the other language's word", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", {
      to: { ...ada, locale: "de-CH" },
      fields: booking,
    });

    expect(provider.sent[0]?.html).toContain("2 Adult und 1 Child");
  });
});

describe("a generated letter that attaches files", () => {
  const invoice = {
    filename: "invoice.pdf",
    content: new TextEncoder().encode("REF-4182"),
    contentType: "application/pdf",
  };

  const terms = { filename: "terms.txt", content: { base64: "VGVybXM=" } };

  it("should attach the file its header named, encoded and content typed", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    expect(provider.sent[0]?.attachments?.[0]).toEqual({
      filename: "logo.png",
      // The build read logo.png and inlined it, so nothing touches the filesystem here.
      content: {
        base64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
      },
      contentType: "image/png",
      inline: { cid: "logo" },
    });
  });

  it("should attach what the caller passed after the letter's own", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    expect(provider.sent[0]?.attachments?.map((attachment) => attachment.filename)).toEqual([
      "logo.png",
      "invoice.pdf",
    ]);
  });

  it("should leave out an optional attachment that was not passed", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    expect(provider.sent[0]?.attachments).toHaveLength(2);
  });

  it("should attach an optional one that was", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice, terms },
    });

    expect(provider.sent[0]?.attachments?.map((attachment) => attachment.filename)).toEqual([
      "logo.png",
      "invoice.pdf",
      "terms.txt",
    ]);
  });

  it("should keep the attachments passed at the call site beside the letter's", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
      attachments: [{ filename: "extra.txt", content: { base64: "RXh0cmE=" } }],
    });

    expect(provider.sent[0]?.attachments?.map((attachment) => attachment.filename)).toEqual([
      "logo.png",
      "invoice.pdf",
      "extra.txt",
    ]);
  });

  it("should derive a text part from the html it rendered", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });

    // The letter declares no text body, and the layout is html with an inline image in it.
    expect(provider.sent[0]?.text).toBe("Receipt\n\nReceipt REF-4182 is attached.");
  });
});
