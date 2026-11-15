import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  target: "node22",
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
});
