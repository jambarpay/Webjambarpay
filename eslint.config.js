// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
  {
    files: ["src/app/features/**/*.ts"],
    ignores: ["**/*.spec.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@angular/common/http",
              message: "Les features passent par un Repository; HttpClient reste dans core/http.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/features/**/*component.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@angular/common/http",
              message: "Les features passent par un Repository; HttpClient reste dans core/http.",
            },
          ],
          patterns: [
            {
              group: ["**/data-access/**"],
              message: "Un composant depend d'une Facade ou d'un port, jamais d'un adapter data-access.",
            },
          ],
        },
      ],
    },
  }
);
