import { defineConfig } from "tsdown";

/**
 * One build, four entries, and the directory structure under `src` is kept, so
 * `src/build/index.ts` lands at `dist/build/index.js` beside the runtime rather than in a
 * second output with its own extensions.
 *
 * Nothing is bundled in: the runtime has no dependencies, and the build entry's handlebars,
 * yaml and node builtins stay external, since it runs in Node and they are its peers.
 */
export default defineConfig({
  entry: [
    "src/index.ts",
    "src/handlebars.ts",
    "src/providers/resend.ts",
    "src/providers/mock-resend.ts",
    "src/providers/memory.ts",
    "src/build/index.ts",
  ],
  format: "esm",
  platform: "neutral",
  target: "node22",
  external: [/^node:/, "handlebars", "yaml"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
});
