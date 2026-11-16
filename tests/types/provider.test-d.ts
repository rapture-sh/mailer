import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import { mockResend } from "~/providers/mock-resend";
import { resend } from "~/providers/resend";

const ada = { email: "ada@example.com" };

const senders = { notifications: "Acme <notifications@example.com>" };

/**
 * Picking the provider at runtime, which is the arrangement the README prints: production
 * posts to Resend and everything else posts at a local mock. Both branches are the same
 * provider, so there is nothing for the capability types to disagree about.
 */
const swapped = createMailer({
  provider:
    process.env.NODE_ENV === "production"
      ? resend({ apiKey: "re_live" })
      : mockResend({ environment: "development" }),
  senders,
});

describe("a mailer swapped between resend and a local mock", () => {
  it("should keep everything resend can do", async () => {
    await swapped.send({
      to: ada,
      subject: "Hi",
      text: "Hi",
      sendAt: new Date(),
      idempotencyKey: "once",
      tags: [{ name: "letter", value: "welcome" }],
    });
  });

  it("should still refuse an option no provider has", async () => {
    await swapped.send({
      to: ada,
      subject: "Hi",
      text: "Hi",
      // @ts-expect-error nothing declares this option
      priority: "high",
    });
  });
});

/**
 * The limit of the capability guarantee, written down because it is not obvious and because
 * the next person to find it should not try to fix it with a cast.
 *
 * Two DIFFERENT providers in one expression are typed as the wider of the two. The memory
 * provider is a structural subtype of the resend provider, since its capability list is a
 * narrower array and `send` is bivariant in its options, so TypeScript reduces the union to
 * `resend` while inferring the type parameter and the call site is offered `sendAt` and
 * `tags` that the memory provider would drop in silence.
 *
 * It cannot be closed from here: reading the common capabilities off the union works, but
 * the union is gone before any type of ours sees it, and the reduction can only be stopped
 * by making a provider's capability list invariant, which would stop every provider being a
 * `SomeProvider`.
 *
 * Neither pattern this package documents is affected. The swap above uses one provider, and
 * a mailer that takes its provider from outside is generic, so each caller gets its own
 * capability set. Mixing two providers in one expression is the case to avoid, and this is
 * what it does today.
 */
const mixed = createMailer({
  provider: process.env.NODE_ENV === "production" ? resend({ apiKey: "re_live" }) : memory(),
  senders,
});

describe("two different providers in one expression", () => {
  it("should be typed as the wider of the two, which is the known limit", async () => {
    // Accepted, and the memory provider cannot schedule. If this line ever stops
    // compiling, TypeScript has changed how it infers and the caveat above can go.
    await mixed.send({ to: ada, subject: "Hi", text: "Hi", sendAt: new Date() });
  });

  it("should be avoided by giving a test its own mailer instead", async () => {
    // What to do about it: one provider per mailer, so the capability set is exact.
    const offline = createMailer({ provider: memory(), senders });

    await offline.send({
      to: ada,
      subject: "Hi",
      text: "Hi",
      // @ts-expect-error the memory provider cannot schedule, and here that is caught
      sendAt: new Date(),
    });
  });
});

describe("the memory provider's own capabilities", () => {
  it("should not include scheduling", () => {
    expectTypeOf(memory().capabilities).toEqualTypeOf<
      readonly ("attachments" | "idempotency" | "replyTo" | "headers")[]
    >();
  });
});
