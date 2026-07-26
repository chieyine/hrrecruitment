import nextConfig from "eslint-config-next";

/**
 * Rule policy
 * -----------
 * `react-hooks/rules-of-hooks` is a CORRECTNESS rule and stays an error. It was
 * previously switched off wholesale, which hid 95 violations: nine page
 * components were declared `async` while calling hooks, which React does not
 * support in client components.
 *
 * The React Compiler advisory rules (`set-state-in-effect`, `purity`,
 * `immutability`) are downgraded to warnings rather than disabled, so they stay
 * visible in local runs and reviews without failing the pipeline on
 * pre-existing patterns.
 */
const reactCompilerAdvisories = {
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/immutability": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/static-components": "warn",
};

export default [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-e2e/**",
      "test-results/**",
      "playwright-report/**",
      "prisma/postgresql/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      ...reactCompilerAdvisories,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/no-unescaped-entities": "off",
      "react/no-find-dom-node": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Server-side utilities and scripts are not React and must not be graded
    // against the React rule set.
    files: ["src/lib/**/*.ts", "src/app/api/**/*.ts", "scripts/**/*.{ts,mjs}", "prisma/**/*.ts", "tests/**/*.ts"],
    rules: Object.fromEntries(Object.keys(reactCompilerAdvisories).map((rule) => [rule, "off"])),
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
    rules: {
      ...Object.fromEntries(Object.keys(reactCompilerAdvisories).map((rule) => [rule, "off"])),
      "react/no-unescaped-entities": "off",
      "react/no-find-dom-node": "off",
    },
  },
];
