import baseConfig from "../../eslint.config.base.js";

/**
 * ESLint configuration for CLI package
 *
 * Extends base config with CLI-specific overrides:
 * - Disable no-deprecated rule for command files (Commander.js has deprecated
 *   overloads for .option() and .description() methods, but the signatures
 *   actually used in this codebase are NOT deprecated)
 * - Disable Node.js builtins check (base config has this but paths don't resolve
 *   when running from CLI directory)
 */
export default [
  ...baseConfig,
  {
    // CLI uses modern Node.js features like fetch - base config disables these rules
    // for apps/cli/** but paths don't resolve when running from CLI directory
    files: ["**/*.ts"],
    rules: {
      "n/no-unsupported-features/node-builtins": "off",
      "n/no-missing-import": "off",
      "n/no-missing-require": "off",
      // CLI apps use process.exit() for proper exit codes
      "n/no-process-exit": "off",
      "unicorn/no-process-exit": "off",
      "sonarjs/no-os-command-from-path": "off",
    },
  },
  {
    // CLI commands use non-deprecated Commander.js patterns, but TypeScript
    // type resolution picks up deprecated overload signatures. Disable the
    // custom/no-deprecated rule for command files since the actual usage is valid.
    files: ["**/commands/**/*.ts", "**/openalex-cli*.ts", "**/simple-cli*.ts"],
    rules: {
      "custom/no-deprecated": "off",
    },
  },
];
