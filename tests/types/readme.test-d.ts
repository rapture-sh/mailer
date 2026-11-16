import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import { resend } from "~/providers/resend";
import type { MailResult } from "~/result";

/**
 * Every snippet the README prints, as it is printed. It is the first thing anybody sees on
 * npm and it once showed an API that no longer existed, so it compiles here or it is wrong
 * there.
 */
describe("README: send one email", () => {
  const mailer = createMailer({
    provider: resend({ apiKey: process.env.RESEND_API_KEY ?? "" }),
    senders: { hello: "Acme <hello@acme.example>" },
  });

  it("should send with no template at all", async () => {
    const result = await mailer.send({
      to: { email: "ada@example.com" },
      subject: "Hello",
      html: "<p>Hello from Acme.</p>",
    });

    expectTypeOf(result).toEqualTypeOf<MailResult>();

    if (!result.ok) expectTypeOf(result.error.kind).toBeString();
  });

  it("should swap the provider for the memory one and still compile", async () => {
    const offline = createMailer({
      provider: memory(),
      senders: { hello: "Acme <hello@acme.example>" },
    });

    await offline.send({
      to: { email: "ada@example.com" },
      subject: "Hello",
      html: "<p>Hello from Acme.</p>",
    });
  });
});

describe("README: add a template", () => {
  const mailer = createMailer({
    provider: resend({ apiKey: process.env.RESEND_API_KEY ?? "" }),
    senders: { hello: "Acme <hello@acme.example>" },

    templates: ({ letter }) => ({
      "magic-code": letter<{ code: string }>({
        subject: (fields) => `Your code is ${fields.code}`,
        body: (fields, { reader }) => ({
          text: `Hi ${reader.name ?? "there"}, your code is ${fields.code}.`,
          html: `<p>Hi ${reader.name ?? "there"}, your code is <b>${fields.code}</b>.</p>`,
        }),
      }),
    }),
  });

  it("should send the template by name with its typed fields", async () => {
    const result = await mailer.sendTemplate("magic-code", {
      to: { email: "ada@example.com", name: "Ada" },
      fields: { code: "519204" },
    });

    expectTypeOf(result).toEqualTypeOf<MailResult>();
  });

  it("should refuse what the README says it refuses", async () => {
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
      // @ts-expect-error no catalogs are configured, so a reader carries no locale
      to: { ...to, locale: "de-DE" },
      fields: { code: "1" },
    });
  });
});

describe("README: an internal letter and a named sender", () => {
  const mailer = createMailer({
    provider: resend({ apiKey: "" }),
    senders: {
      auth: "Acme <auth@acme.example>",
      hello: "Acme <hello@acme.example>",
    },
    from: "hello",

    templates: ({ letter, internal }) => ({
      "magic-code": letter<{ code: string }>({
        from: "auth",
        subject: (fields) => `Your code is ${fields.code}`,
        body: (fields) => ({ text: fields.code }),
      }),
      feedback: internal<{ note: string; from: string }>({
        inbox: "feedback@acme.example",
        subject: "New feedback",
        replyTo: (fields) => fields.from,
        body: (fields) => ({ text: fields.note }),
      }),
    }),
  });

  it("should need no reader for a letter that names its own inbox", async () => {
    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", from: "host@example.com" },
    });
  });

  it("should refuse a sender that was never declared", async () => {
    createMailer({
      provider: memory(),
      senders: { auth: "Acme <auth@acme.example>", hello: "Acme <hello@acme.example>" },
      from: "hello",
      templates: ({ letter }) => ({
        broken: letter({
          // @ts-expect-error not assignable to "auth" | "hello"
          from: "atuh",
          subject: "Hi",
          body: () => ({ text: "Hi" }),
        }),
      }),
    });
  });

  it("should take the attachments the README prints", async () => {
    await mailer.send({
      to: { email: "ada@example.com" },
      subject: "Receipt REF-4182",
      html: "<p>Thanks.</p>",
      attachments: [
        {
          filename: "receipt.pdf",
          content: new Uint8Array(),
          contentType: "application/pdf",
        },
        { filename: "logo.png", content: { base64: "iVBOR" }, inline: { cid: "logo" } },
      ],
    });
  });

  it("should take the scheduling and tags Resend declares", async () => {
    await mailer.send({
      to: { email: "ada@example.com" },
      subject: "Hi",
      text: "Hi",
      sendAt: new Date(),
      tags: [{ name: "letter", value: "manual" }],
    });
  });

  it("should refuse those two on a provider that declares neither", async () => {
    const offline = createMailer({
      provider: memory(),
      senders: { hello: "Acme <hello@acme.example>" },
    });

    const message = { to: { email: "ada@example.com" }, subject: "Hi", text: "Hi" };

    // @ts-expect-error the memory provider cannot schedule
    await offline.send({ ...message, sendAt: new Date() });

    // @ts-expect-error tags belong to the Resend provider
    await offline.send({ ...message, tags: [] });
  });
});

describe("README: retries", () => {
  it("should take the retry options as printed", () => {
    const mailer = createMailer({
      provider: resend({ apiKey: "" }),
      senders: { hello: "Acme <hello@acme.example>" },
      retry: { attempts: 3, baseDelayMs: 500, maxDelayMs: 10_000 },
    });

    expectTypeOf(mailer.provider).toEqualTypeOf<string>();
  });
});

describe("README: a plain text part, for free", () => {
  it("should take autoText as printed", () => {
    const mailer = createMailer({
      provider: memory(),
      senders: { hello: "Acme <hello@acme.example>" },
      autoText: false,
    });

    expectTypeOf(mailer.provider).toEqualTypeOf<string>();
  });
});
