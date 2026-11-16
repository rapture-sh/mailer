import { assertBaseUrl } from "../guards";
import { type Attachment, formatAddress, type MailMessage } from "../message";
import type { Provider } from "../provider";
import type { MailError, MailResult } from "../result";

export const RESEND_BASE_URL = "https://api.resend.com";

/** 40MB per email after base64 encoding. https://resend.com/docs/api-reference/emails/send-email */
const MAX_BYTES = 40 * 1024 * 1024;

export type ResendCapability = "attachments" | "idempotency" | "schedule" | "replyTo" | "headers";

export type ResendTag = { name: string; value: string };

/** What Resend takes that no other provider does. */
export type ResendOptions = {
  /** Returned on Resend's webhooks. ASCII letters, digits, `_` and `-` only. */
  tags?: readonly ResendTag[];
  cc?: string | readonly string[];
  bcc?: string | readonly string[];
};

export type ResendConfig = {
  apiKey: string;
  /**
   * Where the API lives, passed straight through, so the same provider code can point at
   * mock-resend for local work. Refused in production: see `assertBaseUrl`.
   */
  baseUrl?: string;
  /** What this deployment is. Defaults to `NODE_ENV` where the runtime has one. */
  environment?: string;
  /** Replaceable, so a test drives the error mapping without a network. */
  fetch?: typeof globalThis.fetch;
};

export type ResendProvider = Provider<ResendCapability, ResendOptions>;

/**
 * Resend documents its error codes but not the shape of the body that carries them, so
 * every field is read defensively rather than through a declared type.
 */
function stringField(body: unknown, key: string): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) return undefined;

  const value: unknown = Reflect.get(body, key);

  return typeof value === "string" ? value : undefined;
}

function base64(bytes: Uint8Array): string {
  let binary = "";

  // One pass in chunks, because String.fromCharCode(...bytes) on a whole attachment
  // overflows the call stack.
  for (let at = 0; at < bytes.length; at += 8192) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
  }

  return btoa(binary);
}

function toResendAttachment(attachment: Attachment): Record<string, unknown> {
  return {
    filename: attachment.filename,
    // `in` rather than `instanceof Uint8Array`, which is false for bytes made in another
    // realm, so a worker's buffer would be read as the encoded shape and fail on `.base64`.
    content:
      "base64" in attachment.content ? attachment.content.base64 : base64(attachment.content),
    ...(attachment.contentType === undefined ? {} : { content_type: attachment.contentType }),
    ...(attachment.inline === undefined ? {} : { content_id: attachment.inline.cid }),
  };
}

function bodyFor(message: MailMessage, options: ResendOptions): Record<string, unknown> {
  return {
    from: message.from,
    to: formatAddress(message.to),
    subject: message.subject,
    ...(message.html === undefined ? {} : { html: message.html }),
    ...(message.text === undefined ? {} : { text: message.text }),
    ...(message.replyTo === undefined ? {} : { reply_to: message.replyTo }),
    ...(message.headers === undefined ? {} : { headers: message.headers }),
    ...(message.sendAt === undefined ? {} : { scheduled_at: message.sendAt.toISOString() }),
    ...(message.attachments === undefined
      ? {}
      : { attachments: message.attachments.map(toResendAttachment) }),
    ...(options.tags === undefined ? {} : { tags: options.tags }),
    ...(options.cc === undefined ? {} : { cc: options.cc }),
    ...(options.bcc === undefined ? {} : { bcc: options.bcc }),
  };
}

const PROVIDER = "resend";

const rateLimited = (message: string, retryAfterMs: number | undefined): MailError => ({
  kind: "RateLimited",
  message,
  provider: PROVIDER,
  ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
});

const authFailed = (message: string): MailError => ({
  kind: "AuthFailed",
  message,
  provider: PROVIDER,
});

const payloadTooLarge = (message: string, bytes: number | undefined): MailError => ({
  kind: "PayloadTooLarge",
  message,
  provider: PROVIDER,
  limitBytes: MAX_BYTES,
  ...(bytes === undefined ? {} : { bytes }),
});

