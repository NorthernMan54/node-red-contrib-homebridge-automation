import globals from "globals";
import pluginJs from "@eslint/js";
import pluginJest from "eslint-plugin-jest";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs", // Change to "module" for ES6
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest, // Add Jest globals
      },
    },
  },
  pluginJs.configs.recommended,
  {
    plugins: {
      jest: pluginJest,
    },
    rules: {
      ...pluginJest.configs.recommended.rules,
      "no-unused-vars": "warn", // Change no-unused-vars to a warning
    },
  },
];