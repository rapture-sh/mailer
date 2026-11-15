import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import { resend } from "~/providers/resend";
import type { MailResult } from "~/result";

/**
 * The README's quick start, as it is printed. It is the first thing anybody sees on npm and
 * it once showed an API that no longer existed, so it compiles here or it is wrong there.
 */
const mailer = createMailer({
  provider: resend({ apiKey: process.env.RESEND_API_KEY ?? "" }),

  senders: {
    auth: "Acme <auth@acme.example>",
    notifications: "Acme <notifications@acme.example>",
  },
  from: "notifications",

  templates: ({ letter, internal }) => ({
    "magic-code": letter<{ code: string }>({
      from: "auth",
      subject: (fields) => `Your code is ${fields.code}`,
      body: (fields, { reader }) => ({
        text: `Hi ${reader.name ?? "there"}, your code is ${fields.code}.`,
        html: `<p>Hi ${reader.name ?? "there"}, your code is <b>${fields.code}</b>.</p>`,
      }),
    }),

    feedback: internal<{ note: string; from: string }>({
      inbox: "feedback@acme.example",
      subject: "New feedback",
      replyTo: (fields) => fields.from,
      body: (fields) => ({ text: fields.note }),
    }),
  }),
});

describe("the README's quick start", () => {
  it("should send the letter it says it sends", async () => {
    const result = await mailer.sendTemplate("magic-code", {
      to: { email: "ada@example.com", name: "Ada" },
      fields: { code: "519204" },
    });

    expectTypeOf(result).toEqualTypeOf<MailResult>();

    if (!result.ok && result.error.kind === "RateLimited") {
      expectTypeOf(result.error.retryAfterMs).toEqualTypeOf<number | undefined>();
    }
  });

  it("should take the options the README passes", async () => {
    await mailer.sendTemplate("magic-code", {
      to: { email: "ada@example.com", name: "Ada" },
      fields: { code: "519204" },
      idempotencyKey: "magic-code:request-1",
    });
  });

  it("should send the internal letter with no reader, as printed", async () => {
    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", from: "host@example.com" },
    });
  });

  it("should send a message built by hand, as printed", async () => {
    await mailer.send({
      from: "notifications",
      to: { email: "ada@example.com" },
      subject: "Receipt REF-4182",
      html: "<p>Thanks.</p>",
      text: "Thanks.",
    });
  });

  it("should take the attachments the README prints", async () => {
    await mailer.send({
      to: { email: "ada@example.com" },
      subject: "Receipt REF-4182",
      html: "<p>Thanks.</p>",
      attachments: [
        { filename: "receipt.pdf", content: new Uint8Array(), contentType: "application/pdf" },
        { filename: "logo.png", content: "iVBOR", inline: { cid: "logo" } },
      ],
    });
  });

  it("should take the retry options the README prints", () => {
    const configured = createMailer({
      provider: resend({ apiKey: "" }),
      senders: { notifications: "Acme <notifications@acme.example>" },
      retry: { attempts: 3, baseDelayMs: 500, maxDelayMs: 10_000 },
    });

    expectTypeOf(configured.provider).toEqualTypeOf<string>();
  });

  it("should refuse every line the README says it refuses", async () => {
    const to = { email: "ada@example.com" };

    // @ts-expect-error not a letter in this registry
    await mailer.sendTemplate("magic-cdoe", { to, fields: { code: "1" } });

    // @ts-expect-error property 'code' is missing
    await mailer.sendTemplate("magic-code", { to, fields: {} });

    // @ts-expect-error 'name' is not a field of this letter
    await mailer.sendTemplate("magic-code", { to, fields: { code: "1", name: "Ada" } });

    // @ts-expect-error this letter needs a reader
    await mailer.sendTemplate("magic-code", { fields: { code: "1" } });

    // @ts-expect-error one of html or text is required
    await mailer.send({ to, subject: "Hi" });

    await mailer.sendTemplate("magic-code", {
      // @ts-expect-error there is no catalog here, so a reader carries no locale
      to: { ...to, locale: "de-DE" },
      fields: { code: "1" },
    });
  });
});
