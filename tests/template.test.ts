import { describe, expect, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import { defineTemplates, letterBuilder } from "~/template";

/**
 * `defineTemplates` is what a generated module calls, so these are the shapes a generator
 * emits rather than anything a person writes by hand.
 */
const bodies = {
  plain: (context: Record<string, unknown>) => `<p>${String(context.note)}</p>`,
};

function setup() {
  const provider = memory();

  const templates = defineTemplates<{
    plain: { addressed: "caller"; fields: { note: string } };
    inbound: { addressed: "inbox"; fields: { note: string; from: string } };
  }>({
    letters: {
      plain: {
        addressed: "caller",
        subject: "A plain letter",
        html: bodies.plain,
        text: (context) => String(context.note),
      },
      inbound: {
        addressed: "inbox",
        inbox: "inbox@example.com",
        from: "notifications",
        subject: (fields) => `About ${fields.note}`,
        replyToField: "from",
        html: bodies.plain,
      },
    },
  });

  const mailer = createMailer({
    provider,
    senders: { notifications: "Acme <n@example.com>" },
    templates,
  });

  return { provider, mailer, templates };
}

describe("defineTemplates", () => {
  it("should hand back a registry the mailer takes", () => {
    const { templates } = setup();

    expect(Object.keys(templates().letters)).toEqual(["plain", "inbound"]);
  });

  it("should carry no copy when a generated module has none", () => {
    const { templates } = setup();

    expect(templates().copy).toBeUndefined();
  });

  it("should mark a letter with an inbox as addressed by itself", () => {
    const { templates } = setup();

    expect(templates().letters.inbound.addressed).toBe("inbox");
  });

  it("should render both bodies a letter was generated with", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("plain", {
      to: { email: "ada@example.com" },
      fields: { note: "hello" },
    });

    expect(provider.sent[0]).toMatchObject({ html: "<p>hello</p>", text: "hello" });
  });

  it("should leave the text off a letter generated without one", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("inbound", { fields: { note: "hello", from: "h@e.com" } });

    expect(provider.sent[0]).not.toHaveProperty("text");
  });

  it("should take a subject that is a function of the fields", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("inbound", { fields: { note: "hello", from: "h@e.com" } });

    expect(provider.sent[0]?.subject).toBe("About hello");
  });

  it("should read reply-to out of the field the generator named", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("inbound", { fields: { note: "hello", from: "h@e.com" } });

    expect(provider.sent[0]?.replyTo).toBe("h@e.com");
  });
});

describe("letterBuilder", () => {
  it("should add the discriminant a caller cannot write themselves", () => {
    const { letter, internal } = letterBuilder();

    const outbound = letter({ subject: "Hi", body: () => ({ text: "Hi" }) });
    const inbound = internal({
      inbox: "inbox@example.com",
      subject: "Hi",
      body: () => ({ text: "Hi" }),
    });

    expect([outbound.addressed, inbound.addressed]).toEqual(["caller", "inbox"]);
  });
});
