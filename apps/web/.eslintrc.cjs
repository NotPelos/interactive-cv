// @ts-check
"use strict";

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    // No se usa project: true aquí para no requerir tsconfig por defecto en .astro
  },
  plugins: ["@typescript-eslint", "security"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:astro/recommended",
    "plugin:security/recommended-legacy",
  ],
  rules: {
    // Bloquear patrones inseguros críticos documentados en SECURITY.md
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    // TypeScript: evitar any sin justificación
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
  overrides: [
    // Configuración específica para ficheros .astro
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {},
    },
    // Ficheros de configuración del proyecto (CJS)
    {
      files: [".eslintrc.cjs", "*.config.cjs"],
      env: { node: true },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    // env.d.ts es generado por Astro y requiere triple-slash reference obligatorio
    {
      files: ["src/env.d.ts"],
      rules: {
        "@typescript-eslint/triple-slash-reference": "off",
      },
    },
  ],
  ignorePatterns: ["dist/", "node_modules/", ".astro/"],
};
