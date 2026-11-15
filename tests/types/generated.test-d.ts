import { describe, expectTypeOf, it } from "vitest";
import { createMailer } from "~/mailer";
import { memory } from "~/providers/memory";
import { templates } from "../build/generated/templates";

/**
 * The point of generating the module: the letter files are the only place anything was
 * declared, and these are the errors a caller gets from them.
 */
const mailer = createMailer({
  provider: memory(),
  senders: {
    auth: "Kywi <auth@example.com>",
    notifications: "Kywi <notifications@example.com>",
  },
  from: "notifications",
  templates,
});

const ada = { email: "ada@example.com", name: "Ada" };

const booking = {
  activityName: "Kayak tour, Lake Thun",
  participants: 3,
  reference: "KYW-4182",
  tickets: [{ name: "Adult", quantity: "2" }],
};

describe("a generated registry", () => {
  it("should name only the letters that have files", async () => {
    // @ts-expect-error there is no magic-cdoe.hbs
    await mailer.sendTemplate("magic-cdoe", { to: ada, fields: { code: "1" } });
  });

  it("should require the field a placeholder in the body asked for", async () => {
    // @ts-expect-error 'code' comes from {{ code }} in magic-code.hbs
    await mailer.sendTemplate("magic-code", { to: ada, fields: {} });
  });

  it("should take the field as the type the body implies", async () => {
    expectTypeOf(templates()["magic-code"].body).parameter(0).toEqualTypeOf<{ code: string }>();
  });

  it("should take no fields for a letter with no placeholders", async () => {
    await mailer.sendTemplate("welcome", { to: ada });
  });

  it("should need no reader for a letter whose header names an inbox", async () => {
    await mailer.sendTemplate("feedback", { fields: { note: "slow", from: "h@e.com" } });
  });

  it("should still need a reader for a letter whose header names none", async () => {
    // @ts-expect-error magic-code.hbs has no inbox, so a caller says who reads it
    await mailer.sendTemplate("magic-code", { fields: { code: "1" } });
  });

  it("should honour a field type written in the header over the one inferred", async () => {
    // @ts-expect-error participants is declared as number under fields: in booking.hbs
    await mailer.sendTemplate("booking", { to: ada, fields: { ...booking, participants: "3" } });
  });

  it("should treat a field used only inside an if as optional", async () => {
    await mailer.sendTemplate("booking", { to: ada, fields: booking });
    await mailer.sendTemplate("booking", {
      to: ada,
      fields: { ...booking, voucherCode: "SPRING26" },
    });
  });

  it("should take the shape an each block implies for its rows", async () => {
    await mailer.sendTemplate("booking", {
      to: ada,
      // @ts-expect-error the each block reads name and quantity off every row
      fields: { ...booking, tickets: [{ name: "Adult" }] },
    });
  });
});
