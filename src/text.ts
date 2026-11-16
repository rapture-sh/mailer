/**
 * A plain text body derived from a rendered html one.
 *
 * This is not a general html to text converter and does not try to be. It handles the
 * markup an email body is actually made of, in one pass over the string, and drops
 * anything else rather than guessing: a letter must not fail to send over its own markup.
 *
 * It runs on the rendered html, not on the template, so the text a reader gets carries the
 * same field values the html does and cannot drift from it.
 */

/** Elements whose content is not body text at all, so both tags and content go. */
const DROPPED = /<(script|style|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

const COMMENTS = /<!--[\s\S]*?-->/g;

const ANCHOR = /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))[^>]*>([\s\S]*?)<\/a\s*>/gi;

const BREAK = /<br\b[^>]*\/?>/gi;

/** A close tag that ends a block, so the text gets a blank line where the layout had one. */
const BLOCK_END =
  /<\/(p|div|h[1-6]|table|tr|ul|ol|blockquote|section|header|footer|article|td|th)\s*>/gi;

const LIST_ITEM = /<li\b[^>]*>/gi;

const RULE = /<hr\b[^>]*\/?>/gi;

const TAG = /<[^>]*>/g;

/** The named entities an email body actually carries. Anything else is left as written. */
const NAMED: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
  middot: "·",
  laquo: "«",
  raquo: "»",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body.startsWith("#")) {
      const digits = body.slice(1);
      const code =
        digits.startsWith("x") || digits.startsWith("X")
          ? Number.parseInt(digits.slice(1), 16)
          : Number.parseInt(digits, 10);

      // A code point outside Unicode would throw, and an unreadable entity is not worth
      // failing a send over.
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;

      return String.fromCodePoint(code);
    }

    return NAMED[body.toLowerCase()] ?? whole;
  });
}

function stripTags(html: string): string {
  return html.replace(TAG, "");
}

/**
 * `text (url)`, which is the only way a reader of the text part can follow a link.
 *
 * A link whose text is already the url, or an empty one, keeps just the url, so a plain
 * link does not come out twice.
 */
function unwrapAnchors(html: string): string {
  return html.replace(ANCHOR, (_whole, _quoted, double, single, unquoted, inner: string) => {
    const href = String(double ?? single ?? unquoted ?? "").trim();
    const label = decodeEntities(stripTags(inner)).replace(/\s+/g, " ").trim();
    // A mail link reads as the address itself, so it is not worth printing twice.
    const address = href.replace(/^mailto:/i, "");

    if (href === "") return label;
    if (label === "") return address;
    if (label === href || label === address) return label;

    return `${label} (${href})`;
  });
}

function tidy(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The plain text alternative for a rendered html body.
 *
 * Returns an empty string for markup that carried no words, which the caller treats as no
 * text part rather than an empty one.
 */
export function textFromHtml(html: string): string {
  const withoutDropped = html.replace(DROPPED, " ").replace(COMMENTS, " ");

  const marked = unwrapAnchors(withoutDropped)
    .replace(BREAK, "\n")
    .replace(RULE, "\n\n")
    .replace(LIST_ITEM, "\n- ")
    // Nothing: the next item's open tag, or the list's close tag, is the line break.
    .replace(/<\/li\s*>/gi, "")
    .replace(BLOCK_END, "\n\n");

  return tidy(decodeEntities(stripTags(marked)));
}
