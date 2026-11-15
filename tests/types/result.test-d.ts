import { describe, expectTypeOf, it } from "vitest";
import { isTransient, type MailError, type MailResult } from "~/result";

const rateLimited: MailError = {
  kind: "RateLimited",
  message: "too many requests",
  provider: "memory",
  retryAfterMs: 1_000,
};

describe("MailResult", () => {
  it("should expose an id only after narrowing to the ok branch", () => {
    const result = {} as MailResult;

    // @ts-expect-error id is not on the union, only on the ok branch
    result.id;

    if (result.ok) {
      expectTypeOf(result.id).toEqualTypeOf<string>();
    }
  });

  it("should expose an error only after narrowing to the failed branch", () => {
    const result = {} as MailResult;

    if (!result.ok) {
      expectTypeOf(result.error).toEqualTypeOf<MailError>();
    }
  });
});

describe("MailError", () => {
  it("should carry retryAfterMs on the rate limited kind only", () => {
    if (rateLimited.kind === "RateLimited") {
      expectTypeOf(rateLimited.retryAfterMs).toEqualTypeOf<number | undefined>();
    }

    const authFailed: MailError = {
      kind: "AuthFailed",
      message: "api key rejected",
      provider: "memory",
      // @ts-expect-error retryAfterMs belongs to the rate limited kind
      retryAfterMs: 1_000,
    };

    expectTypeOf(authFailed).toEqualTypeOf<MailError>();
  });

  it("should reject a kind that is not in the union", () => {
    const unmapped: MailError = {
      // @ts-expect-error 'Bounced' is not a kind, mapping it is a provider's job
      kind: "Bounced",
      message: "the recipient bounced",
      provider: "memory",
    };

    expectTypeOf(unmapped).toEqualTypeOf<MailError>();
  });

  it("should be exhaustive, so a new kind breaks every switch over it", () => {
    const describeError = (error: MailError): string => {
      switch (error.kind) {
        case "RateLimited":
          return "wait";
        case "ProviderDown":
          return "retry";
        case "InvalidRecipient":
          return "fix the address";
        case "Suppressed":
          return "stop sending";
        case "AuthFailed":
          return "fix the key";
        case "PayloadTooLarge":
          return "send less";
        case "Unknown":
          return "look at the payload";
        default: {
          const unreachable: never = error;
          return unreachable;
        }
      }
    };

    expectTypeOf(describeError).parameter(0).toEqualTypeOf<MailError>();
  });
});

describe("isTransient", () => {
  it("should narrow to the kinds core retries", () => {
    const error = {} as MailError;

    if (isTransient(error)) {
      expectTypeOf(error.kind).toEqualTypeOf<"RateLimited" | "ProviderDown">();
    }
  });
});
