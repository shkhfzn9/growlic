import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import-x";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Enforces layered architecture (controller -> service -> repository). See ARCHITECTURE.md if present, or ask before removing.
  {
    plugins: {
      "import-x": importPlugin,
    },
  },
  {
    // Controllers (app/api and src/actions)
    files: [
      "src/app/api/**/*.ts",
      "src/app/api/**/*.js",
      "src/actions/**/*.ts",
      "src/actions/**/*.js",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "mongoose",
              message: "Controllers cannot import mongoose directly.",
            },
          ],
          patterns: [
            {
              group: ["**/repositories/**", "@/repositories/**"],
              message: "Controllers cannot import repositories directly. May only import from services.",
            },
            {
              group: ["**/models/**", "@/models/**"],
              message: "Controllers cannot import models directly. May only import from services.",
            },
          ],
        },
      ],
    },
  },
  {
    // Services
    files: ["src/services/**/*.ts", "src/services/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "mongoose",
              message: "Services cannot import mongoose directly.",
            },
            {
              name: "next/server",
              message: "Services cannot import next/server or Next.js route-specific types.",
            },
            {
              name: "next/headers",
              message: "Services cannot import next/headers.",
            },
            {
              name: "next/cache",
              message: "Services cannot import next/cache.",
            },
          ],
          patterns: [
            {
              group: ["**/app/api/**", "@/app/api/**", "**/actions/**", "@/actions/**"],
              message: "Services cannot import controllers (api/actions).",
            },
            {
              group: ["**/models/**", "@/models/**"],
              message: "Services cannot import models directly. May import from repositories.",
            },
          ],
        },
      ],
    },
  },
  {
    // All other files except repositories and models cannot import mongoose or models directly
    files: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"],
    ignores: [
      "src/repositories/**/*.ts",
      "src/repositories/**/*.js",
      "src/models/**/*.ts",
      "src/models/**/*.js",
      "src/features/**/model.ts",
      "src/features/**/repository.ts",
      "src/features/**/repositories/**/*.ts",
      "src/lib/mongodb.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "mongoose",
              message: "Only repositories are allowed to import mongoose directly.",
            },
          ],
          patterns: [
            {
              group: ["**/models/**", "@/models/**"],
              message: "Only repositories are allowed to import models directly.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
