import { isTransient, type MailResult } from "./result";

export type Retry = {
  /** Total attempts, the first one included. 1 turns retrying off. */
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Replaceable, so a test drives backoff without waiting for it. */
  sleep: (ms: number) => Promise<void>;
};

export const defaultRetry: Retry = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
};

/** How long before attempt number `attempt` of this send. */
export function delayFor(attempt: number, retry: Retry, retryAfterMs?: number): number {
  // A provider that says how long to wait knows better than any curve we would pick.
  if (retryAfterMs !== undefined) return Math.min(retryAfterMs, retry.maxDelayMs);

  return Math.min(retry.baseDelayMs * 2 ** (attempt - 1), retry.maxDelayMs);
}

/**
 * The only place anything sleeps. It reads the error kind, never the provider, so a
 * permanent failure costs one attempt however many are configured.
 */
export async function withRetry(
  retry: Retry,
  attempt: () => Promise<MailResult>,
): Promise<MailResult> {
  let result = await attempt();

  for (let n = 1; n < retry.attempts; n++) {
    if (result.ok || !isTransient(result.error)) return result;

    const retryAfterMs =
      result.error.kind === "RateLimited" ? result.error.retryAfterMs : undefined;

    await retry.sleep(delayFor(n, retry, retryAfterMs));

    result = await attempt();
  }

  return result;
}
