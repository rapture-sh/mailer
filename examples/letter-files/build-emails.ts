import { build } from "@rapturedotsh/mailer/build";

/**
 * The build script. In your own repo this is `scripts/build-emails.mjs`, run by node, and
 * it is yours rather than a command this package owns.
 *
 *   pnpm example:files:build
 *   pnpm example:files:build --check     fails if the committed output is not current
 */
const checking = process.argv.includes("--check");

const result = await build({
  letters: "examples/letter-files/emails",
  out: "examples/letter-files/generated/templates.ts",
  // The senders a letter's `from:` may name. The build checks it here with a file and a
  // line, and the generated types check it again against the mailer's own senders.
  senders: ["auth", "notifications"],
  check: checking,
});

if (checking && result.stale) {
  console.error(`${result.out} is out of date. Run \`pnpm example:files:build\`.`);
  process.exit(1);
}

console.log(
  [
    `${result.written ? "wrote" : "already current:"} ${result.out}`,
    `  letters   ${result.letters.join(", ")}`,
    `  partials  ${result.partials.join(", ")}`,
  ].join("\n"),
);
