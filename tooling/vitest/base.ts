const vitestBase = {
  test: {
    environment: "jsdom" as const,
    globals: true,
    coverage: {
      provider: "v8" as const,
      reporter: ["text", "json", "lcov"] as const,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
};

export default vitestBase;
