/** One locale's words: a flat map of key to sentence. */
export type Catalog = Readonly<Record<string, string>>;

/**
 * The catalogs, by whatever you call your locales.
 *
 * The names are yours and nothing here parses them: `de`, `de-CH`, `de-Test-CH` and
 * `pirate` are all equally fine. They reach `Intl` for formatting, and a name it cannot
 * read falls back to the default locale rather than failing.
 */
export type CopyConfig<TLocale extends string = string> = {
  readonly default: NoInfer<TLocale>;
  readonly catalogs: { readonly [K in TLocale]: Catalog };
  /**
   * Values every key may use without being passed them, for the links and addresses in
   * every letter's closing. They are yours, so they are inserted as they are, which is
   * what lets them carry markup. A caller's values are escaped.
   */
  readonly values?: Readonly<Record<string, string>>;
};

export type LocaleOf<TCopy> = TCopy extends { catalogs: infer TCatalogs }
  ? keyof TCatalogs & string
  : never;

export type CopyValues = Readonly<Record<string, string | number>>;

const ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * The copy is yours, so a sentence may carry markup. The values filled into it come from
 * rows and requests, so they are escaped.
 */
export function escapeValue(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

/** The `{name}` placeholders in a copy string, in the order they appear. */
export function placeholdersIn(message: string): readonly string[] {
  return [...message.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/**
 * A key in the reader's locale, with its placeholders filled in.
 *
 * A key missing from the reader's locale falls back to the default one, and a key missing
 * from that throws, because it is a mistake in the letters rather than anything a reader
 * did. The build step is what makes it unreachable.
 */
export function translate(
  copy: CopyConfig,
  locale: string,
  key: string,
  values: CopyValues = {},
): string {
  const message = copy.catalogs[locale]?.[key] ?? copy.catalogs[copy.default]?.[key];

  if (message === undefined) throw new Error(`there is no copy for '${key}'`);

  return message.replace(PLACEHOLDER, (whole, name: string) => {
    const value = values[name];

    if (value !== undefined) return escapeValue(String(value));

    // Ours rather than a caller's, so it goes in as written, markup and all.
    return copy.values?.[name] ?? whole;
  });
}

export type DateOptions = {
  /** The zone the moment belongs to, which is the place's and not the reader's. */
  zone?: string;
  style?: "short" | "medium" | "long" | "full";
};

export type Formatters = {
  /** The day, in the reader's language. */
  date(value: Date | number, options?: DateOptions): string;
  /** The clock time, in the given zone. */
  time(value: Date | number, options?: DateOptions): string;
  /** The day and the time as one phrase, joined the way the language joins them. */
  dateTime(value: Date | number, options?: DateOptions): string;
  /** Minor units in, the reader's currency format out. */
  money(minorUnits: number, currency: string): string;
  /** The parts as one phrase, so no catalog needs a word for "and". */
  list(parts: readonly string[]): string;
};

/**
 * Tries the reader's locale, then the default one, then whatever the runtime prefers. A
 * locale name is a key in your catalogs rather than a language tag, so it may be something
 * `Intl` cannot read, and a letter should not fail to send over the name of a locale.
 */
function usable<TFormatter>(
  locales: readonly string[],
  make: (locale: string | undefined) => TFormatter,
): TFormatter {
  for (const locale of locales) {
    try {
      return make(locale);
    } catch {
      // The next one.
    }
  }

  return make(undefined);
}

export function formattersFor(locale: string, fallback: string): Formatters {
  const locales = locale === fallback ? [locale] : [locale, fallback];

  const dateFormat = (options: DateOptions, time: boolean, day: boolean): Intl.DateTimeFormat =>
    usable(
      locales,
      (tag) =>
        new Intl.DateTimeFormat(tag, {
          ...(day ? { dateStyle: options.style ?? "long" } : {}),
          ...(time ? { timeStyle: "short" as const, hourCycle: "h23" as const } : {}),
          ...(options.zone === undefined ? {} : { timeZone: options.zone }),
        }),
    );

  return {
    date: (value, options = {}) => dateFormat(options, false, true).format(value),
    time: (value, options = {}) => dateFormat(options, true, false).format(value),
    dateTime: (value, options = {}) => dateFormat(options, true, true).format(value),

    money: (minorUnits, currency) => {
      const format = usable(
        locales,
        (tag) => new Intl.NumberFormat(tag, { style: "currency", currency }),
      );
      // How many minor units go into one unit is the currency's own business: two for
      // CHF, none for JPY. Intl knows, so the exponent is read off it rather than assumed.
      const digits = format.resolvedOptions().maximumFractionDigits ?? 2;

      return format.format(minorUnits / 10 ** digits);
    },

    list: (parts) =>
      usable(
        locales,
        (tag) => new Intl.ListFormat(tag, { style: "long", type: "conjunction" }),
      ).format(parts),
  };
}
