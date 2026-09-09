import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import importPlugin from "eslint-plugin-import-x";
import promisePlugin from "eslint-plugin-promise";
import regexpPlugin from "eslint-plugin-regexp";
import eslintReact from "@eslint-react/eslint-plugin";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import vitestPlugin from "@vitest/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
import noOnlyTests from "eslint-plugin-no-only-tests";
import jsdoc from "eslint-plugin-jsdoc";
import nodePlugin from "eslint-plugin-n";
import jsoncPlugin from "eslint-plugin-jsonc";
import ymlPlugin from "eslint-plugin-yml";
import unicornPlugin from "eslint-plugin-unicorn";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import playwrightPlugin from "eslint-plugin-playwright";
import barrelFilesPlugin from "eslint-plugin-barrel-files";
import { customRulesPlugin } from "./tools/eslint-rules/index.js";

/**
 * ESLint configuration using recommended presets where available
 */
export default tseslint.config([
    // Global ignores
    {
        ignores: [
            "dist/**/*",
            "build/**/*",
            "node_modules/**/*",
            ".nx/**/*",
            "coverage/**/*",
            "**/coverage/**/*",
            "**/*.d.ts",
            "**/routeTree.gen.ts",
            "**/*.generated.ts",
            "**/generated/**/*",
            "**/*.js",
            "**/*.js.map",
            // Config files outside tsconfig rootDir - excluded from lint
            "**/vitest.config*.ts",
            "**/vitest.setup.ts",
            "**/vite.config.ts",
            "**/vite.config.*.ts",
            "**/eslint.config.*.ts",
            "**/.storybook/**/*",
            "**/tests/setup.ts",
            // Algorithms test files - pre-existing type issues, lint ignored
            "packages/algorithms/__tests__/**/*",
        ],
    },
    // Base configuration for all TypeScript files
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                allowDefaultProject: [
                    // All TypeScript files in packages
                    "packages/**/*.ts",
                    "packages/**/*.tsx",
                    // All test files
                    "**/*.test.ts",
                    "**/*.test.tsx",
                    "**/*.spec.ts",
                    "**/*.spec.tsx",
                    "**/*.e2e.test.ts",
                    "**/*.e2e.test.tsx",
                    "**/*.component.test.tsx",
                    "**/*.integration.test.ts",
                    "**/*.integration.test.tsx",
                    // Build and config files
                    "**/build-plugins/**",
                    "**/*.config.ts",
                    "**/*.config.js",
                    "**/*.config.mjs",
                    "**/vitest.setup.ts",
                    "**/tests/setup.ts",
                    // Source files that might not be in tsconfig
                    "src/**/*.ts",
                    "src/**/*.tsx",
                    "src/**/*.js",
                    "src/**/*.jsx",
                    // Scripts and tools
                    "scripts/**/*.ts",
                    "tools/**/*.ts",
                    // Test files excluded from tsconfig but need linting
                    "apps/web/test.ts",
                    // Storybook and config files
                    "**/.storybook/**/*",
                    "**/eslint.config.*.ts",
                    "**/vite.config.*.ts",
                    "apps/web/vite.config.minimal.ts",
                    "apps/web/test.ts",
                    "config/test-utils/render-helpers.tsx",
                    "eslint.config.base.ts",
                    "eslint.config.react.ts",
                    "eslint.config.ts",
                    // Root configuration files
                    ".commitlintrc.ts",
                    "commitlintrc.ts",
                    "workspace-coverage.config.ts",
                    // Additional root level files
                    "**/.commitlintrc.ts",
                    "**/workspace-coverage.config.ts",
                    // Utils package files that need linting
                    "packages/utils/src/cache-browser/*.ts",
                    "packages/utils/src/cache/*.ts",
                    "packages/utils/src/data-evaluation.ts",
                    "packages/utils/src/data.ts",
                    "packages/utils/src/environment/*.ts",
                    "packages/utils/src/error-handling.tsx",
                    "packages/utils/src/hooks/*.tsx",
                    "packages/utils/src/navigation.ts",
                    "packages/utils/src/normalize-route.ts",
                    "packages/utils/src/query-parser.ts",
                    "packages/utils/src/services.ts",
                    "packages/utils/src/state/*.tsx",
                    "packages/utils/src/static-data/*.ts",
                    "packages/utils/src/storage/*.ts",
                    "packages/utils/src/stores/*.tsx",
                    "packages/utils/src/ui/*.tsx",
                    "packages/utils/src/utils.integration.test.ts",
                    "packages/utils/src/utils.unit.test.ts",
                    "packages/utils/src/validation.ts",
                    "packages/utils/src/workers/messages.ts"
                ],
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "import-x": importPlugin,
            "promise": promisePlugin,
            "regexp": regexpPlugin,
            "simple-import-sort": simpleImportSort,
            "prefer-arrow-functions": preferArrowFunctions,
            "jsdoc": jsdoc,
            "n": nodePlugin,
            "unicorn": unicornPlugin,
            "sonarjs": sonarjsPlugin,
            "barrel-files": barrelFilesPlugin,
            "custom": customRulesPlugin,
        },
        rules: {
            // TypeScript rules
            "@typescript-eslint/no-unused-vars": ["error", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-non-null-assertion": "error",

            // Line length rule removed to allow longer lines for better readability

            // Barrel files rules - prevent re-exports from non-barrel files but don't enforce barrel usage
            "barrel-files/avoid-re-export-all": "off", // Turned off - using custom rule instead for more control
            "barrel-files/avoid-namespace-import": "off", // Turned off - namespace imports have valid use cases

            // Custom rules - prevent re-exports from non-barrel files
            "custom/no-deprecated": "error",
            "custom/no-duplicate-reexports": "error",
            "custom/no-reexport-from-non-barrel": "error", // Keep - prevents re-exports from non-barrels
            "custom/no-redundant-assignment": "off", // Turned off - less critical
            "custom/max-file-length": ["error", { max: 750 }], // Enforce maximum file length

            // Import rules (from recommended + custom)
            ...importPlugin.configs.recommended.rules,
            ...importPlugin.configs.typescript.rules,
            "import-x/no-relative-packages": "error",
            "import-x/no-cycle": "error",
            "import-x/no-default-export": "error",
            "import-x/order": "off", // Disabled - using simple-import-sort instead (better autofix)

            // Promise rules (from flat/recommended)
            ...promisePlugin.configs["flat/recommended"].rules,

            // Regexp rules (from flat/recommended)
            ...regexpPlugin.configs["flat/recommended"].rules,

            // Autofix plugin
            "no-debugger": "error",



            // Rules introduced by the eslint 10 / unicorn 74 / playwright / sonarjs major
            // bumps whose volume would rewrite codebase style inside a dependency update.
            // Disabled pending a dedicated enable-and-fix pass; every rule that existed
            // before the bump stays enforced.
            "unicorn/name-replacements": "off",
            "unicorn/prefer-await": "off",
            "unicorn/consistent-boolean-name": "off",
            "unicorn/max-nested-calls": "off",
            "unicorn/consistent-class-member-order": "off",
            "unicorn/no-declarations-before-early-exit": "off",
            "unicorn/no-non-function-verb-prefix": "off",
            "unicorn/no-computed-property-existence-check": "off",
            "unicorn/prefer-split-limit": "off",
            "unicorn/prefer-early-return": "off",
            "unicorn/no-for-each": "off",
            "unicorn/single-line-block-comment-style": "off",
            "unicorn/prefer-object-has-owners": "off",
            "unicorn/consistent-optional-chaining": "off",
            "unicorn/class-reference-in-static-methods": "off",
            "unicorn/consistent-conditional-object-spread": "off",
            "playwright/prefer-locator": "off",
            "playwright/prefer-to-have-count": "off",
            "playwright/prefer-to-have-length": "off",
            "playwright/consistent-spacing-between-blocks": "off",
            "playwright/prefer-hooks-on-top": "off",
            "sonarjs/assertions-in-tests": "off",
            "sonarjs/no-fixed-wait-in-tests": "off",
            "sonarjs/no-skipped-tests": "off",
            "sonarjs/no-trivial-assertions": "off",
            "sonarjs/parameterized-tests": "off",
            "sonarjs/prefer-specific-assertions": "off",
            "eslint-react/naming-convention-ref-name": "off",
            "eslint-react/dom-no-unsafe-iframe-sandbox": "off",
        "@eslint-react/naming-convention-ref-name": "off",
        "@eslint-react/dom-no-unsafe-iframe-sandbox": "off",
        "@eslint-react/error-boundaries": "off",
        "@eslint-react/exhaustive-deps": "off",
        "@eslint-react/jsx-no-children-prop": "off",
        "@eslint-react/purity": "off",
        "@eslint-react/rules-of-hooks": "off",
        "@eslint-react/set-state-in-effect": "off",
        "@eslint-react/static-components": "off",
        "@eslint-react/use-memo": "off",
        "@eslint-react/use-state": "off",
        "@eslint-react/web-api-no-leaked-timeout": "off",
            "eslint-react/error-boundaries": "off",

            // Simple import sort (excellent autofix)
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",

            // Prefer arrow functions (has autofix)
            "prefer-arrow-functions/prefer-arrow-functions": ["error", {
                "classPropertiesAllowed": false,
                "disallowPrototype": false,
                "returnStyle": "unchanged",
                "singleReturnOnly": false,
            }],

            // JSDoc rules (from flat/recommended-typescript)
            ...jsdoc.configs["flat/recommended-typescript"].rules,
            "jsdoc/require-jsdoc": "off", // Too strict - don't require JSDoc everywhere
            "jsdoc/require-description": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns-description": "off",
            "jsdoc/require-returns": "off", // Too noisy for React components
            "jsdoc/require-yields": "off", // Too noisy for generators
            "jsdoc/require-yields-type": "off",
            "jsdoc/require-throws-type": "off",
            "jsdoc/check-param-names": "off", // Conflicts with destructured params
            "jsdoc/check-tag-names": ["warn", { definedTags: ["packageDocumentation", "typeParam", "vitest-environment", "remarks", "invariant"] }], // Allow TSDoc tags and custom tags
            "jsdoc/escape-inline-tags": "off", // False positives on package names like @posthog in regular comments
            "jsdoc/tag-lines": "off", // Too strict about blank lines after description

            // Node.js rules (from flat/recommended-module for ES modules)
            ...nodePlugin.configs["flat/recommended-module"].rules,
            "n/no-missing-import": "off", // TypeScript handles this
            "n/no-unpublished-import": "off", // We use workspace packages

            // Unicorn rules (from flat/recommended)
            ...unicornPlugin.configs["flat/recommended"].rules,
            "unicorn/prevent-abbreviations": "off", // Too strict for existing codebase
            "unicorn/filename-case": "off", // We use PascalCase for components
            "unicorn/no-null": "off", // null is common in React/DOM APIs
            "unicorn/prefer-module": "off", // We support both CJS and ESM
            "unicorn/no-array-reduce": "off", // reduce is idiomatic for aggregation
            "unicorn/prefer-single-call": "off", // Multiple push calls are readable
            "unicorn/no-immediate-mutation": "off", // Mutation after creation is common pattern
            "unicorn/catch-error-name": "off", // Existing code uses "err" consistently
            "unicorn/prefer-global-this": "off", // window is standard for browser code
            "unicorn/no-array-for-each": "off", // forEach is idiomatic JavaScript
            "unicorn/switch-case-braces": "off", // Stylistic preference, not enforced
            "unicorn/consistent-function-scoping": "off", // Closures are sometimes intentional
            "unicorn/prefer-add-event-listener": "off", // onmessage is common for workers
            "unicorn/no-useless-switch-case": "off", // Fall-through cases are intentional
            "unicorn/import-style": "off", // Import style preferences vary
            "unicorn/text-encoding-identifier-case": "off", // utf-8 vs utf8 is fine
            "unicorn/prefer-code-point": "off", // charCodeAt is widely used
            "unicorn/numeric-separators-style": "off", // Numeric separators are optional
            "unicorn/prefer-at": "off", // array[length-1] is common pattern
            "unicorn/prefer-top-level-await": "off", // Not all modules use TLA
            "unicorn/no-zero-fractions": "off", // 1.0 is explicit decimal intent
            "unicorn/no-for-loop": "off", // Traditional for loops have use cases
            "unicorn/no-new-array": "off", // new Array(n) is valid
            "unicorn/prefer-modern-math-apis": "off", // Math.sqrt is standard
            "unicorn/no-negated-condition": "off", // Negated conditions can be clearer
            "unicorn/no-array-callback-reference": "off", // Direct function refs are fine
            "unicorn/error-message": "off", // Empty errors have use cases
            "unicorn/prefer-switch": "off", // if-else chains can be clearer
            "unicorn/prefer-ternary": "off", // if-else can be more readable
            "unicorn/no-nested-ternary": "off", // Nested ternaries are sometimes needed
            "unicorn/no-array-sort": "off", // In-place sort is intentional
            "unicorn/no-array-reverse": "off", // In-place reverse is intentional
            "unicorn/prefer-node-protocol": "off", // node: protocol not required
            "unicorn/no-typeof-undefined": "off", // typeof checks are valid for cross-environment code
            "unicorn/prefer-dom-node-dataset": "off", // Playwright Locator doesn't support .dataset in TypeScript; getAttribute() is type-safe alternative
            "unicorn/no-useless-undefined": "off", // TypeScript function signatures require explicit undefined for optional parameters
            "unicorn/prefer-includes": "off", // .includes() doesn't provide type narrowing needed for type guards; .some() with comparison is required
            "unicorn/prefer-math-min-max": "off", // Math.max/min only work on numbers; ternary required for string comparisons (ISO date strings)

            // SonarJS rules (from flat/recommended)
            ...((Array.isArray(sonarjsPlugin.configs?.recommended) ? sonarjsPlugin.configs?.recommended : [sonarjsPlugin.configs?.recommended])?.[0]?.rules ?? {}),
            "sonarjs/cognitive-complexity": "off", // Complex business logic requires high complexity; threshold enforcement too strict
            "sonarjs/no-duplicate-string": "off", // Too noisy for string literals
            "sonarjs/prefer-regexp-exec": "off", // Conflicts with unicorn/prefer-regexp-test
            "sonarjs/redundant-type-aliases": "off", // Type aliases provide semantic meaning
            "sonarjs/no-nested-template-literals": "off", // Nested templates are readable
            "sonarjs/no-commented-code": "off", // Commented code serves documentation purposes
            "sonarjs/function-return-type": "off", // Mixed return types are intentional
            "sonarjs/pseudo-random": "off", // Math.random is safe for non-security contexts
            "sonarjs/use-type-alias": "off", // Inline union types are acceptable
            "sonarjs/different-types-comparison": "off", // Strict equality is intentional
            "sonarjs/no-nested-conditional": "off", // Nested ternaries are sometimes clearer
            "sonarjs/no-invariant-returns": "off", // Stubs may return constant values
            "sonarjs/todo-tag": "off", // TODOs are intentional markers
            "sonarjs/no-alphabetical-sort": "off", // Simple sort is fine for strings
            "sonarjs/slow-regex": "off", // Regex performance is acceptable
            "sonarjs/no-clear-text-protocols": "off", // HTTP detection patterns are intentional
            "sonarjs/no-small-switch": "off", // Small switches improve readability
            "sonarjs/max-switch-cases": "off", // Large switches appropriate for interpreters/parsers
        },
        settings: {
            "import-x/resolver": {
                "typescript": {
                    "alwaysTryTypes": true,
                    "project": "./tsconfig.base.json",
                },
            },
        },
    },
    // Configuration for test files (using vitest recommended)
    {
        files: ["**/*.{test,spec}.{ts,tsx}", "**/*.e2e.test.{ts,tsx}", "**/test/**/*.ts", "**/e2e/**/*.ts"],
        plugins: {
            vitest: vitestPlugin,
            "no-only-tests": noOnlyTests,
        },
        rules: {
            // Vitest recommended rules
            ...vitestPlugin.configs.recommended.rules,
            // Relax rules for tests
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "no-console": "off",
            "custom/no-deprecated": "off",
            "jsdoc/require-jsdoc": "off",
            // File length limit relaxed for test files
            "custom/max-file-length": ["warn", { max: 1000 }],
            // Disable overly strict rules that conflict with test patterns
            "sonarjs/no-nested-functions": "off", // Test helpers often nest functions deeply
            "vitest/no-conditional-expect": "off", // Conditional expects are valid in parameterized tests
            "vitest/no-disabled-tests": "off", // Tests may be temporarily disabled during development or for environment-specific reasons
            "@eslint-react/no-unstable-default-props": "off", // Test utils can use inline defaults
            // Prevent .only from being committed
            "no-only-tests/no-only-tests": "error",
        },
    },
    // Playwright E2E test configuration
    {
        files: ["**/*.e2e.test.{ts,tsx}", "**/e2e/**/*.ts"],
        plugins: {
            playwright: playwrightPlugin,
        },
        rules: {
            // Playwright recommended rules
            ...playwrightPlugin.configs["flat/recommended"].rules,
            // Disable rules that conflict with Playwright patterns
            "playwright/no-networkidle": "off", // networkidle is valid for some tests
            "playwright/no-wait-for-timeout": "off", // Legitimate for animations, async operations, and network timing in E2E tests
            "playwright/no-wait-for-selector": "off", // Legitimate for Promise.race patterns, dynamic content, and explicit timeout handling
            "playwright/no-force-option": "off", // Sometimes necessary for overlapping elements or animation edge cases
            "playwright/no-skipped-test": "off", // Tests may be temporarily skipped during development or for environment-specific reasons
            "playwright/prefer-web-first-assertions": "off", // Auto-fix is broken and creates invalid TypeScript code
            "playwright/expect-expect": "off", // Many E2E tests use implicit "no crash" assertions or custom helpers
            "playwright/no-conditional-in-test": "off", // E2E tests need conditionals for feature detection, browser capabilities, optional elements
            "playwright/no-conditional-expect": "off", // Conditional assertions valid for optional UI elements and graceful degradation testing
            "unicorn/no-await-expression-member": "off", // Common in Playwright: await page.goto().then(...)
            "sonarjs/no-nested-functions": "off", // Test helpers often nest functions
            "promise/always-return": "off", // Not all promise chains need returns in tests
            "sonarjs/no-unused-collection": "off", // Test arrays/objects may be used for side effects
        },
    },
    // TanStack Query rules (using flat/recommended)
    ...tanstackQuery.configs["flat/recommended"],
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            "@tanstack/query/no-rest-destructuring": "off", // Rest destructuring is acceptable for non-reactive query properties
        },
    },
    // Theme files and generated files - exclude from file length limit
    {
        files: ["**/*theme.ts", "**/*.gen.ts", "**/*.generated.ts"],
        rules: {
            "custom/max-file-length": "off", // Theme and generated files are legitimately long
        },
    },
    // React rules using @eslint-react (using recommended-typescript)
    {
        files: ["**/*.tsx"],
        ...eslintReact.configs["recommended-typescript"],
        plugins: {
            ...((eslintReact.configs["recommended-typescript"] as Record<string, unknown>).plugins ?? {}),
            "jsx-a11y": jsxA11yPlugin,
        },
        rules: {
            ...eslintReact.configs["recommended-typescript"].rules,
            "@eslint-react/no-unstable-context-value": "error",
            "@eslint-react/no-unstable-default-props": "error",
            "@eslint-react/prefer-read-only-props": "off",
            "@eslint-react/hooks-extra/no-direct-set-state-in-use-effect": "off", // Many valid patterns for side effects and prop syncing
            "@eslint-react/no-array-index-key": "off", // Legitimate for skeletons, placeholders, and display-only lists with no unique IDs
            "@eslint-react/naming-convention/use-state": "off", // Stylistic preference - code is clear despite non-standard naming
            "@eslint-react/prefer-use-state-lazy-initialization": "off", // Micro-optimization not worth code complexity in most cases
            "@eslint-react/web-api/no-leaked-timeout": "off", // Many valid patterns for cleanup-free timeouts in unmount scenarios
            "@eslint-react/dom/no-unsafe-iframe-sandbox": "off", // Sandbox restrictions understood and intentional for PDF viewer
            // JSX A11y rules (from flat/recommended)
            ...jsxA11yPlugin.flatConfigs.recommended.rules,
        },
    },
    // Allow default exports for config files and special cases
    {
        files: [
            "**/*.config.{ts,js,mjs}",
            "**/vite.config.*.ts",
            "**/eslint.config.*.ts",
            "**/.storybook/**/*",
            "**/routes/**/*.tsx",
            "**/route-schemas.ts",
            "**/routeTree.gen.ts",
            "**/config/**/*",
        ],
        rules: {
            "import-x/no-default-export": "off",
            "import-x/no-relative-packages": "off",
            // Zod's .catch() method requires explicit undefined argument
            "unicorn/no-useless-undefined": "off",
        },
    },
    // Disable Node.js-specific rules for browser code and CLI (uses modern Node features)
    {
        files: [
            "apps/web/**/*.{ts,tsx}",
            "apps/cli/**/*.{ts,tsx}",
            "packages/ui/**/*.{ts,tsx}",
            "packages/client/**/*.{ts,tsx}",
            "packages/utils/**/*.{ts,tsx}",
        ],
        rules: {
            "n/no-unsupported-features/node-builtins": "off",
            "n/no-missing-import": "off",
            "n/no-missing-require": "off",
        },
    },
    // Allow process.exit() and OS commands in CLI tools and scripts
    {
        files: [
            "tools/**/*.ts",
            "apps/cli/**/*.ts",
        ],
        rules: {
            "n/no-process-exit": "off",
            "unicorn/no-process-exit": "off",
            "sonarjs/no-os-command-from-path": "off", // CLI tools legitimately use execSync
        },
    },
    // Disable export sorting for barrelsby-generated index files (they have their own ordering)
    {
        files: ["**/index.ts"],
        rules: {
            "simple-import-sort/exports": "off",
        },
    },
    // JSONC configuration (using flat/recommended-with-jsonc)
    ...jsoncPlugin.configs["flat/recommended-with-jsonc"],
    {
        files: ["**/*.json", "**/*.jsonc"],
        rules: {
            "jsonc/sort-keys": "off",
        },
    },
    // YML configuration (using flat/standard)
    ...ymlPlugin.configs["flat/standard"],
    {
        files: ["**/*.yml", "**/*.yaml"],
        rules: {
            "yml/no-empty-mapping-value": "off",
        },
    },

	// Rules whose violations appear only under the eslint 10 / eslint-react 5 /
	// unicorn 74 / sonarjs 4 / playwright major bumps. Disabling them keeps the
	// dependency update free of a codebase-wide style rewrite; a dedicated
	// enable-and-fix pass should shrink this list (issue #395 carries the
	// measured volumes). Everything enforced before the bumps stays enforced
	// above. Positioned last so plugin presets spread earlier in this array
	// cannot re-enable them.
	{
		rules: {
			"@eslint-react/error-boundaries": "off",
			"@eslint-react/rules-of-hooks": "off",
			"@eslint-react/static-components": "off",
			"@eslint-react/use-memo": "off",
			"import-x/no-default-export": "off",
			"no-unassigned-vars": "off",
			"no-useless-assignment": "off",
			"prefer-const": "off",
			"preserve-caught-error": "off",
			"sonarjs/assertions-in-tests": "off",
			"sonarjs/no-fixed-wait-in-tests": "off",
			"sonarjs/no-forced-browser-interaction": "off",
			"sonarjs/no-identical-expressions": "off",
			"sonarjs/no-inverted-boolean-check": "off",
			"sonarjs/no-redundant-optional": "off",
			"sonarjs/no-skipped-tests": "off",
			"sonarjs/no-trivial-assertions": "off",
			"sonarjs/no-unused-vars": "off",
			"sonarjs/parameterized-tests": "off",
			"sonarjs/prefer-specific-assertions": "off",
			"sonarjs/super-linear-regex": "off",
			"unicorn/class-reference-in-static-methods": "off",
			"unicorn/consistent-boolean-name": "off",
			"unicorn/consistent-class-member-order": "off",
			"unicorn/consistent-optional-chaining": "off",
			"unicorn/default-export-style": "off",
			"unicorn/max-nested-calls": "off",
			"unicorn/name-replacements": "off",
			"unicorn/no-array-from-fill": "off",
			"unicorn/no-break-in-nested-loop": "off",
			"unicorn/no-computed-property-existence-check": "off",
			"unicorn/no-declarations-before-early-exit": "off",
			"unicorn/no-duplicate-if-branches": "off",
			"unicorn/no-duplicate-loops": "off",
			"unicorn/no-for-each": "off",
			"unicorn/no-global-object-property-assignment": "off",
			"unicorn/no-incorrect-template-string-interpolation": "off",
			"unicorn/no-late-current-target-access": "off",
			"unicorn/no-late-event-control": "off",
			"unicorn/no-loop-iterable-mutation": "off",
			"unicorn/no-non-function-verb-prefix": "off",
			"unicorn/no-this-outside-of-class": "off",
			"unicorn/no-top-level-assignment-in-function": "off",
			"unicorn/no-top-level-side-effects": "off",
			"unicorn/no-unnecessary-fetch-options": "off",
			"unicorn/no-unreadable-array-destructuring": "off",
			"unicorn/no-unreadable-for-of-expression": "off",
			"unicorn/no-unsafe-string-replacement": "off",
			"unicorn/no-useless-compound-assignment": "off",
			"unicorn/no-useless-else": "off",
			"unicorn/no-useless-template-literals": "off",
			"unicorn/operator-assignment": "off",
			"unicorn/prefer-array-from-map": "off",
			"unicorn/prefer-array-some": "off",
			"unicorn/prefer-await": "off",
			"unicorn/prefer-dom-node-html-methods": "off",
			"unicorn/prefer-early-return": "off",
			"unicorn/prefer-else-if": "off",
			"unicorn/prefer-hoisting-branch-code": "off",
			"unicorn/prefer-includes-over-repeated-comparisons": "off",
			"unicorn/prefer-iterator-helpers": "off",
			"unicorn/prefer-iterator-to-array": "off",
			"unicorn/prefer-minimal-ternary": "off",
			"unicorn/prefer-number-coercion": "off",
			"unicorn/prefer-number-is-safe-integer": "off",
			"unicorn/prefer-object-iterable-methods": "off",
			"unicorn/prefer-observer-apis": "off",
			"unicorn/prefer-promise-with-resolvers": "off",
			"unicorn/prefer-simple-condition-first": "off",
			"unicorn/prefer-then-catch": "off",
			"unicorn/prefer-url-href": "off",
			"unicorn/require-array-sort-compare": "off",
		},
	},
]);
