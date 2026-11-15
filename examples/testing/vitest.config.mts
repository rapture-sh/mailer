import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * A config of its own, because an application's mail tests live beside the application
 * rather than in this package's own suite.
 *
 * The aliases are only here because this example runs against `src/` instead of an
 * installed package. In your own repo you would not need them.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@rapture-sh/mailer/memory": fileURLToPath(
        new URL("../../src/providers/memory.ts", import.meta.url),
      ),
      "@rapture-sh/mailer": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["examples/testing/**/*.test.ts"],
  },
});
