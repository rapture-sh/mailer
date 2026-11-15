import { type CopyConfig, type CopyValues, formattersFor, translate } from "./copy";

/**
 * The shape handlebars hands a helper.
 *
 * Declared here rather than imported, so the runtime keeps no dependency on handlebars.
 * `data.root` is the object a template was rendered with, which is where the locale is.
 */
type HelperOptions = {
  hash?: Readonly<Record<string, unknown>>;
  data?: { root?: { locale?: unknown } };
};

type Helper = (...args: readonly unknown[]) => unknown;

/** What handlebars needs to be told, so this module never imports it. */
export type HelperHost = {
  registerHelper(name: string, helper: Helper): void;
  SafeString: new (value: string) => unknown;
};

function optionsOf(args: readonly unknown[]): HelperOptions {
  const last = args[args.length - 1];

  return typeof last === "object" && last !== null ? last : {};
}

function localeOf(options: HelperOptions, fallback: string): string {
  const locale = options.data?.root?.locale;

  return typeof locale === "string" && locale !== "" ? locale : fallback;
}

function valuesOf(options: HelperOptions): CopyValues {
  const values: Record<string, string | number> = {};

  for (const [name, value] of Object.entries(options.hash ?? {})) {
    if (typeof value === "string" || typeof value === "number") values[name] = value;
  }

  return values;
}

function asMoment(value: unknown): Date | number {
  if (value instanceof Date) return value;
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value);

  throw new Error("a date needs a Date, an epoch or a date string");
}

function asStrings(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];

  return value.map((part) => String(part));
}

function zoneOf(options: HelperOptions): { zone?: string } {
  const zone = options.hash?.zone;

  return typeof zone === "string" ? { zone } : {};
}

function styleOf(options: HelperOptions): { style?: "short" | "medium" | "long" | "full" } {
  const style = options.hash?.style;

  if (style === "short" || style === "medium" || style === "long" || style === "full") {
    return { style };
  }

  return {};
}

/**
 * The body language's helpers, bound to the copy rather than to a locale: the locale comes
 * from the message being rendered, so one registration serves every reader.
 *
 * `t` returns a SafeString, because the copy is yours and may carry markup. The values
 * filled into it are escaped on the way in by `translate`.
 */
export function registerCopyHelpers(host: HelperHost, copy: CopyConfig): void {
  const formatters = (options: HelperOptions) => {
    const locale = localeOf(options, copy.default);

    return formattersFor(locale, copy.default);
  };

  host.registerHelper("t", (...args) => {
    const options = optionsOf(args);
    const key = args[0];

    if (typeof key !== "string") throw new Error("t needs a copy key");

    return new host.SafeString(
      translate(copy, localeOf(options, copy.default), key, valuesOf(options)),
    );
  });

  host.registerHelper("date", (...args) =>
    formatters(optionsOf(args)).date(asMoment(args[0]), {
      ...zoneOf(optionsOf(args)),
      ...styleOf(optionsOf(args)),
    }),
  );

  host.registerHelper("time", (...args) =>
    formatters(optionsOf(args)).time(asMoment(args[0]), zoneOf(optionsOf(args))),
  );

  host.registerHelper("dateTime", (...args) =>
    formatters(optionsOf(args)).dateTime(asMoment(args[0]), zoneOf(optionsOf(args))),
  );

  host.registerHelper("money", (...args) => {
    const minorUnits = args[0];
    const currency = args[1];

    if (typeof minorUnits !== "number") throw new Error("money needs an amount in minor units");
    if (typeof currency !== "string") throw new Error("money needs a currency");

    return formatters(optionsOf(args)).money(minorUnits, currency);
  });

  host.registerHelper("list", (...args) => formatters(optionsOf(args)).list(asStrings(args[0])));
}
