import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import type { MailResult } from "~/result";

const ada = { email: "ada@example.com", name: "Ada" };

const mailer = createMailer({
  provider: memory(),
  senders: {
    auth: "Acme <auth@example.com>",
    notifications: "Acme <notifications@example.com>",
  },
  from: "notifications",
  templates: ({ letter, internal }) => ({
    "magic-code": letter<{ code: string }>({
      from: "auth",
      subject: (fields) => `Your code is ${fields.code}`,
      body: (fields, context) => {
        expectTypeOf(fields).toEqualTypeOf<{ code: string }>();
        expectTypeOf(context.reader.email).toEqualTypeOf<string>();

        return { text: fields.code };
      },
    }),
    welcome: letter({
      subject: "Welcome to Acme",
      body: () => ({ text: "Welcome." }),
    }),
    feedback: internal<{ note: string }>({
      inbox: "feedback@example.com",
      subject: "New feedback",
      body: (fields) => ({ text: fields.note }),
    }),
  }),
});

const bare = createMailer({ provider: memory(), senders: { auth: "a@example.com" } });

describe("mailer.sendTemplate", () => {
  it("should take only a name from the registry", async () => {
    // @ts-expect-error 'magic-cdoe' is not a letter in this registry
    await mailer.sendTemplate("magic-cdoe", { to: ada, fields: { code: "1" } });
  });

  it("should require the fields that letter asks for", async () => {
    // @ts-expect-error 'code' is missing
    await mailer.sendTemplate("magic-code", { to: ada, fields: {} });
  });

  it("should reject a field the letter does not have", async () => {
    // @ts-expect-error 'name' is not a field of this letter
    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "1", name: "Ada" } });
  });

  it("should reject a field of the wrong type", async () => {
    // @ts-expect-error code is a string
    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: 519204 } });
  });

  it("should take no fields for a letter that has none", async () => {
    await mailer.sendTemplate("welcome", { to: ada });
  });

  it("should require a reader for a letter somebody else reads", async () => {
    // @ts-expect-error 'to' is missing, and this letter has no inbox of its own
    await mailer.sendTemplate("magic-code", { fields: { code: "1" } });
  });

  it("should not require a reader for an internal letter", async () => {
    await mailer.sendTemplate("feedback", { fields: { note: "the map is slow" } });
  });

  it("should still allow a reader to override an internal letter", async () => {
    await mailer.sendTemplate("feedback", { to: ada, fields: { note: "slow" } });
  });

  it("should answer with the result union", async () => {
    expectTypeOf(await mailer.sendTemplate("welcome", { to: ada })).toEqualTypeOf<MailResult>();
  });

  it("should not exist when no templates are configured", async () => {
    // @ts-expect-error nothing was registered, so there is no letter to name
    await bare.sendTemplate("welcome", { to: ada });
  });
});

describe("mailer.send", () => {
  it("should take a sender key, never an address", async () => {
    // @ts-expect-error a sender is named, not spelled out
    await mailer.send({ from: "Acme <auth@example.com>", to: ada, subject: "Hi", text: "Hi" });
  });

  it("should reject a sender that was not declared", async () => {
    // @ts-expect-error there is no 'billing' sender
    await mailer.send({ from: "billing", to: ada, subject: "Hi", text: "Hi" });
  });

  it("should refuse a message with no body", async () => {
    // @ts-expect-error one of html or text is required
    await mailer.send({ to: ada, subject: "Hi" });
  });

  it("should take html, text, or both", async () => {
    await mailer.send({ to: ada, subject: "Hi", html: "<p>Hi</p>" });
    await mailer.send({ to: ada, subject: "Hi", text: "Hi" });
    await mailer.send({ to: ada, subject: "Hi", html: "<p>Hi</p>", text: "Hi" });
  });
});

describe("capabilities", () => {
  it("should allow an option the provider declares", async () => {
    await mailer.send({
      to: ada,
      subject: "Receipt",
      text: "Attached.",
      attachments: [{ filename: "receipt.pdf", content: { base64: "JVBERi0=" } }],
      idempotencyKey: "receipt-1",
      replyTo: "support@example.com",
      headers: { "X-Acme-Letter": "receipt" },
    });
  });

  it("should refuse an option the provider does not declare", async () => {
    // @ts-expect-error the memory provider declares no schedule capability
    await mailer.send({ to: ada, subject: "Hi", text: "Hi", sendAt: new Date() });
  });

  it("should refuse a scheduled letter too", async () => {
    // @ts-expect-error the memory provider declares no schedule capability
    await mailer.sendTemplate("welcome", { to: ada, sendAt: new Date() });
  });

  it("should refuse an option no provider has", async () => {
    // @ts-expect-error 'priority' is not an option
    await mailer.send({ to: ada, subject: "Hi", text: "Hi", priority: "high" });
  });
});
