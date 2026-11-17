import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The package's own name as well as `~`, because a generated templates module imports
    // `@rapturedotsh/mailer` the way a consumer's would. Longest first: these are prefix
    // matches.
    alias: {
      "@rapturedotsh/mailer/resend": fileURLToPath(
        new URL("./src/providers/resend.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer/build": fileURLToPath(new URL("./src/build/index.ts", import.meta.url)),
      "@rapturedotsh/mailer/handlebars": fileURLToPath(
        new URL("./src/handlebars.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer/mock-resend": fileURLToPath(
        new URL("./src/providers/mock-resend.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer/memory": fileURLToPath(
        new URL("./src/providers/memory.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // The examples and the integration tier have configs of their own, so this suite is
    // the package's own: everything that needs nothing running.
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/integration/**"],
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
        statements: 96,
        branches: 90,
        functions: 98,
        lines: 97,
      },
    },
  },
});
