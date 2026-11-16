import { describe, expect, it } from "vitest";
import type { MailMessage } from "~/message";
import { MOCK_RESEND_URL, mockResend, mockResendConsole } from "~/providers/mock-resend";

const message: MailMessage = {
  from: "Acme <auth@example.com>",
  to: { email: "ada@example.com", name: "Ada" },
  subject: "Your Acme login code",
  text: "519204",
};

type Call = { url: string; init: RequestInit };

function stub(response: Response) {
  const calls: Call[] = [];

  const fetch: typeof globalThis.fetch = (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });

    return Promise.resolve(response.clone());
  };

  return { calls, fetch };
}

function accepted(body: unknown = { id: "mock_1" }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function keyOf(call: Call | undefined): string | undefined {
  const headers = call?.init.headers;

  if (headers === undefined) return undefined;

  return new Headers(headers).get("Authorization") ?? undefined;
}

describe("mockResend", () => {
  it("should post to the port the image publishes by default", async () => {
    const { calls, fetch } = stub(accepted());

    await mockResend({ fetch, environment: "development" }).send(message, {});

    expect(calls[0]?.url).toBe(`${MOCK_RESEND_URL}/emails`);
  });

  it("should post to a url given in the config", async () => {
    const { calls, fetch } = stub(accepted());

    await mockResend({
      url: "http://email:9100",
      fetch,
      environment: "development",
    }).send(message, {});

    expect(calls[0]?.url).toBe("http://email:9100/emails");
  });

  it("should post to a url that was pasted with a trailing slash", async () => {
    const { calls, fetch } = stub(accepted());

    await mockResend({
      url: "http://localhost:9100/",
      fetch,
      environment: "development",
    }).send(message, {});

    expect(calls[0]?.url).toBe("http://localhost:9100/emails");
  });

  it("should authenticate with a key mock-resend accepts", async () => {
    const { calls, fetch } = stub(accepted());

    await mockResend({ fetch, environment: "development" }).send(message, {});

    // mock-resend refuses a request with no key and checks the `re_` prefix, so the
    // default has to be one it takes.
    expect(keyOf(calls[0])).toMatch(/^Bearer re_/);
  });

  it("should send to the inbox the api key names", async () => {
    const { calls, fetch } = stub(accepted());

    await mockResend({ apiKey: "re_checkout", fetch, environment: "development" }).send(
      message,
      {},
    );

    expect(keyOf(calls[0])).toBe("Bearer re_checkout");
  });

  it("should map an injected fault to the kind the live api would give", async () => {
    const { fetch } = stub(
      new Response(JSON.stringify({ name: "rate_limit_exceeded", message: "too many" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await mockResend({ fetch, environment: "development" }).send(message, {});

    expect(result.ok).toBe(false);

    if (!result.ok) expect(result.error.kind).toBe("RateLimited");
  });

  it("should answer with the id mock-resend gave", async () => {
    const { fetch } = stub(accepted({ id: "mock_42" }));

    const result = await mockResend({ fetch, environment: "development" }).send(message, {});

    expect(result).toEqual({ ok: true, id: "mock_42" });
  });

  it("should refuse to be constructed in production", () => {
    expect(() => mockResend({ environment: "production" })).toThrow(/NODE_ENV is production/);
  });

  it("should take resend's own options, because it is that provider", async () => {
    const { calls, fetch } = stub(accepted());

    await mockResend({ fetch, environment: "development" }).send(message, {
      tags: [{ name: "letter", value: "magic-code" }],
    });

    const body: unknown = JSON.parse(String(calls[0]?.init.body));

    expect(body).toMatchObject({ tags: [{ name: "letter", value: "magic-code" }] });
  });
});

describe("mockResendConsole", () => {
  it("should point at the console on the same listener", () => {
    expect(mockResendConsole()).toBe(`${MOCK_RESEND_URL}/_admin/console/`);
  });

  it("should point at the console of a url given to it", () => {
    expect(mockResendConsole("http://localhost:9999/")).toBe(
      "http://localhost:9999/_admin/console/",
    );
  });
});
