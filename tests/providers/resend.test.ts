import { describe, expect, it } from "vitest";
import type { MailMessage } from "~/message";
import { RESEND_BASE_URL, resend } from "~/providers/resend";

const message: MailMessage = {
  from: "Kywi <auth@kywi.ch>",
  to: { email: "ada@example.com", name: "Ada" },
  subject: "Your Kywi login code",
  text: "519204",
};

type Call = { url: string; init: RequestInit };

function stub(response: Response | (() => never)) {
  const calls: Call[] = [];

  const fetch: typeof globalThis.fetch = (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });

    if (typeof response === "function") return response();

    return Promise.resolve(response.clone());
  };

  return { calls, fetch };
}

function accepted(body: unknown = { id: "re_1" }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function refused(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function headerOf(call: Call | undefined, name: string): string | undefined {
  const headers = call?.init.headers;

  if (headers === undefined) return undefined;

  return new Headers(headers).get(name) ?? undefined;
}

function sentBody(call: Call | undefined): Record<string, unknown> {
  const body = call?.init.body;

  if (typeof body !== "string") throw new Error("the provider posted no json body");

  const parsed: unknown = JSON.parse(body);

  if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");

  return { ...parsed };
}

describe("resend", () => {
  it("should post to the live api by default", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(calls[0]?.url).toBe(`${RESEND_BASE_URL}/emails`);
  });

  it("should post to the base url it was given", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", baseUrl: "http://localhost:3999", fetch }).send(message, {});

    expect(calls[0]?.url).toBe("http://localhost:3999/emails");
  });

  it("should authenticate with the api key as a bearer token", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(headerOf(calls[0], "authorization")).toBe("Bearer re_test");
  });

  it("should send a user agent, which resend refuses a request without", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(headerOf(calls[0], "user-agent")).toBe("@rapture-sh/mailer");
  });

  it("should send an idempotency key as resend's own header", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", fetch }).send({ ...message, idempotencyKey: "magic-1" }, {});

    expect(headerOf(calls[0], "idempotency-key")).toBe("magic-1");
  });

  it("should return the id resend gave", async () => {
    const { fetch } = stub(accepted({ id: "re_abc" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toEqual({ ok: true, id: "re_abc" });
  });

  it("should answer Unknown when resend accepts without an id", async () => {
    const { fetch } = stub(accepted({}));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "Unknown" } });
  });
});

describe("resend, the request body", () => {
  it("should use resend's own field names", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", fetch }).send(
      {
        ...message,
        replyTo: "host@example.com",
        headers: { "X-Kywi-Letter": "magic-code" },
        sendAt: new Date("2026-07-02T08:00:00.000Z"),
      },
      { tags: [{ name: "letter", value: "magic-code" }] },
    );

    expect(sentBody(calls[0])).toEqual({
      from: "Kywi <auth@kywi.ch>",
      to: '"Ada" <ada@example.com>',
      subject: "Your Kywi login code",
      text: "519204",
      reply_to: "host@example.com",
      headers: { "X-Kywi-Letter": "magic-code" },
      scheduled_at: "2026-07-02T08:00:00.000Z",
      tags: [{ name: "letter", value: "magic-code" }],
    });
  });

  it("should base64 an attachment given as bytes", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", fetch }).send(
      {
        ...message,
        attachments: [
          {
            filename: "ticket.txt",
            content: new TextEncoder().encode("Kywi"),
            contentType: "text/plain",
          },
        ],
      },
      {},
    );

    expect(sentBody(calls[0]).attachments).toEqual([
      { filename: "ticket.txt", content: "S3l3aQ==", content_type: "text/plain" },
    ]);
  });

  it("should pass an inline attachment's content id through", async () => {
    const { calls, fetch } = stub(accepted());

    await resend({ apiKey: "re_test", fetch }).send(
      {
        ...message,
        attachments: [{ filename: "logo.png", content: "iVBOR", inline: { cid: "logo" } }],
      },
      {},
    );

    expect(sentBody(calls[0]).attachments).toEqual([
      { filename: "logo.png", content: "iVBOR", content_id: "logo" },
    ]);
  });
});

