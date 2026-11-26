import path from "path";
import { defineConfig } from "vitest/config";

const workers = process.env.QA_WORKERS ?? "8";
if (!/^[1-9]\d*$/.test(workers) || !Number.isSafeInteger(Number(workers))) {
  throw new Error("QA_WORKERS deve ser um inteiro positivo.");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    maxWorkers: Number(workers),
    minWorkers: 1,
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  },
});

