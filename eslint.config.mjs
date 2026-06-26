import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import-x";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  {
    plugins: {
      "import-x": importPlugin,
    },
  },

  // 1. Controllers (src/actions/** and src/app/api/**)
  {
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
              group: [
                "**/repository",
                "**/repository.ts",
                "**/repositories/**",
                "**/model",
                "**/model.ts",
                "**/models/**",
                "@/repositories/**",
                "@/models/**",
              ],
              message: "Controllers cannot import models or repositories directly. May only import from features root or services.",
            },
          ],
        },
      ],
    },
  },

  // 2. Services (src/features/**/service.ts, src/features/**/services/**, and src/services/**)
  {
    files: [
      "src/features/**/service.ts",
      "src/features/**/services/**/*.ts",
      "src/features/**/services/**/*.js",
      "src/services/**/*.ts",
      "src/services/**/*.js",
    ],
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
              message: "Services cannot import next/server.",
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
              group: [
                "**/model",
                "**/model.ts",
                "**/models/**",
                "**/app/api/**",
                "**/actions/**",
              ],
              message: "Services cannot import models directly or controllers.",
            },
          ],
        },
      ],
    },
  },

  // 3. Strict Architecture Enforcement: All files outside feature directories (external files)
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"],
    ignores: [
      "src/features/**/*",
      "src/shared/seedService.ts", // Seed service is a special seeding utility that needs to seed repositories
      "src/lib/mongodb.ts",
      "src/services/**/*",
      "src/repositories/**/*",
      "src/scripts/**/*",
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
              group: [
                "**/model",
                "**/model.ts",
                "**/models/**",
                "**/repository",
                "**/repository.ts",
                "**/repositories/**",
              ],
              message: "Only repositories are allowed to import models or repositories directly.",
            },
            {
              group: [
                "**/features/*/**",
                "@/features/*/**",
              ],
              message: "External code must only import from the feature root (e.g. @/features/menu) and not deep-import sub-files.",
            },
          ],
        },
      ],
    },
  },

  // 4. Component imports restriction (src/components/** and src/app/**/*.tsx, src/app/**/*.ts except api routes)
  {
    files: [
      "src/components/**/*.ts",
      "src/components/**/*.tsx",
      "src/app/**/*.tsx",
      "src/app/**/*.ts",
    ],
    ignores: [
      "src/app/api/**/*",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "mongoose",
              message: "Components cannot import mongoose directly.",
            },
          ],
          patterns: [
            {
              group: [
                "**/model",
                "**/model.ts",
                "**/models/**",
                "**/repository",
                "**/repository.ts",
                "**/repositories/**",
              ],
              message: "Components cannot import models or repositories directly.",
            },
          ],
        },
      ],
    },
  },

  // 5. Global overrides for pre-existing errors
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
]);

export default eslintConfig;