describe("resend, the error mapping", () => {
  it("should map a missing api key to AuthFailed", async () => {
    const { fetch } = stub(refused(401, { name: "missing_api_key", message: "Missing" }));

    const result = await resend({ apiKey: "", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "AuthFailed" } });
  });

  it("should map a suspended key to AuthFailed", async () => {
    const { fetch } = stub(refused(403, { name: "suspended_api_key" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "AuthFailed" } });
  });

  it("should map a rate limit to RateLimited", async () => {
    const { fetch } = stub(refused(429, { name: "rate_limit_exceeded" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "RateLimited" } });
  });

  it("should map a daily quota to RateLimited as well", async () => {
    const { fetch } = stub(refused(429, { name: "daily_quota_exceeded" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "RateLimited" } });
  });

  it("should read retry-after into retryAfterMs when resend sends one", async () => {
    const { fetch } = stub(refused(429, { name: "rate_limit_exceeded" }, { "Retry-After": "3" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { retryAfterMs: 3000 } });
  });

  it("should leave retryAfterMs off when resend sends no such header", async () => {
    const { fetch } = stub(refused(429, { name: "rate_limit_exceeded" }));
    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result.ok ? {} : result.error).not.toHaveProperty("retryAfterMs");
  });

  it("should map a server error to ProviderDown", async () => {
    const { fetch } = stub(refused(500, { name: "application_error" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({
      ok: false,
      error: { kind: "ProviderDown", status: 500 },
    });
  });

  it("should map an unavailable api to ProviderDown", async () => {
    const { fetch } = stub(refused(503, { name: "service_unavailable" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "ProviderDown" } });
  });

  it("should map a transport failure to ProviderDown", async () => {
    const { fetch } = stub(() => {
      throw new TypeError("fetch failed");
    });

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({
      ok: false,
      error: { kind: "ProviderDown", message: "fetch failed" },
    });
  });

  it("should map a 413 to PayloadTooLarge", async () => {
    const { fetch } = stub(refused(413, {}));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({
      ok: false,
      error: { kind: "PayloadTooLarge", limitBytes: 41_943_040 },
    });
  });

  it("should retry a concurrent idempotent request, which is the one retryable 409", async () => {
    const { fetch } = stub(refused(409, { name: "concurrent_idempotent_requests" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "ProviderDown" } });
  });

  it("should not retry a reused idempotency key", async () => {
    const { fetch } = stub(refused(409, { name: "invalid_idempotent_request" }));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "Unknown" } });
  });

  it("should map a validation error to Unknown and keep the payload", async () => {
    const body = { name: "validation_error", message: "An error was found" };
    const { fetch } = stub(refused(422, body));

    const result = await resend({ apiKey: "re_test", fetch }).send(message, {});

    expect(result).toMatchObject({ ok: false, error: { kind: "Unknown", payload: body } });
  });

  it("should say what went wrong, including resend's own code", async () => {
    const { fetch } = stub(refused(401, { name: "missing_api_key", message: "Missing" }));

    const result = await resend({ apiKey: "", fetch }).send(message, {});

    expect(result.ok ? "" : result.error.message).toBe("401 missing_api_key Missing");
  });

  it("should refuse a message over resend's size limit without posting it", async () => {
    const { calls, fetch } = stub(accepted());

    const result = await resend({ apiKey: "re_test", fetch }).send(
      { ...message, text: "x".repeat(41 * 1024 * 1024) },
      {},
    );

    expect([result, calls.length]).toMatchObject([
      { ok: false, error: { kind: "PayloadTooLarge" } },
      0,
    ]);
  });
});

describe("resend, the base url guard", () => {
  it("should refuse a mock base url in production", () => {
    expect(() =>
      resend({
        apiKey: "re_test",
        baseUrl: "http://localhost:3999",
        environment: "production",
      }),
    ).toThrow(/NODE_ENV is production/);
  });

  it("should allow the live base url in production", () => {
    expect(() =>
      resend({ apiKey: "re_test", baseUrl: RESEND_BASE_URL, environment: "production" }),
    ).not.toThrow();
  });

  it("should allow a mock base url outside production", () => {
    expect(() =>
      resend({
        apiKey: "re_test",
        baseUrl: "http://localhost:3999",
        environment: "development",
      }),
    ).not.toThrow();
  });
});
