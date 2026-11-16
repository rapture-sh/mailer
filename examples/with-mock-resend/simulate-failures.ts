import { MOCK_RESEND_API_KEY, MOCK_RESEND_URL, mockResend } from "@rapture-sh/mailer/mock-resend";
import { mailer, reader } from "./mailer";

/**
 * The failure paths, over real HTTP, without a dead address or a rate limit of your own.
 *
 *   docker compose -f examples/with-mock-resend/docker-compose.yml up -d
 *   pnpm example:mock:faults
 *
 * mock-resend injects a fault per api key and refuses an error name Resend does not have,
 * so what comes back is the shape the live api answers with and the mapping under test is
 * the one production uses.
 */
const base = process.env.MOCK_RESEND_URL ?? MOCK_RESEND_URL;

async function admin(method: string, path: string, body?: unknown): Promise<void> {
  const response = await fetch(`${base}/_admin/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    throw new Error(
      `the mock-resend admin api answered ${response.status}. Is it running at ${base}?`,
    );
  }
}

const failNext = (times: number) =>
  admin("POST", "faults", {
    api_key: MOCK_RESEND_API_KEY,
    error: "rate_limit_exceeded",
    target: "send",
    times,
  });

/**
 * A fault rule outlives the process, so a run that queues more failures than it spends
 * would rate limit whatever sends next. Clear them at both ends and the script is
 * repeatable.
 */
const clearFaults = () =>
  admin("DELETE", `faults?api_key=${encodeURIComponent(MOCK_RESEND_API_KEY)}`);

await clearFaults();

const send = () => mailer.sendTemplate("magic-code", { to: reader, fields: { code: "519204" } });

// One rate limit, which core's backoff rides out: a transient kind is retried, so the
// caller sees the send that worked and never learns there was a first attempt.
await failNext(1);

const retried = await send();

console.log(
  retried.ok
    ? `one rate limit: retried, accepted as ${retried.id}`
    : `one rate limit: ${retried.error.kind}, which should not happen`,
);

// More faults than there are attempts, so backoff runs out and the kind reaches the caller.
await failNext(5);

const refused = await send();

if (refused.ok) {
  console.error("five rate limits: accepted, which should not happen");
  process.exitCode = 1;
} else {
  console.log(`five rate limits: ${refused.error.kind}`);

  // The kind is the contract, and this field only exists on this branch of the union.
  if (refused.error.kind === "RateLimited") {
    console.log(`retry after ${refused.error.retryAfterMs ?? "a backoff of our own"}`);
  }
}

await clearFaults();

// The provider refuses to exist in production at all, which is what keeps this file out of
// a deploy.
try {
  mockResend({ environment: "production" });
} catch (cause) {
  console.log(`\nin production: ${cause instanceof Error ? cause.message : "refused"}`);
}
