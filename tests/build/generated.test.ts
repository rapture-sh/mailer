import { describe, expect, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import { templates } from "./generated/templates";

/**
 * The generated module, used exactly as a caller would: handed to `createMailer` and sent
 * through. The fixtures under `fixtures/` produced it, `tsc` checks it, and these tests
 * render it, so the whole path from a letter file to a posted message is covered.
 */
function setup() {
  const provider = memory();

  const mailer = createMailer({
    provider,
    senders: {
      auth: "Kywi <auth@example.com>",
      notifications: "Kywi <notifications@example.com>",
    },
    from: "notifications",
    templates,
  });

  return { provider, mailer };
}

const ada = { email: "ada@example.com", name: "Ada" };

const booking = {
  activityName: "Kayak tour, Lake Thun",
  participants: 3,
  reference: "KYW-4182",
  tickets: [{ name: "Adult", quantity: "2" }],
};

describe("a generated letter", () => {
  it("should build its subject from the placeholder in its header", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.subject).toBe("Your code is 519204");
  });

  it("should send from the sender its header names", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    expect(provider.sent[0]?.from).toBe("Kywi <auth@example.com>");
  });

  it("should render the body, the fields and the reader through the partial", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("magic-code", { to: ada, fields: { code: "519204" } });

    const html = provider.sent[0]?.html ?? "";

    expect(html).toContain("<h1>Sign in</h1>");
    expect(html).toContain("Hi Ada,");
    expect(html).toContain("<b>519204</b>");
  });

  it("should fall back to the default sender when the header names none", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("welcome", { to: ada });

    expect(provider.sent[0]?.from).toBe("Kywi <notifications@example.com>");
  });

  it("should address a letter with an inbox to itself", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", from: "host@example.com" },
    });

    expect(provider.sent[0]?.to).toEqual({ email: "feedback@example.com" });
  });

  it("should read reply-to out of the field its header names", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("feedback", {
      fields: { note: "The map is slow", from: "host@example.com" },
    });

    expect(provider.sent[0]?.replyTo).toBe("host@example.com");
  });

  it("should render each row of a repeated field", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", {
      to: ada,
      fields: {
        ...booking,
        tickets: [
          { name: "Adult", quantity: "2" },
          { name: "Child", quantity: "1" },
        ],
      },
    });

    const html = provider.sent[0]?.html ?? "";

    expect(html).toContain("<li>2 Adult</li>");
    expect(html).toContain("<li>1 Child</li>");
  });

  it("should leave out a conditional block when its field is absent", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", { to: ada, fields: booking });

    expect(provider.sent[0]?.html).not.toContain("Voucher");
  });

  it("should include a conditional block when its field is there", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", {
      to: ada,
      fields: { ...booking, voucherCode: "SPRING26" },
    });

    expect(provider.sent[0]?.html).toContain("Voucher SPRING26 applied.");
  });

  it("should escape a field, because a letter is html", async () => {
    const { provider, mailer } = setup();

    await mailer.sendTemplate("booking", {
      to: ada,
      fields: { ...booking, activityName: "Kayak <script>alert(1)</script>" },
    });

    const html = provider.sent[0]?.html ?? "";

    expect(html).toContain("Kayak &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
