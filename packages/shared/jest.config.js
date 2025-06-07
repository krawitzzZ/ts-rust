/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.(t|j)sx?$": "@swc/jest" },
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 80,
      functions: 90,
      lines: 85,
    },
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/sandbox.dev.ts",
    "!src/**/*.spec.ts",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
  ],
  coverageReporters: ["text", "lcov"],
  coverageDirectory: "coverage",
  clearMocks: true,
};
