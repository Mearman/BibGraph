export default {
  // Package.json files - run syncpack to fix versions and formatting Use function form to prevent lint-staged from passing filenames as args Order: fix mismatches -> apply semver ranges -> format -> lint to verify
  '**/package.json': [
    // syncpack 15 folded fix-mismatches and set-semver-ranges into fix
    () => 'syncpack fix',
    () => 'syncpack lint'
  ],

  // TypeScript and JavaScript sources. One glob and one sequential task list: lint-staged runs the tasks of separate globs concurrently, and both turbo tasks depend on the same package builds, so two globs raced on each package's dist directory. Turbo's cache scopes each run to the packages whose inputs changed.
  '**/*.{ts,tsx,js,jsx}': [
    () => 'sh -c "pnpm exec turbo run _typecheck"',
    () => 'sh -c "pnpm exec turbo run _lint -- --fix"'
  ],

  // GitHub workflow files (actionlint only validates workflow files in .github/workflows/)
  '.github/workflows/*.yml': [
    'actionlint'
  ],

  '.github/workflows/*.yaml': [
    'actionlint'
  ]
};
