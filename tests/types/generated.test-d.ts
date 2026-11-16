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
    auth: "Acme <auth@example.com>",
    notifications: "Acme <notifications@example.com>",
  },
  from: "notifications",
  templates,
});

const ada = { email: "ada@example.com", name: "Ada" };

const booking = {
  activityName: "Kayak tour, Lake Thun",
  participants: 3,
  startsAt: new Date("2026-07-02T08:00:00.000Z"),
  timezone: "Europe/Zurich",
  tickets: ["2 Adult", "1 Child"],
  totalMinor: 12_500,
  currency: "CHF",
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
    expectTypeOf(templates().letters["magic-code"].body)
      .parameter(0)
      .toEqualTypeOf<{ code: string }>();
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

  it("should require a field the subject's copy key names, however the body asks for it", async () => {
    // reminder.hbs has it inside an #if, which is what makes a field optional everywhere
    // else. A subject renders on every send, so this one is needed whatever the body did.
    // @ts-expect-error reminder.subject names {activityName} and nothing passed one
    await mailer.sendTemplate("reminder", { to: ada, fields: {} });
  });

  it("should still read that field as the type the body implied", () => {
    expectTypeOf(templates().letters.reminder.body)
      .parameter(0)
      .toEqualTypeOf<{ activityName: string }>();
  });

  it("should read a field's type off the helper the body passes it to", async () => {
    await mailer.sendTemplate("booking", {
      to: ada,
      // @ts-expect-error money takes minor units, so totalMinor is a number
      fields: { ...booking, totalMinor: "125.00" },
    });
  });

  it("should take a moment as a Date or an epoch", async () => {
    await mailer.sendTemplate("booking", {
      to: ada,
      fields: { ...booking, startsAt: 1_782_000_000_000 },
    });

    await mailer.sendTemplate("booking", {
      to: ada,
      // @ts-expect-error date takes a moment, not a written out timestamp
      fields: { ...booking, startsAt: "2026-07-02" },
    });
  });

  it("should take a list as strings", async () => {
    await mailer.sendTemplate("booking", {
      to: ada,
      // @ts-expect-error list joins strings, so a row object is not one
      fields: { ...booking, tickets: [{ name: "Adult" }] },
    });
  });
});

describe("the locales the catalogs declare", () => {
  it("should take a locale a catalog is named after", async () => {
    await mailer.sendTemplate("welcome", { to: { ...ada, locale: "de-CH" } });
    await mailer.sendTemplate("welcome", { to: { ...ada, locale: "pirate-Speak" } });
  });

  it("should refuse a locale with no catalog, however reasonable it looks", async () => {
    // @ts-expect-error there is no de-DE.json
    await mailer.sendTemplate("welcome", { to: { ...ada, locale: "de-DE" } });
  });

  it("should have no locale on a message rendered elsewhere", async () => {
    // @ts-expect-error a raw send is already in a language
    await mailer.send({ to: { ...ada, locale: "de-CH" }, subject: "Hi", text: "Hi" });
  });
});
