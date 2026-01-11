import type { RcFile } from 'syncpack';

const config: RcFile = {
  // Sort exports condition keys (source before import/require for bundler support)
  sortExports: [
    'types',
    'source',
    'node-addons',
    'node',
    'browser',
    'module',
    'import',
    'require',
    'svelte',
    'development',
    'production',
    'script',
    'default',
  ],

  // Sort package.json properties
  sortFirst: [
    'name',
    'description',
    'version',
    'type',
    'private',
    'packageManager',
    'workspaces',
    'repository',
    'scripts',
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ],

  // Semver groups - use exact versions (no ^ or ~)
  semverGroups: [
    {
      label: 'Use exact versions (pinned)',
      packages: ['**'],
      dependencies: ['**'],
      dependencyTypes: ['prod', 'dev', 'peer', 'optional', 'pnpmOverrides'],
      range: '',
    },
  ],

  // Version groups - order matters (first match wins)
  versionGroups: [
    // Local workspace packages must use workspace:* protocol
    {
      label: 'Local workspace packages',
      packages: ['**'],
      dependencies: ['@bibgraph/*'],
      dependencyTypes: ['prod', 'dev'],
      pinVersion: 'workspace:*',
    },
    // Nx packages must all use the same version
    {
      label: 'Nx packages',
      packages: ['**'],
      dependencies: ['nx', '@nx/*'],
      preferVersion: 'highestSemver',
    },
    // Mantine packages must all use the same version
    {
      label: 'Mantine packages',
      packages: ['**'],
      dependencies: ['@mantine/*'],
      preferVersion: 'highestSemver',
    },
    // TanStack packages must all use the same version
    {
      label: 'TanStack packages',
      packages: ['**'],
      dependencies: ['@tanstack/*'],
      preferVersion: 'highestSemver',
    },
    // Testing Library packages must all use the same version
    {
      label: 'Testing Library packages',
      packages: ['**'],
      dependencies: ['@testing-library/*'],
      preferVersion: 'highestSemver',
    },
    // TypeScript ESLint packages must all use the same version
    {
      label: 'TypeScript ESLint packages',
      packages: ['**'],
      dependencies: ['@typescript-eslint/*'],
      preferVersion: 'highestSemver',
    },
    // Vitest packages must all use the same version
    {
      label: 'Vitest packages',
      packages: ['**'],
      dependencies: ['vitest', '@vitest/*'],
      preferVersion: 'highestSemver',
    },
    // DnD Kit packages must all use the same version
    {
      label: 'DnD Kit packages',
      packages: ['**'],
      dependencies: ['@dnd-kit/*'],
      preferVersion: 'highestSemver',
    },
    // Semantic Release packages must all use the same version
    {
      label: 'Semantic Release packages',
      packages: ['**'],
      dependencies: ['@semantic-release/*'],
      preferVersion: 'highestSemver',
    },
    // Commitlint packages must all use the same version
    {
      label: 'Commitlint packages',
      packages: ['**'],
      dependencies: ['@commitlint/*'],
      preferVersion: 'highestSemver',
    },
    // SWC packages must all use the same version
    {
      label: 'SWC packages',
      packages: ['**'],
      dependencies: ['@swc/*', '@swc-node/*'],
      preferVersion: 'highestSemver',
    },
    // React Three Fiber packages must all use the same version
    {
      label: 'React Three Fiber packages',
      packages: ['**'],
      dependencies: ['@react-three/*'],
      preferVersion: 'highestSemver',
    },
    // Playwright packages must all use the same version
    {
      label: 'Playwright packages',
      packages: ['**'],
      dependencies: ['@playwright/*'],
      preferVersion: 'highestSemver',
    },
    // Axe-core packages must all use the same version
    {
      label: 'Axe-core packages',
      packages: ['**'],
      dependencies: ['@axe-core/*'],
      preferVersion: 'highestSemver',
    },
    // ESLint core packages must all use the same version
    {
      label: 'ESLint core packages',
      packages: ['**'],
      dependencies: ['@eslint/*'],
      preferVersion: 'highestSemver',
    },
    // Vanilla Extract packages must all use the same version
    {
      label: 'Vanilla Extract packages',
      packages: ['**'],
      dependencies: ['@vanilla-extract/*'],
      preferVersion: 'highestSemver',
    },
    // Vite packages must all use the same version
    {
      label: 'Vite packages',
      packages: ['**'],
      dependencies: ['vite', '@vitejs/*', 'vite-*'],
      preferVersion: 'highestSemver',
    },
    // D3 type definitions must all use the same version
    {
      label: 'D3 types',
      packages: ['**'],
      dependencies: ['@types/d3', '@types/d3-*'],
      preferVersion: 'highestSemver',
    },
    // Three.js packages must all use the same version
    {
      label: 'Three.js packages',
      packages: ['**'],
      dependencies: ['three', '@types/three', 'three-*'],
      preferVersion: 'highestSemver',
    },
    // React Force Graph packages must all use the same version
    {
      label: 'React Force Graph packages',
      packages: ['**'],
      dependencies: ['react-force-graph-*'],
      preferVersion: 'highestSemver',
    },
    // XO ESLint config packages must all use the same version
    {
      label: 'XO ESLint config',
      packages: ['**'],
      dependencies: ['eslint-config-xo', 'eslint-config-xo-*'],
      preferVersion: 'highestSemver',
    },
    // React packages must all use the same version
    {
      label: 'React packages',
      packages: ['**'],
      dependencies: ['react', 'react-dom'],
      preferVersion: 'highestSemver',
    },
    // React types must all use the same version
    {
      label: 'React types',
      packages: ['**'],
      dependencies: ['@types/react', '@types/react-dom'],
      preferVersion: 'highestSemver',
    },
    // PostHog packages must all use the same version
    {
      label: 'PostHog packages',
      packages: ['**'],
      dependencies: ['posthog-js', '@posthog/*'],
      preferVersion: 'highestSemver',
    },
    // Everything else: use highest semver version found across all packages
    {
      label: 'Use highest version across all packages',
      packages: ['**'],
      dependencies: ['**'],
      policy: 'highest',
    },
  ],

  // Source files to analyze
  source: [
    'package.json',
    'apps/*/package.json',
    'packages/*/package.json',
    'tools/*/package.json',
  ],
};

export default config;
