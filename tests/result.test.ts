import { describe, expect, it } from "vitest";
import { isTransient, type MailError, type MailErrorKind } from "~/result";

/**
 * Keyed by kind, so adding a kind to the union fails the typecheck here until someone
 * decides whether it is worth retrying.
 */
const examples: Record<MailErrorKind, MailError> = {
  RateLimited: { kind: "RateLimited", message: "too many requests", provider: "memory" },
  ProviderDown: {
    kind: "ProviderDown",
    message: "bad gateway",
    provider: "memory",
    status: 502,
  },
  InvalidRecipient: {
    kind: "InvalidRecipient",
    message: "not a deliverable address",
    provider: "memory",
    email: "ada@invalid",
  },
  Suppressed: {
    kind: "Suppressed",
    message: "on the suppression list",
    provider: "memory",
    email: "ada@example.com",
  },
  AuthFailed: { kind: "AuthFailed", message: "api key rejected", provider: "memory" },
  PayloadTooLarge: {
    kind: "PayloadTooLarge",
    message: "over the size limit",
    provider: "memory",
    limitBytes: 40 * 1024 * 1024,
  },
  Unknown: {
    kind: "Unknown",
    message: "unmapped response",
    provider: "memory",
    payload: { status: 418 },
  },
};

describe("isTransient", () => {
  it("should treat rate limiting as transient", () => {
    expect(isTransient(examples.RateLimited)).toBe(true);
  });

  it("should treat a provider outage as transient", () => {
    expect(isTransient(examples.ProviderDown)).toBe(true);
  });

  it("should treat every other kind as permanent", () => {
    const permanent = Object.values(examples).filter(
      (error) => error.kind !== "RateLimited" && error.kind !== "ProviderDown",
    );

    expect(permanent.filter(isTransient)).toEqual([]);
  });
});
