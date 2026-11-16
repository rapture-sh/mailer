import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import { mockResend } from "~/providers/mock-resend";
import { type ResendProvider, resend } from "~/providers/resend";

const ada = { email: "ada@example.com" };

const senders = { notifications: "Acme <notifications@example.com>" };

const development = { environment: "development" };

describe("mockResend", () => {
  it("should be the resend provider rather than a provider of its own", () => {
    expectTypeOf(mockResend(development)).toEqualTypeOf<ResendProvider>();
  });

  it("should reject an option that is not in its config", () => {
    mockResend({
      ...development,
      // @ts-expect-error mock-resend takes `url`, not resend's `baseUrl`
      baseUrl: "http://localhost:9100",
    });
  });

  it("should reject a misspelled config key", () => {
    mockResend({
      ...development,
      // @ts-expect-error there is no `apikey`
      apikey: "re_test",
    });
  });
});

/**
 * The reason it returns `ResendProvider` and not a type of its own: a caller picks the
 * provider with a ternary, and the two branches have to collapse to one type or the mailer
 * below it loses the capabilities.
 */
const provider =
  process.env.NODE_ENV === "production" ? resend({ apiKey: "re_live" }) : mockResend(development);

const mailer = createMailer({ provider, senders });

describe("a mailer built from either one", () => {
  it("should keep the capabilities the branch types agree on", async () => {
    await mailer.send({
      to: ada,
      subject: "Hi",
      text: "Hi",
      sendAt: new Date(),
      idempotencyKey: "once",
      tags: [{ name: "letter", value: "welcome" }],
    });
  });

  it("should still reject an option neither one declares", async () => {
    await mailer.send({
      to: ada,
      subject: "Hi",
      text: "Hi",
      // @ts-expect-error no provider declares this option
      priority: "high",
    });
  });
});
