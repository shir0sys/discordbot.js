// @ts-check
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "test/fixtures/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // The codebase deliberately models Discord gateway/REST payloads as
      // loosely-typed objects in a few dispatch hotspots — not worth fighting.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-console": "off",
      // Deliberate pattern for typed EventEmitters: `class Foo extends EventEmitter {}` +
      // `export interface Foo { on<K>(...): this }` merges in typed on/emit overloads.
      // The merge only ever adds method signatures, never conflicting properties.
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
    },
  },
  {
    // opusscript only ships an `export =` CJS module, so `import X = require(...)`
    // (TypeScript's dedicated syntax for that, not a plain CommonJS require()) is
    // the correct way to import it — the rule can't tell the two apart.
    files: ["src/voice/OpusEncoder.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["test/**/*.js", "example.js", "examples/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  eslintConfigPrettier,
);
