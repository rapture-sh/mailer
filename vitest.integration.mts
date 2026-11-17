import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The integration tier: the `resend` provider against a real mock-resend over HTTP.
 *
 *   docker run --rm -p 9100:9100 rapturedotsh/mock-resend
 *   pnpm test:integration
 *
 * A config of its own because it needs something running, which `pnpm test` must not. The
 * suites skip themselves when there is nothing listening, so this is also safe to run
 * blind. Tests run one file at a time: they share one server and read its state back.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@rapturedotsh/mailer/resend": fileURLToPath(
        new URL("./src/providers/resend.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer/mock-resend": fileURLToPath(
        new URL("./src/providers/mock-resend.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer/build": fileURLToPath(new URL("./src/build/index.ts", import.meta.url)),
      "@rapturedotsh/mailer/handlebars": fileURLToPath(
        new URL("./src/handlebars.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer/memory": fileURLToPath(
        new URL("./src/providers/memory.ts", import.meta.url),
      ),
      "@rapturedotsh/mailer": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    // A send and the retrieve that reads it back, over a container's HTTP.
    testTimeout: 15_000,
  },
});
