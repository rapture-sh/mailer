import { describe, expect, it } from "vitest";
import type { MailMessage } from "~/message";
import { memory } from "~/providers/memory";

function message(overrides: Partial<MailMessage> = {}): MailMessage {
  return {
    from: "Kywi <auth@kywi.ch>",
    to: { email: "ada@example.com" },
    subject: "Your Kywi login code",
    text: "519204",
    ...overrides,
  };
}

describe("memory", () => {
  it("should keep what it accepted, oldest first", async () => {
    const provider = memory();

    await provider.send(message({ subject: "one" }), {});
    await provider.send(message({ subject: "two" }), {});

    expect(provider.sent.map((sent) => sent.subject)).toEqual(["one", "two"]);
  });

  it("should give every accepted message an id", async () => {
    const provider = memory();

    const result = await provider.send(message(), {});

    expect(result).toEqual({ ok: true, id: "memory-1" });
  });

  it("should answer a repeated idempotency key with the first id", async () => {
    const provider = memory();

    const first = await provider.send(message({ idempotencyKey: "magic-1" }), {});
    const second = await provider.send(message({ idempotencyKey: "magic-1" }), {});

    expect([first, second]).toEqual([
      { ok: true, id: "memory-1" },
      { ok: true, id: "memory-1" },
    ]);
  });

  it("should not keep a second copy of an idempotent message", async () => {
    const provider = memory();

    await provider.send(message({ idempotencyKey: "magic-1" }), {});
    await provider.send(message({ idempotencyKey: "magic-1" }), {});

    expect(provider.sent).toHaveLength(1);
  });

  it("should answer queued failures in order, then accept again", async () => {
    const provider = memory();

    provider.failNext(
      { kind: "RateLimited", message: "slow down", provider: "memory" },
      { kind: "ProviderDown", message: "bad gateway", provider: "memory", status: 502 },
    );

    const kinds = [
      await provider.send(message(), {}),
      await provider.send(message(), {}),
      await provider.send(message(), {}),
    ].map((result) => (result.ok ? "ok" : result.error.kind));

    expect(kinds).toEqual(["RateLimited", "ProviderDown", "ok"]);
  });

  it("should forget everything on clear", async () => {
    const provider = memory();

    await provider.send(message({ idempotencyKey: "magic-1" }), {});
    provider.clear();
    const after = await provider.send(message({ idempotencyKey: "magic-1" }), {});

    expect([provider.sent.length, after]).toEqual([1, { ok: true, id: "memory-2" }]);
  });

  it("should declare the capabilities it has", () => {
    expect(memory().capabilities).toEqual(["attachments", "idempotency", "replyTo", "headers"]);
  });
});