const providerDown = (message: string, status: number | undefined): MailError => ({
  kind: "ProviderDown",
  message,
  provider: PROVIDER,
  ...(status === undefined ? {} : { status }),
});

const unmapped = (message: string, payload: unknown): MailError => ({
  kind: "Unknown",
  message,
  provider: PROVIDER,
  payload,
});

function retryAfterFrom(response: Response): number | undefined {
  const header = response.headers.get("retry-after");

  if (header === null) return undefined;

  const seconds = Number(header);

  // Resend does not document this header, so it may be absent or a date rather than a
  // number of seconds. Either way, core's own backoff curve takes over.
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

function describe(status: number, body: unknown): string {
  const parts = [`${status}`, stringField(body, "name"), stringField(body, "message")];

  return parts.filter((part) => part !== undefined).join(" ");
}

/**
 * Status first, code second.
 *
 * The status is what the mapping trusts, because the body that carries the code is not
 * documented, and `name` only refines it.
 *
 * Two kinds are deliberately unreachable here. Resend answers `validation_error` for a bad
 * address, a missing subject and an unverified sender domain alike, so promoting that to
 * `InvalidRecipient` would have callers drop addresses that are fine; and it reports a
 * suppression on a webhook rather than at send time, which is out of this package's scope.
 * Both arrive as `Unknown` with the payload kept.
 */
function mapFailure(response: Response, body: unknown): MailError {
  const message = describe(response.status, body);
  const code = stringField(body, "name");

  if (response.status === 429) return rateLimited(message, retryAfterFrom(response));

  // Every 401 and 403 needs a change to the key, the account or the sending domain. None
  // of them is retryable and none of them is about the message.
  if (response.status === 401 || response.status === 403) return authFailed(message);

  if (response.status === 413) return payloadTooLarge(message, undefined);

  if (response.status >= 500) return providerDown(message, response.status);

  // The first request with this key is still in flight, so the same call a moment later
  // gets its answer. The one case where a 409 is worth retrying.
  if (code === "concurrent_idempotent_requests") {
    return providerDown(message, response.status);
  }

  return unmapped(message, body);
}

export function resend(config: ResendConfig): ResendProvider {
  assertBaseUrl("resend", config.baseUrl, RESEND_BASE_URL, config.environment);

  const base =
    config.baseUrl === undefined || config.baseUrl === "" ? RESEND_BASE_URL : config.baseUrl;
  const call = config.fetch ?? globalThis.fetch;
  const encoder = new TextEncoder();

  return {
    name: "resend",
    capabilities: ["attachments", "idempotency", "schedule", "replyTo", "headers"],
    maxBytes: MAX_BYTES,

    async send(message, options): Promise<MailResult> {
      const payload = bodyFor(message, options);
      const json = JSON.stringify(payload);
      const bytes = encoder.encode(json).length;

      if (bytes > MAX_BYTES) {
        return {
          ok: false,
          error: payloadTooLarge(`${bytes} bytes is over Resend's limit`, bytes),
        };
      }

      let response: Response;

      try {
        response = await call(`${base}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            // Resend answers 403 to a request with no User-Agent.
            "User-Agent": "@rapture-sh/mailer",
            ...(message.idempotencyKey === undefined
              ? {}
              : { "Idempotency-Key": message.idempotencyKey }),
          },
          body: json,
        });
      } catch (cause) {
        const reason = cause instanceof Error ? cause.message : "the request failed";

        return { ok: false, error: providerDown(reason, undefined) };
      }

      let body: unknown;

      try {
        body = await response.json();
      } catch {
        body = undefined;
      }

      if (!response.ok) return { ok: false, error: mapFailure(response, body) };

      const id = stringField(body, "id");

      if (id === undefined) {
        return {
          ok: false,
          error: unmapped("Resend accepted the message without giving it an id", body),
        };
      }

      return { ok: true, id };
    },
  };
}
