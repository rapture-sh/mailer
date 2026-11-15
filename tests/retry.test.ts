import { describe, expect, it } from "vitest";
import type { MailError } from "~/result";
import { defaultRetry, delayFor, type Retry, withRetry } from "~/retry";

const rateLimited: MailError = {
  kind: "RateLimited",
  message: "too many requests",
  provider: "memory",
};

const suppressed: MailError = {
  kind: "Suppressed",
  message: "on the suppression list",
  provider: "memory",
  email: "ada@example.com",
};

function recorder(overrides: Partial<Retry> = {}) {
  const waits: number[] = [];

  const retry: Retry = {
    ...defaultRetry,
    sleep: (ms) => {
      waits.push(ms);

      return Promise.resolve();
    },
    ...overrides,
  };

  return { retry, waits };
}

describe("delayFor", () => {
  it("should double the base delay on each attempt", () => {
    const { retry } = recorder({ baseDelayMs: 100, maxDelayMs: 10_000 });

    expect([1, 2, 3].map((attempt) => delayFor(attempt, retry))).toEqual([100, 200, 400]);
  });

  it("should never wait longer than the maximum", () => {
    const { retry } = recorder({ baseDelayMs: 100, maxDelayMs: 250 });

    expect(delayFor(5, retry)).toBe(250);
  });

  it("should prefer what the provider asked for", () => {
    const { retry } = recorder({ baseDelayMs: 100, maxDelayMs: 10_000 });

    expect(delayFor(1, retry, 3_000)).toBe(3_000);
  });

  it("should cap what the provider asked for at the maximum", () => {
    const { retry } = recorder({ baseDelayMs: 100, maxDelayMs: 1_000 });

    expect(delayFor(1, retry, 60_000)).toBe(1_000);
  });
});

describe("withRetry", () => {
  it("should not retry a send that worked", async () => {
    const { retry, waits } = recorder();
    let attempts = 0;

    const result = await withRetry(retry, () => {
      attempts += 1;

      return Promise.resolve({ ok: true as const, id: "memory-1" });
    });

    expect([result.ok, attempts, waits]).toEqual([true, 1, []]);
  });

  it("should retry a transient failure until it works", async () => {
    const { retry, waits } = recorder({ baseDelayMs: 100 });
    let attempts = 0;

    const result = await withRetry(retry, () => {
      attempts += 1;

      return Promise.resolve(
        attempts < 3
          ? { ok: false as const, error: rateLimited }
          : { ok: true as const, id: "memory-1" },
      );
    });

    expect([result.ok, attempts, waits]).toEqual([true, 3, [100, 200]]);
  });

  it("should give up after the configured attempts", async () => {
    const { retry, waits } = recorder({ attempts: 2, baseDelayMs: 100 });
    let attempts = 0;

    const result = await withRetry(retry, () => {
      attempts += 1;

      return Promise.resolve({ ok: false as const, error: rateLimited });
    });

    expect([result.ok, attempts, waits]).toEqual([false, 2, [100]]);
  });

  it("should not retry a permanent failure", async () => {
    const { retry, waits } = recorder();
    let attempts = 0;

    const result = await withRetry(retry, () => {
      attempts += 1;

      return Promise.resolve({ ok: false as const, error: suppressed });
    });

    expect([result.ok, attempts, waits]).toEqual([false, 1, []]);
  });

  it("should wait as long as the provider asked", async () => {
    const { retry, waits } = recorder({ attempts: 2, baseDelayMs: 100 });

    await withRetry(retry, () =>
      Promise.resolve({
        ok: false as const,
        error: { ...rateLimited, retryAfterMs: 2_500 },
      }),
    );

    expect(waits).toEqual([2_500]);
  });

  it("should not retry at all when attempts is one", async () => {
    const { retry, waits } = recorder({ attempts: 1 });
    let attempts = 0;

    await withRetry(retry, () => {
      attempts += 1;

      return Promise.resolve({ ok: false as const, error: rateLimited });
    });

    expect([attempts, waits]).toEqual([1, []]);
  });
});
