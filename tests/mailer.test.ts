import { describe, expect, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";

const ada = { email: "ada@example.com", name: "Ada" };

function setup() {
  const provider = memory();

  const mailer = createMailer({
    provider,
    senders: {
      auth: "Acme <auth@example.com>",
      notifications: "Acme <notifications@example.com>",
    },
    from: "notifications",
    templates: ({ letter, internal }) => ({
      "magic-code": letter<{ code: string }>({
        from: "auth",
        subject: (fields) => `Your code is ${fields.code}`,
        body: (fields, { reader }) => ({
          text: `Hi ${reader.name ?? "there"}, your code is ${fields.code}.`,
        }),
      }),
      welcome: letter({
        subject: "Welcome to Acme",
        body: () => ({ text: "Welcome." }),
      }),
      feedback: internal<{ note: string; email: string }>({
        inbox: "feedback@example.com",
        subject: "New feedback",
        replyTo: (fields) => fields.email,
        body: (fields) => ({ text: fields.note }),
      }),
    }),
  });

  return { provider, mailer };
}

describe("createMailer", () => {
  it("should take the only sender as the default", async () => {
    const mailer = createMailer({
      provider: memory(),
      senders: { auth: "Acme <auth@example.com>" },
    });

    await expect(mailer.send({ to: ada, subject: "Hello", text: "Hello" })).resolves.toMatchObject({
      ok: true,
    });
  });

  it("should refuse to be built with several senders and no default", () => {
    expect(() =>
      createMailer({
        provider: memory(),
        senders: { auth: "a@example.com", notifications: "n@example.com" },
      }),
    ).toThrow(/default sender/);
  });

  it("should refuse to be built with no sender at all", () => {
    expect(() => createMailer({ provider: memory(), senders: {} })).toThrow(/at least one sender/);
  });
});

describe("mailer.send", () => {
  it("should use the default sender when none is named", async () => {
    const { provider, mailer } = setup();

    await mailer.send({ to: ada, subject: "Receipt", text: "Thanks." });

    expect(provider.sent[0]?.from).toBe("Acme <notifications@example.com>");
  });

  it("should use the sender the call names", async () => {
    const { provider, mailer } = setup();

    await mailer.send({ from: "auth", to: ada, subject: "Code", text: "519204" });

    expect(provider.sent[0]?.from).toBe("Acme <auth@example.com>");
  });

  it("should pass attachments through to the provider", async () => {
    const { provider, mailer } = setup();

    await mailer.send({
      to: ada,
      subject: "Receipt",
      text: "Attached.",
      attachments: [{ filename: "receipt.pdf", content: "JVBERi0=" }],
    });

    expect(provider.sent[0]?.attachments).toHaveLength(1);
  });

  it("should return the id the provider gave", async () => {
    const { mailer } = setup();

    const result = await mailer.send({ to: ada, subject: "Receipt", text: "Thanks." });

    expect(result).toEqual({ ok: true, id: "memory-1" });
  });
});

describe("mailer.sendTemplate", () => {
  it("should send from the sender the letter names", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.from).toBe("Acme <auth@example.com>");
  });

  it("should fall back to the default sender when the letter names none", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("welcome", { to: ada });

    expect(provider.sent[0]?.from).toBe("Acme <notifications@example.com>");
  });

  it("should build the subject from the fields", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.subject).toBe("Your code is 519204");
  });

  it("should give the body the reader as well as the fields", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.text).toBe("Hi Ada, your code is 519204.");
  });

  it("should address an internal letter to its own inbox", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", email: "host@example.com" },
    });

    expect(provider.sent[0]?.to).toEqual({ email: "feedback@example.com" });
  });

  it("should let a caller override an internal letter's inbox", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("feedback", {
      to: ada,
      fields: { note: "The map is slow", email: "host@example.com" },
    });

    expect(provider.sent[0]?.to).toEqual(ada);
  });

  it("should set reply-to from the fields when the letter asks for it", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", email: "host@example.com" },
    });

    expect(provider.sent[0]?.replyTo).toBe("host@example.com");
  });

  it("should leave reply-to off a letter that does not ask for it", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("welcome", { to: ada });

    expect(provider.sent[0]).not.toHaveProperty("replyTo");
  });

  it("should return the error a provider answered with", async () => {
    const { provider, mailer } = setup();

    provider.failNext({
      kind: "InvalidRecipient",
      message: "not deliverable",
      provider: "memory",
      email: ada.email,
    });

    const result = await mailer.sendTemplate("welcome", { to: ada });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "InvalidRecipient",
        message: "not deliverable",
        provider: "memory",
        email: ada.email,
      },
    });
  });
});
