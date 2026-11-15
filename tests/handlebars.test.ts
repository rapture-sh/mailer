import { describe, expect, it } from "vitest";
import type { CopyConfig } from "~/copy";
import { type HelperHost, registerCopyHelpers } from "~/handlebars";

const copy: CopyConfig = {
  default: "en-GB",
  catalogs: {
    "en-GB": { line: "Hi {name}, you paid {amount}.", plain: "Nothing to fill in." },
    "de-CH": { line: "Hallo {name}, du hast {amount} bezahlt.", plain: "Nichts." },
  },
  values: { supportLink: "<a>support</a>" },
};

type Helper = (...args: readonly unknown[]) => unknown;

/**
 * Stands in for handlebars, which the runtime never imports: the glue is handed a host
 * with these two things on it and nothing else.
 */
function host() {
  const helpers = new Map<string, Helper>();

  class SafeString {
    constructor(readonly value: string) {}
  }

  const target: HelperHost = {
    registerHelper: (name, helper) => {
      helpers.set(name, helper);
    },
    SafeString,
  };

  registerCopyHelpers(target, copy);

  const call = (name: string, ...args: readonly unknown[]): unknown => {
    const helper = helpers.get(name);

    if (helper === undefined) throw new Error(`no helper named ${name}`);

    return helper(...args);
  };

  const text = (name: string, ...args: readonly unknown[]): string => {
    const result = call(name, ...args);

    return result instanceof SafeString ? result.value : String(result);
  };

  return { names: [...helpers.keys()], call, text };
}

/** What handlebars passes as the last argument of a helper call. */
function options(hash: Record<string, unknown> = {}, locale?: string) {
  return { hash, data: { root: locale === undefined ? {} : { locale } } };
}

const at = new Date("2026-07-02T08:00:00.000Z");

describe("registerCopyHelpers", () => {
  it("should register every helper the body language has", () => {
    expect(host().names).toEqual(["t", "date", "time", "dateTime", "money", "list"]);
  });
});

describe("the t helper", () => {
  it("should read a key in the locale the message is being rendered in", () => {
    expect(host().text("t", "plain", options({}, "de-CH"))).toBe("Nichts.");
  });

  it("should fall back to the default locale when the message has none", () => {
    expect(host().text("t", "plain", options())).toBe("Nothing to fill in.");
  });

  it("should fill in the values it was handed", () => {
    expect(host().text("t", "line", options({ name: "Ada", amount: 12 }, "en-GB"))).toBe(
      "Hi Ada, you paid 12.",
    );
  });

  it("should ignore a value that is neither a string nor a number", () => {
    expect(host().text("t", "line", options({ name: { first: "Ada" }, amount: 1 }))).toBe(
      "Hi {name}, you paid 1.",
    );
  });

  it("should refuse a key that is not a string", () => {
    expect(() => host().call("t", 42, options())).toThrow(/t needs a copy key/);
  });
});

describe("the date helpers", () => {
  it("should format a Date in the zone it was given", () => {
    expect(host().text("date", at, options({ zone: "UTC", style: "long" }))).toBe("2 July 2026");
  });

  it("should format an epoch as well as a Date", () => {
    expect(host().text("date", at.getTime(), options({ zone: "UTC" }))).toBe("2 July 2026");
  });

  it("should format a written out timestamp too", () => {
    expect(host().text("date", "2026-07-02T08:00:00.000Z", options({ zone: "UTC" }))).toBe(
      "2 July 2026",
    );
  });

  it("should ignore a style it does not know", () => {
    expect(host().text("date", at, options({ zone: "UTC", style: "sideways" }))).toBe(
      "2 July 2026",
    );
  });

  it("should write the clock time in the zone, not the reader's", () => {
    expect(host().text("time", at, options({ zone: "Europe/Zurich" }))).toBe("10:00");
  });

  it("should write the day and the time as one phrase", () => {
    expect(host().text("dateTime", at, options({ zone: "UTC" }, "de-CH"))).toContain(
      "2. Juli 2026",
    );
  });

  it("should refuse something that is not a moment at all", () => {
    expect(() => host().call("date", { when: "soon" }, options())).toThrow(
      /needs a Date, an epoch or a date string/,
    );
  });
});

describe("the money helper", () => {
  it("should turn minor units into the locale's currency format", () => {
    expect(host().text("money", 12_500, "CHF", options()).replaceAll(" ", " ")).toBe("CHF 125.00");
  });

  it("should refuse an amount that is not a number", () => {
    expect(() => host().call("money", "125.00", "CHF", options())).toThrow(/minor units/);
  });

  it("should refuse a missing currency", () => {
    expect(() => host().call("money", 12_500, options())).toThrow(/needs a currency/);
  });
});

describe("the list helper", () => {
  it("should join the parts the way the locale joins them", () => {
    expect(host().text("list", ["one", "two"], options({}, "de-CH"))).toBe("one und two");
  });

  it("should turn whatever is in the list into strings", () => {
    expect(host().text("list", [1, 2], options())).toBe("1 and 2");
  });

  it("should answer nothing for something that is not a list", () => {
    expect(host().text("list", "one", options())).toBe("");
  });
});
