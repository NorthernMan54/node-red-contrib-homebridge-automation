/** @type {import('eslint').FlatConfig[]} */
import pluginJs from "@eslint/js";
import pluginVitest from "eslint-plugin-vitest";
import globals from "globals";


export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs", // This is necessary to parse imports/exports
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...pluginVitest.environments.env.globals, // Add Vitest globals
      },
    },
    // Add any other specific rules here
  },
  pluginJs.configs.recommended,
  {
    plugins: {
      vitest: pluginVitest,
    },
    rules: {
      ...pluginVitest.configs.recommended.rules,
      "no-unused-vars": "warn", // Change no-unused-vars to a warning
    },
  },
  {
    // Exclude test, tools, and lib directories from linting
    ignores: ["test/**/*", "tools/*js", "src/lib/*"], // Exclude these files from linting
  }
];
