import { describe, expect, it } from "vitest";
import type { MailErrorKind } from "~/result";
import { ada, clearFaults, failNext, inbox, plainMailerFor, reachable, stats } from "./mock-resend";

/**
 * The error mapping against the bodies and statuses a Resend compatible API actually
 * answers with.
 *
 * This is the tier that can catch a wrong mapping. The unit tests assert that a 429 we
 * wrote ourselves becomes `RateLimited`; these assert that what the server calls
 * `rate_limit_exceeded` does, which is the thing a caller's retry logic depends on.
 */
async function sendWith(fault: string, times = 1) {
  const key = inbox(fault);

  await failNext(key, fault, times);

  const result = await plainMailerFor(key).send({
    to: ada,
    subject: "Your Acme login code",
    text: "519204",
  });

  await clearFaults(key);

  return { key, result };
}

/**
 * Every error mock-resend will inject, with the kind it has to become. Two of them are
 * deliberately `Unknown`: Resend answers `validation_error` for a bad address, a missing
 * subject and an unverified sender domain alike, so promoting it would have callers drop
 * addresses that are fine.
 */
const MAPPINGS: readonly (readonly [string, MailErrorKind])[] = [
  ["rate_limit_exceeded", "RateLimited"],
  ["daily_quota_exceeded", "RateLimited"],
  ["missing_api_key", "AuthFailed"],
  ["application_error", "ProviderDown"],
  ["validation_error", "Unknown"],
  ["not_found", "Unknown"],
  ["invalid_attachment", "Unknown"],
  ["missing_required_field", "Unknown"],
];

describe.skipIf(!reachable)("the error mapping, over http", () => {
  for (const [fault, kind] of MAPPINGS) {
    it(`should answer ${kind} for ${fault}`, async () => {
      // More than there are attempts, so a transient kind reaches the caller rather than
      // being retried into a success.
      const { result } = await sendWith(fault, 5);

      expect(result.ok).toBe(false);

      if (result.ok) return;

      expect(result.error.kind).toBe(kind);
      expect(result.error.provider).toBe("resend");
    });
  }

  it("should keep the payload of an answer it could not map", async () => {
    const { result } = await sendWith("validation_error", 5);

    expect(result.ok).toBe(false);

    if (result.ok || result.error.kind !== "Unknown") return;

    // The original body, so a caller can see what the API said even where we had no kind
    // for it. The name is what mock-resend injected.
    expect(result.error.payload).toMatchObject({ name: "validation_error" });
  });

  it("should say which status a provider that is down answered with", async () => {
    const { result } = await sendWith("application_error", 5);

    expect(result.ok).toBe(false);

    if (result.ok || result.error.kind !== "ProviderDown") return;

    expect(result.error.status).toBe(500);
  });

  it("should not throw for a failure, so a caller branches on a result", async () => {
    const { result } = await sendWith("application_error", 5);

    expect(result).toMatchObject({ ok: false });
  });
});

describe.skipIf(!reachable)("backoff, over http", () => {
  it("should ride out a rate limit and answer with the send that worked", async () => {
    const key = inbox("retry-once");

    // One fault against three attempts: the first is refused, the second goes through.
    await failNext(key, "rate_limit_exceeded", 1);

    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Your Acme login code",
      text: "519204",
    });

    expect(result).toMatchObject({ ok: true });
    expect(await stats(key)).toMatchObject({ captured: 1, fault_rules: 0 });
  });

  it("should give up after its attempts and hand back the kind", async () => {
    const key = inbox("retry-out");

    await failNext(key, "rate_limit_exceeded", 5);

    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Your Acme login code",
      text: "519204",
    });

    await clearFaults(key);

    expect(result).toMatchObject({ ok: false });
    expect(await stats(key)).toMatchObject({ captured: 0 });
  });

  it("should not retry a failure that would fail again", async () => {
    const key = inbox("no-retry");

    // Three faults, one per attempt. A retried AuthFailed would spend all three; this
    // leaves two behind, which is how the test sees that it stopped after one.
    await failNext(key, "missing_api_key", 3);

    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Your Acme login code",
      text: "519204",
    });

    const after = await stats(key);

    await clearFaults(key);

    expect(result).toMatchObject({ ok: false });
    expect(after.fault_rules).toBeGreaterThan(0);
  });
});
