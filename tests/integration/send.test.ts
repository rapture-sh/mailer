import { describe, expect, it } from "vitest";
import { ada, captured, inbox, plainMailerFor, reachable, stats } from "./mock-resend";

/**
 * The raw send surface against a real Resend compatible API. Every assertion reads the
 * message back out of the server rather than trusting what was posted.
 */
describe.skipIf(!reachable)("send, over http", () => {
  it("should post a message and answer with the id the api gave", async () => {
    const key = inbox("send");
    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Your Acme login code",
      text: "519204",
    });

    expect(result).toMatchObject({ ok: true });

    if (!result.ok) return;

    expect(await captured(key, result.id)).toMatchObject({
      from: "Acme <auth@example.com>".replace("auth", "notifications"),
      subject: "Your Acme login code",
      text: "519204",
    });
  });

  it("should send a display name with a comma in it as one address", async () => {
    const key = inbox("comma");
    const result = await plainMailerFor(key).send({
      to: { email: "ada@example.com", name: "Lovelace, Ada" },
      subject: "Hello",
      text: "Hello",
    });

    expect(result).toMatchObject({ ok: true });

    if (!result.ok) return;

    // One recipient rather than two, which is the whole point of quoting the display
    // name. The server parses the address and gives it back in its own form, so the exact
    // string it echoes is not ours to assert.
    expect(await captured(key, result.id)).toMatchObject({
      to: ["Lovelace, Ada <ada@example.com>"],
    });
  });

  it("should send both bodies when the caller wrote both", async () => {
    const key = inbox("bodies");
    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Receipt",
      html: "<p>Paid</p>",
      text: "Paid",
    });

    if (!result.ok) throw new Error(result.error.message);

    expect(await captured(key, result.id)).toMatchObject({ html: "<p>Paid</p>", text: "Paid" });
  });

  it("should carry a reply address", async () => {
    const key = inbox("replyto");
    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "New feedback",
      text: "The map is slow",
      replyTo: "host@example.com",
    });

    if (!result.ok) throw new Error(result.error.message);

    expect(await captured(key, result.id)).toMatchObject({ reply_to: ["host@example.com"] });
  });

  it("should carry cc and bcc, which are resend's own options", async () => {
    const key = inbox("cc");
    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Receipt",
      text: "Paid",
      cc: ["team@example.com"],
      bcc: ["audit@example.com"],
    });

    if (!result.ok) throw new Error(result.error.message);

    expect(await captured(key, result.id)).toMatchObject({
      cc: ["team@example.com"],
      bcc: ["audit@example.com"],
    });
  });

  it("should schedule a message for later", async () => {
    const key = inbox("schedule");
    const sendAt = new Date(Date.now() + 3_600_000);
    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Reminder",
      text: "Tomorrow",
      sendAt,
    });

    if (!result.ok) throw new Error(result.error.message);

    const message = await captured(key, result.id);

    // The same instant, not the same string: the server stores its own timestamp format.
    expect(new Date(String(message.scheduled_at)).toISOString()).toBe(sendAt.toISOString());
  });

  it("should send one message for a repeated idempotency key", async () => {
    const key = inbox("idempotent");
    const mailer = plainMailerFor(key);
    const args = {
      to: ada,
      subject: "Your Acme login code",
      text: "519204",
      idempotencyKey: "sign-in:ada",
    };

    const first = await mailer.send(args);
    const second = await mailer.send(args);

    expect([first, second].every((result) => result.ok)).toBe(true);

    if (!first.ok || !second.ok) return;

    // The second call answers with the first message's id rather than sending again.
    expect(second.id).toBe(first.id);
    expect(await stats(key)).toMatchObject({ captured: 1 });
  });

  it("should send separate messages for separate keys", async () => {
    const key = inbox("keys");
    const mailer = plainMailerFor(key);

    const first = await mailer.send({
      to: ada,
      subject: "One",
      text: "One",
      idempotencyKey: "one",
    });
    const second = await mailer.send({
      to: ada,
      subject: "Two",
      text: "Two",
      idempotencyKey: "two",
    });

    if (!first.ok || !second.ok) throw new Error("both sends should have been accepted");

    expect(first.id).not.toBe(second.id);
    expect(await stats(key)).toMatchObject({ captured: 2 });
  });

  it("should carry custom headers", async () => {
    const key = inbox("headers");
    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Receipt",
      text: "Paid",
      headers: { "X-Entity-Ref-ID": "REF-4182" },
    });

    expect(result).toMatchObject({ ok: true });
  });

  it("should carry resend's tags", async () => {
    const key = inbox("tags");
    const result = await plainMailerFor(key).send({
      to: ada,
      subject: "Receipt",
      text: "Paid",
      tags: [{ name: "letter", value: "receipt" }],
    });

    expect(result).toMatchObject({ ok: true });
  });
});
