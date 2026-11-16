import { describe, expectTypeOf, it } from "vitest";
import type { LetterBuilder } from "~/index";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import { templates } from "../build/generated/templates";

/**
 * A generated registry and a hand written letter in one mailer, which is how a letter the
 * file format cannot express stays possible. The locale has to survive that merge: it once
 * did not, because a generated registry's copy arrives as `Config | undefined` and only the
 * optional shape was being matched.
 */
const senders = { auth: "Acme <auth@example.com>", notifications: "Acme <n@example.com>" };

const generated = templates();

const registry = ({ letter }: LetterBuilder<keyof typeof senders>) => ({
  copy: generated.copy,
  letters: {
    ...generated.letters,
    "password-reset": letter<{ url: string }>({
      from: "auth",
      subject: "Reset your password",
      body: (fields) => ({ text: fields.url }),
    }),
  },
});

const mailer = createMailer({
  provider: memory(),
  senders,
  from: "notifications",
  templates: registry,
});

const ada = { email: "ada@example.com", name: "Ada" };

describe("a merged registry", () => {
  it("should send a generated letter", async () => {
    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });
  });

  it("should send the hand written letter beside it", async () => {
    await mailer.sendTemplate("password-reset", {
      to: ada,
      fields: { url: "https://example.com/r/8fa2" },
    });
  });

  it("should type the hand written letter's fields too", async () => {
    // @ts-expect-error 'url' is the field this one declared
    await mailer.sendTemplate("password-reset", { to: ada, fields: { link: "x" } });
  });

  it("should keep the locales the generated catalogs declare", async () => {
    await mailer.sendTemplate("welcome", { to: { ...ada, locale: "de-CH" } });
    await mailer.sendTemplate("welcome", { to: { ...ada, locale: "pirate-Speak" } });
  });

  it("should still refuse a locale with no catalog", async () => {
    // @ts-expect-error the merge must not widen the locale back to a string
    await mailer.sendTemplate("welcome", { to: { ...ada, locale: "de-DE" } });
  });

  it("should offer every letter from both halves", () => {
    expectTypeOf(mailer.sendTemplate)
      .parameter(0)
      .toEqualTypeOf<
        "booking" | "feedback" | "magic-code" | "receipt" | "welcome" | "password-reset"
      >();
  });
});

describe("the senders a registry needs", () => {
  it("should refuse a mailer whose senders miss one a letter names", () => {
    createMailer({
      // @ts-expect-error magic-code.hbs names 'auth', which these senders do not have
      senders: { notifications: "Acme <n@example.com>" },
      provider: memory(),
      templates: () => generated,
    });
  });

  it("should accept a mailer that declares every sender the letters name", () => {
    createMailer({
      senders: { auth: "Acme <auth@example.com>", notifications: "Acme <n@example.com>" },
      provider: memory(),
      from: "notifications",
      templates: () => generated,
    });
  });

  it("should still refuse a sender no letter and no mailer knows", () => {
    createMailer({
      senders: { auth: "Acme <auth@example.com>", notifications: "Acme <n@example.com>" },
      provider: memory(),
      // @ts-expect-error 'billing' is not one of the senders
      from: "billing",
      templates: () => generated,
    });
  });
});
