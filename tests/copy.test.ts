import { describe, expect, it } from "vitest";
import { type CopyConfig, escapeValue, formattersFor, placeholdersIn, translate } from "~/copy";

const copy: CopyConfig = {
  default: "en-GB",
  catalogs: {
    "en-GB": {
      greeting: "Hi {name},",
      body: "Your code is <b>{code}</b>.",
      "only-here": "Nothing translated this one.",
    },
    "de-CH": {
      greeting: "Hallo {name},",
      body: "Dein Code ist <b>{code}</b>.",
    },
    "pirate-Speak": {
      greeting: "Ahoy {name},",
      body: "Yer code be <b>{code}</b>.",
    },
  },
  values: { supportLink: '<a href="mailto:help@example.com">help</a>' },
};

describe("placeholdersIn", () => {
  it("should find every placeholder in the order it appears", () => {
    expect(placeholdersIn("Hi {name}, your code is {code}")).toEqual(["name", "code"]);
  });

  it("should find none in a sentence that has none", () => {
    expect(placeholdersIn("Welcome to Acme")).toEqual([]);
  });
});

describe("escapeValue", () => {
  it("should escape what would otherwise be markup", () => {
    expect(escapeValue('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

describe("translate", () => {
  it("should read a key in the reader's locale", () => {
    expect(translate(copy, "de-CH", "greeting", { name: "Ada" })).toBe("Hallo Ada,");
  });

  it("should read a locale called whatever its catalog is called", () => {
    expect(translate(copy, "pirate-Speak", "greeting", { name: "Ada" })).toBe("Ahoy Ada,");
  });

  it("should fall back to the default locale for a key a translation lacks", () => {
    expect(translate(copy, "de-CH", "only-here")).toBe("Nothing translated this one.");
  });

  it("should fall back to the default locale for a locale it has never heard of", () => {
    expect(translate(copy, "fr-FR", "greeting", { name: "Ada" })).toBe("Hi Ada,");
  });

  it("should leave the copy's own markup alone", () => {
    expect(translate(copy, "en-GB", "body", { code: "519204" })).toBe(
      "Your code is <b>519204</b>.",
    );
  });

  it("should escape a value, because a value is not ours", () => {
    expect(translate(copy, "en-GB", "greeting", { name: "<b>Ada</b>" })).toBe(
      "Hi &lt;b&gt;Ada&lt;/b&gt;,",
    );
  });

  it("should leave a placeholder nobody gave a value for", () => {
    expect(translate(copy, "en-GB", "greeting")).toBe("Hi {name},");
  });

  it("should fill in a value every key may use, as written", () => {
    const withLink: CopyConfig = {
      ...copy,
      catalogs: { "en-GB": { closing: "Write to {supportLink}." } },
    };

    expect(translate(withLink, "en-GB", "closing")).toBe(
      'Write to <a href="mailto:help@example.com">help</a>.',
    );
  });

  it("should let a caller's value win over the one every key may use", () => {
    const withLink: CopyConfig = {
      ...copy,
      catalogs: { "en-GB": { closing: "Write to {supportLink}." } },
    };

    expect(translate(withLink, "en-GB", "closing", { supportLink: "us" })).toBe("Write to us.");
  });

  it("should throw for a key no catalog has, which the build makes unreachable", () => {
    expect(() => translate(copy, "en-GB", "missing.key")).toThrow(/no copy for/);
  });
});

describe("formattersFor", () => {
  const at = new Date("2026-07-02T08:00:00.000Z");

  it("should write the day in the locale's own order", () => {
    expect(formattersFor("en-GB", "en-GB").date(at, { zone: "UTC" })).toBe("2 July 2026");
    expect(formattersFor("de-CH", "en-GB").date(at, { zone: "UTC" })).toBe("2. Juli 2026");
  });

  it("should write the time in the zone it was given, not the reader's", () => {
    expect(formattersFor("en-GB", "en-GB").time(at, { zone: "Europe/Zurich" })).toBe("10:00");
    expect(formattersFor("en-GB", "en-GB").time(at, { zone: "UTC" })).toBe("08:00");
  });

  it("should turn minor units into money", () => {
    const money = formattersFor("en-GB", "en-GB").money(12_500, "CHF");

    expect(money.replaceAll(" ", " ")).toBe("CHF 125.00");
  });

  it("should know a currency with no minor units at all", () => {
    const money = formattersFor("en-GB", "en-GB").money(12_500, "JPY");

    // 12,500 minor units of a currency with none of them is 12,500 yen, not 125.
    expect(money.replaceAll(" ", " ")).toBe("JP¥12,500");
  });

  it("should join a list with the locale's own word", () => {
    expect(formattersFor("en-GB", "en-GB").list(["2 Adult", "1 Child"])).toBe(
      "2 Adult and 1 Child",
    );
    expect(formattersFor("de-CH", "en-GB").list(["2 Adult", "1 Child"])).toBe(
      "2 Adult und 1 Child",
    );
  });

  it("should fall back to the default locale when a name is not a language tag", () => {
    // A locale name is a key in your catalogs, so it may be anything at all, and a letter
    // should not fail to send over the name of one.
    expect(formattersFor("not a tag", "de-CH").date(at, { zone: "UTC" })).toBe("2. Juli 2026");
  });
});
