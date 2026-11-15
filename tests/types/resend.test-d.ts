import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import type { CapabilitiesOf, OptionsOf } from "~/provider";
import { memory } from "~/providers/memory";
import { type ResendProvider, resend } from "~/providers/resend";

const ada = { email: "ada@example.com" };

const senders = { notifications: "Acme <notifications@example.com>" };

const onResend = createMailer({
  provider: resend({
    apiKey: "re_test",
    baseUrl: "http://localhost:3999",
    environment: "development",
  }),
  senders,
});

const onMemory = createMailer({ provider: memory(), senders });

describe("the resend provider", () => {
  it("should declare what it can do", () => {
    expectTypeOf<CapabilitiesOf<ResendProvider>>().toEqualTypeOf<
      "attachments" | "idempotency" | "schedule" | "replyTo" | "headers"
    >();
  });

  it("should declare its own options", () => {
    expectTypeOf<OptionsOf<ResendProvider>>().toEqualTypeOf<{
      tags?: readonly { name: string; value: string }[];
      cc?: string | readonly string[];
      bcc?: string | readonly string[];
    }>();
  });
});

describe("options typed to the configured provider", () => {
  it("should take resend's extras when resend is configured", async () => {
    await onResend.send({
      to: ada,
      subject: "Hi",
      text: "Hi",
      tags: [{ name: "letter", value: "welcome" }],
      cc: ["team@example.com"],
    });
  });

  it("should refuse resend's extras when another provider is configured", async () => {
    // @ts-expect-error the memory provider has no tags
    await onMemory.send({ to: ada, subject: "Hi", text: "Hi", tags: [] });
  });

  it("should refuse a malformed tag", async () => {
    // @ts-expect-error a tag needs a value as well as a name
    await onResend.send({ to: ada, subject: "Hi", text: "Hi", tags: [{ name: "letter" }] });
  });
});

describe("capabilities typed to the configured provider", () => {
  it("should let resend schedule, because it declares that it can", async () => {
    await onResend.send({ to: ada, subject: "Hi", text: "Hi", sendAt: new Date() });
  });

  it("should not let the memory provider schedule", async () => {
    // @ts-expect-error the memory provider declares no schedule capability
    await onMemory.send({ to: ada, subject: "Hi", text: "Hi", sendAt: new Date() });
  });

  it("should let both take attachments", async () => {
    const attachments = [{ filename: "a.txt", content: "QQ==" }];

    await onResend.send({ to: ada, subject: "Hi", text: "Hi", attachments });
    await onMemory.send({ to: ada, subject: "Hi", text: "Hi", attachments });
  });
});
