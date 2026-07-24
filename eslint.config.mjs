import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "off"
    }
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
    rules: {
      "react/no-unescaped-entities": "off"
    }
  }
];
