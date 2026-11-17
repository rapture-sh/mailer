import { memory } from "@rapturedotsh/mailer/memory";
import { describe, expect, it } from "vitest";
import { mailerFor } from "./mailer";

/**
 * What testing mail looks like when you can mock it: no network, no API key, no container,
 * and no `if (NODE_ENV === "test") return` anywhere in the code under test.
 *
 *   pnpm example:testing
 */
function setup() {
  const provider = memory();

  // No waiting: backoff is real, the sleep is not.
  const mailer = mailerFor(provider, { baseDelayMs: 0, sleep: () => Promise.resolve() });

  return { provider, mailer };
}

const reader = { email: "ada@example.com", name: "Ada" };

describe("the mail a sign in sends", () => {
  it("should send one message, from the auth mailbox", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: reader, fields: { code: "519204" } });

    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]?.from).toBe("Acme <auth@acme.example>");
  });

  it("should put the code in the subject and the body", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: reader, fields: { code: "519204" } });

    expect(provider.sent[0]?.subject).toBe("Your code is 519204");
    expect(provider.sent[0]?.text).toContain("519204");
  });

  it("should answer with the id the provider gave", async () => {
    const { mailer } = setup();

    const result = await mailer.sendTemplate("magic-code", {
      to: reader,
      fields: { code: "519204" },
    });

    expect(result).toEqual({ ok: true, id: "memory-1" });
  });
});

describe("what your code does when sending fails", () => {
  it("should hand back the kind, so a caller can branch on it", async () => {
    const { provider, mailer } = setup();

    // Queue the failure rather than hoping the provider produces one.
    provider.failNext({
      kind: "InvalidRecipient",
      message: "not deliverable",
      provider: "memory",
      email: reader.email,
    });

    const result = await mailer.sendTemplate("magic-code", {
      to: reader,
      fields: { code: "519204" },
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.kind).toBe("InvalidRecipient");

      // Narrowed by the kind, so this field only exists on this branch.
      if (result.error.kind === "InvalidRecipient") {
        expect(result.error.email).toBe(reader.email);
      }
    }
  });

  it("should retry a transient failure and answer with the send that worked", async () => {
    const { provider, mailer } = setup();

    provider.failNext(
      { kind: "RateLimited", message: "slow down", provider: "memory" },
      { kind: "ProviderDown", message: "bad gateway", provider: "memory", status: 502 },
    );

    const result = await mailer.sendTemplate("magic-code", {
      to: reader,
      fields: { code: "519204" },
    });

    expect(result).toMatchObject({ ok: true });
    expect(provider.sent).toHaveLength(1);
  });

  it("should send one message for a repeated idempotency key", async () => {
    const { provider, mailer } = setup();

    for (const attempt of [1, 2]) {
      await mailer.sendTemplate("magic-code", {
        to: reader,
        fields: { code: "519204" },
        idempotencyKey: `sign-in:${reader.email}`,
      });

      expect(provider.sent).toHaveLength(1);
      expect(attempt).toBeLessThan(3);
    }
  });
});
