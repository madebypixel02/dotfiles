/**
 * Commitlint configuration enforcing Conventional Commits specification.
 *
 * Rules follow the Angular commit message convention. All rules are set to
 * error level (2) unless noted. The allowed type list is the canonical set
 * for this repository; do not extend it without updating CONTRIBUTING.md.
 *
 * The no-ai-coauthorship plugin rejects any commit whose body or footer
 * contains a Co-authored-by trailer attributing authorship to an AI system.
 * Commits must appear as written entirely by the human committer.
 *
 * Reference: https://commitlint.js.org/reference/rules.html
 */

const noAiCoauthorship = {
  rules: {
    "no-ai-coauthorship": [
      2,
      "always",
    ],
  },
  plugins: [
    {
      rules: {
        "no-ai-coauthorship": ({ raw }) => {
          const AI_COAUTHOR_PATTERN =
            /^Co-authored-by:.*(?:claude|gpt|copilot|gemini|openai|anthropic|chatgpt|cursor|opencode|ai|bot)/im;
          const violated = AI_COAUTHOR_PATTERN.test(raw);
          return [
            !violated,
            "Co-authored-by trailers attributing authorship to AI systems are not permitted. Commits must appear as written entirely by the human committer.",
          ];
        },
      },
    },
  ],
};

export default {
  extends: ["@commitlint/config-conventional"],
  plugins: noAiCoauthorship.plugins,
  rules: {
    ...noAiCoauthorship.rules,
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "scope-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "subject-case": [
      2,
      "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"],
    ],
    "header-max-length": [2, "always", 72],
    "body-leading-blank": [1, "always"],
    "body-max-line-length": [2, "always", 100],
    "footer-leading-blank": [1, "always"],
  },
};
