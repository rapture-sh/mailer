import { build } from "@rapture-sh/mailer/build";

/**
 * The build script, which is yours rather than a command the package ships.
 *
 *   pnpm example:locales:build            writes generated/
 *   pnpm example:locales:build --check    fails if what is committed is not current
 *
 * Note where things are: the letters sit in `emails/`, the catalogs in `copy/`, and the
 * files are named `english.json` and `swiss-german.json` while the locales are `en-GB` and
 * `de-CH`. None of that is a convention the package knows about, which is the point. The
 * locale names are the keys of this map and nothing parses them.
 */
const checking = process.argv.includes("--check");

const result = await build({
  letters: "examples/with-locales/emails",
  out: "examples/with-locales/generated/templates.ts",
  senders: ["auth", "notifications"],

  copy: {
    default: "en-GB",
    catalogs: {
      "en-GB": "examples/with-locales/copy/english.json",
      "de-CH": "examples/with-locales/copy/swiss-german.json",
    },
    // Every key may use these without being passed them. They are ours, so they go in as
    // written and may carry markup; a caller's values are escaped.
    values: {
      supportLink: '<a href="mailto:support@example.com">support@example.com</a>',
      siteLink: '<a href="https://example.com">example.com</a>',
    },
  },

  check: checking,
});

if (checking && result.stale) {
  console.error(`${result.out} is out of date. Run \`pnpm example:locales:build\`.`);
  process.exit(1);
}

console.log(
  [
    `${result.written ? "wrote" : "already current:"} ${result.out}`,
    `  letters   ${result.letters.join(", ")}`,
    `  partials  ${result.partials.join(", ")}`,
    `  locales   ${result.locales.join(", ")}`,
    result.unusedKeys.length === 0
      ? "  copy      every key is asked for by a letter"
      : `  unused    ${result.unusedKeys.join(", ")}`,
  ].join("\n"),
);
