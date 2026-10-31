import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["features/releases/components/release-dashboard.tsx"],
      thresholds: {
        perFile: true,
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
});
