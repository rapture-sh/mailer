import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import type { Attachment } from "~/message";
import type { NoOptions, Provider, SomeProvider } from "~/provider";
import { memory } from "~/providers/memory";
import { defineTemplates } from "~/template";
import { templates } from "../build/generated/templates";

const ada = { email: "ada@example.com" };

const senders = {
  auth: "Acme <auth@example.com>",
  notifications: "Acme <notifications@example.com>",
};

const invoice: Attachment = { filename: "invoice.pdf", content: { base64: "JVBERi0=" } };

const mailer = createMailer({ provider: memory(), senders, from: "notifications", templates });

/**
 * `receipt.hbs` attaches a logo beside it and declares two attachments the caller passes,
 * one of them optional. The generated registry is what these read, so they cover the whole
 * path from a letter's header to the call site.
 */
describe("an attachment a letter says the caller passes", () => {
  it("should be a field typed as an Attachment", () => {
    expectTypeOf(templates().letters.receipt)
      .toHaveProperty("body")
      .parameter(0)
      .toEqualTypeOf<{ invoice: Attachment; reference: string; terms?: Attachment }>();
  });

  it("should have to be passed", async () => {
    await mailer.sendTemplate("receipt", {
      to: ada,
      // @ts-expect-error the receipt letter declares an invoice attachment and it is missing
      fields: { reference: "REF-4182" },
    });
  });

  it("should refuse something that is not an attachment", async () => {
    await mailer.sendTemplate("receipt", {
      to: ada,
      // @ts-expect-error an invoice is an Attachment, not the name of a file
      fields: { reference: "REF-4182", invoice: "invoice.pdf" },
    });
  });

  it("should take one, with the optional one left out", async () => {
    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
    });
  });

  it("should take the optional one as well", async () => {
    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice, terms: invoice },
    });
  });

  it("should still take attachments at the call site beside the letter's own", async () => {
    await mailer.sendTemplate("receipt", {
      to: ada,
      fields: { reference: "REF-4182", invoice },
      attachments: [invoice],
    });
  });
});

/**
 * A letter's attachments never reach the call site, so `MessageOptions` cannot gate them
 * and the capability is checked on the letter's name instead.
 */
const noFiles: Provider<"headers", NoOptions> = {
  name: "no-files",
  capabilities: ["headers"],
  send: () => Promise.resolve({ ok: true, id: "1" }),
};

const limited = createMailer({ provider: noFiles, senders, from: "notifications", templates });

describe("a provider that cannot send attachments", () => {
  it("should refuse the letter that attaches files", async () => {
    await limited.sendTemplate(
      // @ts-expect-error receipt.hbs attaches a logo and this provider cannot send one
      "receipt",
      { to: ada, fields: { reference: "REF-4182", invoice } },
    );
  });

  it("should still send the letters that attach nothing", async () => {
    await limited.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });
  });

  it("should offer only the letters it can send", () => {
    expectTypeOf(limited.sendTemplate)
      .parameter(0)
      .toEqualTypeOf<"booking" | "feedback" | "magic-code" | "welcome">();
  });

  it("should take a registry whose letters attach nothing", () => {
    createMailer({
      provider: noFiles,
      senders,
      from: "notifications",
      templates: ({ letter }) => ({
        plain: letter({ subject: "Hi", body: () => ({ text: "Hi" }) }),
      }),
    });
  });
});

/**
 * The regression this shape exists for: the capability check must not live on the config.
 * A conditional over `CapabilitiesOf<TProvider>` cannot be decided here, and TypeScript
 * requires an object to satisfy both branches of a deferred conditional, so a config level
 * check made this pattern uncompilable for every registry with an attaching letter.
 */
describe("a mailer whose provider comes from outside", () => {
  it("should build with letters that attach files", () => {
    function mailerFor<TProvider extends SomeProvider>(provider: TProvider) {
      return createMailer({ provider, senders, from: "notifications", templates });
    }

    expectTypeOf(mailerFor(memory()).provider).toEqualTypeOf<string>();
  });
});

describe("autoText", () => {
  it("should be a boolean a caller may turn off", () => {
    createMailer({ provider: memory(), senders, from: "notifications", autoText: false });
  });

  it("should refuse anything but a boolean", () => {
    createMailer({
      provider: memory(),
      senders,
      from: "notifications",
      // @ts-expect-error autoText is on or off, not a mode
      autoText: "never",
    });
  });
});

/**
 * A generated module states what each letter carries twice: in its spec, which the mailer
 * reads, and in the letter entry itself, which does the carrying. They have to agree, or a
 * file passes the capability gate and is dropped, or a type promises a function that is not
 * there. The build writes both from one source; these cover the hand written module.
 */
describe("a generated registry that contradicts itself", () => {
  const html = (context: Record<string, unknown>) => `<p>${String(context.note)}</p>`;

  it("should refuse a letter that attaches more than its spec declares", () => {
    defineTemplates<{ sneak: { addressed: "caller"; fields: { note: string } } }>({
      letters: {
        sneak: {
          addressed: "caller",
          subject: "Sneak",
          html,
          // @ts-expect-error the spec for this letter does not say it attaches anything
          attachments: () => [invoice],
          sample: { note: "hi" },
        },
      },
    });
  });

  it("should refuse a letter whose spec promises attachments it has not got", () => {
    defineTemplates<{
      promised: { addressed: "caller"; attachments: true; fields: { note: string } };
    }>({
      letters: {
        // @ts-expect-error the spec says this letter attaches, and the entry has nothing
        promised: {
          addressed: "caller",
          subject: "Promised",
          html,
          sample: { note: "hi" },
        },
      },
    });
  });

  it("should take a letter that attaches exactly what its spec declares", () => {
    defineTemplates<{
      honest: { addressed: "caller"; attachments: true; fields: { note: string } };
    }>({
      letters: {
        honest: {
          addressed: "caller",
          subject: "Honest",
          html,
          attachments: () => [invoice],
          sample: { note: "hi" },
        },
      },
    });
  });
});

/**
 * The one shape in this package where a wrong value is not a type error anywhere and not a
 * provider error either: a base64 string and a line of text are both strings, and most text
 * decodes as valid base64, so a letter would go out with a file the reader cannot open.
 */
describe("an attachment's content", () => {
  it("should take bytes", () => {
    expectTypeOf<Uint8Array>().toExtend<Attachment["content"]>();
  });

  it("should take base64 that says it is base64", () => {
    expectTypeOf<{ base64: string }>().toExtend<Attachment["content"]>();
  });

  it("should refuse a bare string, which could be either", () => {
    expectTypeOf<string>().not.toExtend<Attachment["content"]>();
  });

  it("should refuse text passed as the content", async () => {
    await mailer.send({
      to: ada,
      subject: "Receipt",
      text: "Attached.",
      // @ts-expect-error a string has to say whether it is base64: { base64: "SGk=" }
      attachments: [{ filename: "note.txt", content: "Hello" }],
    });
  });
});
