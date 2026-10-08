import { build } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";

const frontend = fileURLToPath(new URL("../../", import.meta.url));
const output = process.argv[2];
if (!output) throw new Error("An isolated test output directory is required.");
await build({
  root: frontend, configFile: false, envDir: false, plugins: [react()],
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api/v1"), "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: output, emptyOutDir: false,
    lib: { entry: fileURLToPath(new URL("support-harness.jsx", import.meta.url)), name: "SupportHarness", formats: ["iife"], fileName: () => "support-harness.js" },
  },
});
await writeFile(`${output}/index.html`, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Isolated support component test</title></head><body><div id="root"></div><script src="/__tests/support-assets/support-harness.js"></script></body></html>');
