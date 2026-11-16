import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "../../src/build/index";

/**
 * Writes `generated/` from `fixtures/`, which is what the type tier typechecks and
 * `generated.test.ts` renders.
 *
 *   pnpm fixtures:build
 *   pnpm fixtures:check     # writes nothing and fails when the committed output is stale
 *
 * Nothing in CI calls this. `build.test.ts` rebuilds the fixtures into `generated/` and
 * asserts it had nothing to write, so a stale commit of that directory fails the suite the
 * way a snapshot does. This is the direct way to rewrite it.
 *
 * The letters are passed as a path relative to the repository root, because it ends up in
 * the generated file's header and an absolute one would differ per machine.
 */
const fixtures = "tests/build/fixtures";

const result = await build({
  letters: fixtures,
  out: "tests/build/generated/templates.ts",
  copy: {
    default: "en-GB",
    catalogs: join(fixtures, "locales"),
    values: { supportLink: '<a href="mailto:support@example.com">support@example.com</a>' },
  },
  check: process.argv.includes("--check"),
  cwd: fileURLToPath(new URL("../..", import.meta.url)),
});

if (result.stale && !result.written) {
  console.error(
    "tests/build/generated is out of date. Run pnpm fixtures:build and commit the result.",
  );

  process.exit(1);
}

console.log(
  `${result.letters.length} letters, ${result.partials.length} partial, ${result.locales.length} locales: ${
    result.written ? "written" : "already current"
  }`,
);
