/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", ["shared", "std", "docs", "ci", "tests"]],
    "scope-case": [2, "always", "lowercase"],
    "subject-case": [2, "always", "sentence-case"],
    "subject-max-length": [2, "always", 100],
    "type-case": [2, "always", "lower-case"],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "doc",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "release",
        "style",
        "test",
        "tests",
      ],
    ],
  },
};
