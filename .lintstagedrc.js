export default {
  // Package.json files - run syncpack to fix versions and formatting
  // Use function form to prevent lint-staged from passing filenames as args
  // Order: fix mismatches -> apply semver ranges -> format -> lint to verify
  '**/package.json': [
    () => 'syncpack fix-mismatches',
    () => 'syncpack set-semver-ranges',
    () => 'syncpack format',
    () => 'syncpack lint'
  ],

  // TypeScript and JavaScript files in packages and apps
  '{packages,apps}/**/*.{ts,tsx,js,jsx}': [
    // Run cached lint:fix for affected projects using Nx (no daemon for pre-commit)
    () => 'NX_DAEMON=false nx affected --target=lint:fix'
  ],

  // Type check all affected projects (no daemon for pre-commit)
  '*.{ts,tsx}': [
    () => 'NX_DAEMON=false nx affected --target=typecheck'
  ],

  // GitHub workflow files (actionlint only validates workflow files in .github/workflows/)
  '.github/workflows/*.yml': [
    'actionlint'
  ],

  '.github/workflows/*.yaml': [
    'actionlint'
  ]
};