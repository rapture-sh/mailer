import { createMailer } from "~/mailer";
import { MOCK_RESEND_URL, mockResend } from "~/providers/mock-resend";
import type { Retry } from "~/retry";
import { templates } from "../build/generated/templates";

/**
 * The harness for the integration tier: a real mock-resend over real HTTP.
 *
 *   docker run --rm -p 9100:9100 rapturedotsh/mock-resend
 *   pnpm test:integration
 *
 * Nothing here stubs anything. These tests exist because the unit tier proves what this
 * package does with an answer it wrote itself, and this one proves what it does with the
 * answers a Resend compatible API actually gives.
 */
export const BASE = process.env.MOCK_RESEND_URL ?? MOCK_RESEND_URL;

/**
 * Whether there is a mock-resend to talk to, decided once at module load so the suites can
 * skip rather than fail where there is none: a developer without the container running
 * should still get a green `pnpm test`.
 */
export const reachable = await fetch(`${BASE}/_admin/console/`, {
  signal: AbortSignal.timeout(2000),
})
  .then((response) => response.ok)
  .catch(() => false);

/**
 * Skipping is right on a laptop and wrong in CI, where a container that failed to start
 * would otherwise give a green job that tested nothing. CI sets this.
 */
if (!reachable && process.env.MOCK_RESEND_REQUIRED === "1") {
  throw new Error(
    `MOCK_RESEND_REQUIRED is set and there is no mock-resend at ${BASE}. ` +
      "Start it with: docker run --rm -p 9100:9100 rapturedotsh/mock-resend",
  );
}

let count = 0;

/**
 * A token per run, because captured mail outlives the process: the server keeps it in its
 * volume, so a second run reusing a key would read the first run's messages back and count
 * them. This is what makes `captured: 1` mean what it says.
 */
const run = Math.random().toString(36).slice(2, 8);

/**
 * A fresh inbox per test.
 *
 * mock-resend keys everything by api key: the captured mail, the fault rules and the
 * delivery behaviour. A key of its own per test is what keeps one test's injected rate
 * limit out of the next test's send, and keeps the whole suite out of whatever inbox the
 * developer is using by hand.
 */
export function inbox(name: string): string {
  count += 1;

  return `re_it_${name.replace(/[^a-z0-9]+/gi, "_")}_${run}_${count}`;
}

async function admin(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${BASE}/_admin/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    throw new Error(`the mock-resend admin api answered ${response.status} for ${path}`);
  }

  return response.json().catch(() => undefined);
}

/**
 * Queues a Resend error for the next `times` sends under this key.
 *
 * mock-resend refuses a name Resend does not have, so what comes back is the body and the
 * status the live API answers with and the mapping under test is the real one.
 */
export const failNext = (apiKey: string, error: string, times = 1): Promise<unknown> =>
  admin("POST", "faults", { api_key: apiKey, error, target: "send", times });

export const clearFaults = (apiKey: string): Promise<unknown> =>
  admin("DELETE", `faults?api_key=${encodeURIComponent(apiKey)}`);

export type Stats = { captured: number; fault_rules: number };

export const stats = (apiKey: string): Promise<Stats> =>
  admin("GET", `stats?api_key=${encodeURIComponent(apiKey)}`) as Promise<Stats>;

/** One captured message, read back through the Resend compatible retrieve endpoint. */
export async function captured(apiKey: string, id: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE}/emails/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) throw new Error(`retrieving ${id} answered ${response.status}`);

  const body: unknown = await response.json();

  if (typeof body !== "object" || body === null) throw new Error(`${id} came back as nothing`);

  return { ...body };
}

export type CapturedAttachment = {
  filename: string | null;
  content_type: string | null;
  content_id: string | null;
  source: string;
  /** The decoded size, which is what proves the base64 round trip. */
  bytes: number;
};

/**
 * The same message with everything the server kept, which the Resend compatible retrieve
 * endpoint does not return: headers, tags and the attachments with their decoded sizes.
 */
export async function detail(
  apiKey: string,
  id: string,
): Promise<Record<string, unknown> & { attachments: readonly CapturedAttachment[] }> {
  const body = await admin("GET", `emails/${id}?api_key=${encodeURIComponent(apiKey)}`);

  if (typeof body !== "object" || body === null) throw new Error(`${id} came back as nothing`);

  return { attachments: [], ...body } as Record<string, unknown> & {
    attachments: readonly CapturedAttachment[];
  };
}

export const senders = {
  auth: "Acme <auth@example.com>",
  notifications: "Acme <notifications@example.com>",
};

/** The retry curve the suite uses: real backoff, no waiting. */
const quick: Partial<Retry> = { baseDelayMs: 0, sleep: () => Promise.resolve() };

export function mailerFor(apiKey: string) {
  return createMailer({
    provider: mockResend({ url: BASE, apiKey, environment: "test" }),
    senders,
    from: "notifications",
    retry: quick,
    templates,
  });
}

/** The same thing with no letters, for the raw send surface. */
export function plainMailerFor(apiKey: string) {
  return createMailer({
    provider: mockResend({ url: BASE, apiKey, environment: "test" }),
    senders,
    from: "notifications",
    retry: quick,
  });
}

export const ada = { email: "ada@example.com", name: "Ada" };
