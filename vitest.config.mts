import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The package's own name as well as `~`, because a generated templates module imports
    // `@rapture-sh/mailer` the way a consumer's would. Longest first: these are prefix
    // matches.
    alias: {
      "@rapture-sh/mailer/resend": fileURLToPath(
        new URL("./src/providers/resend.ts", import.meta.url),
      ),
      "@rapture-sh/mailer/build": fileURLToPath(new URL("./src/build/index.ts", import.meta.url)),
      "@rapture-sh/mailer/handlebars": fileURLToPath(
        new URL("./src/handlebars.ts", import.meta.url),
      ),
      "@rapture-sh/mailer/memory": fileURLToPath(
        new URL("./src/providers/memory.ts", import.meta.url),
      ),
      "@rapture-sh/mailer": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    typecheck: {
      include: ["tests/types/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Nothing but re-exports, so it is covered by everything and measures nothing.
      exclude: ["src/index.ts"],
      // A floor rather than a target: set just under what the suite reaches, so a change
      // that drops real coverage fails while a line of error text does not.
      thresholds: {
        statements: 95,
        branches: 86,
        functions: 97,
        lines: 96,
      },
    },
  },
});
