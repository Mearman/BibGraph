import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig, type PluginOption } from 'vite';

// import { openalexCachePlugin } from "../../config/vite-plugins/openalex-cache";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = resolve(__dirname, "..");
const monorepoRoot = resolve(__dirname, "../..");

/**
 * Get build information from git and package.json
 * Injected at build time via Vite's define option
 */
function getBuildInfo() {
  const safeGitExec = (args: string[], fallback: string): string => {
    try {
      return execFileSync('git', args, { encoding: 'utf-8', cwd: monorepoRoot }).trim();
    } catch {
      return fallback;
    }
  };

  // Get version: prefer CI-injected version, fall back to package.json
  let version = '0.0.0-dev';
  const ciVersion = process.env.NEXT_RELEASE_VERSION;
  if (ciVersion) {
    // CI provides the next release version before semantic-release commits
    version = ciVersion;
  } else {
    // Fall back to package.json for local dev and PRs
    try {
      const pkgJson = JSON.parse(readFileSync(resolve(monorepoRoot, 'package.json'), 'utf-8'));
      version = pkgJson.version || version;
    } catch {
      // Fall back to default version
    }
  }

  const commitHash = safeGitExec(['rev-parse', 'HEAD'], 'unknown');
  const shortCommitHash = safeGitExec(['rev-parse', '--short', 'HEAD'], 'unknown');
  const branchName = safeGitExec(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown');
  const commitTimestamp = safeGitExec(['log', '-1', '--format=%cI'], new Date().toISOString());

  return {
    buildTimestamp: new Date().toISOString(),
    commitHash,
    shortCommitHash,
    commitTimestamp,
    branchName,
    version,
    repositoryUrl: 'https://github.com/Mearman/BibGraph',
  };
}

/**
 * GitHub Pages plugin - creates .nojekyll file for proper asset serving
 */
function githubPagesPlugin(): PluginOption {
  return {
    name: "github-pages",
    apply: "build",
    closeBundle() {
      const outputDir = resolve(appRoot, "dist");
      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      const nojekyllPath = resolve(outputDir, ".nojekyll");
      writeFileSync(nojekyllPath, "");
    },
  };
}

// Type-safe configuration creation
function createWebConfig(): UserConfig {
  return {
    // Use relative base path only for production builds (GitHub Pages deployment)
    // In development, use root path for proper dev server behavior
    base: process.env.NODE_ENV === 'production' ? './' : '/',

    // Pass GITHUB_PAGES to client code via import.meta.env
    envPrefix: ['VITE_', 'GITHUB_PAGES'],

    // Plugins configuration
    plugins: [
      nxViteTsPaths(),
      // TanStack Router Plugin - must come before React plugin
      // Use absolute paths to avoid issues during Nx project graph generation
      tanstackRouter({
        routesDirectory: resolve(__dirname, 'src/routes'),
        generatedRouteTree: resolve(__dirname, 'src/routeTree.gen.ts'),
      }),
      // OpenAlex Cache Plugin - disabled due to missing plugin file
      // openalexCachePlugin({
      //   staticDataPath: "public/data/openalex",
      //   verbose: process.env.RUNNING_E2E === 'true' ? true : false,
      //   enabled: true,
      // }),
      // Vanilla Extract Plugin
      vanillaExtractPlugin(),
      // React Plugin
      react(),
      // GitHub Pages Plugin
      githubPagesPlugin(),
    ],

    // Esbuild options - keep function names for better error stack traces
    esbuild: {
      keepNames: true,
    },

    // Build configuration
    build: {
      outDir: 'dist',
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: true,
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress certain warnings that are common in monorepos
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
          if (warning.code === "THIS_IS_UNDEFINED") return;
          warn(warning);
        },
        output: {
          // Removed manual chunking - React 19 has initialization issues with manual vendor chunks
          // Let Vite/Rollup handle chunking automatically
          manualChunks: undefined,
          chunkFileNames: () => {
            return `assets/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const fileName = assetInfo.names?.[0];
            if (!fileName) {
              return `assets/[name]-[hash][extname]`;
            }
            if (/\.(css)$/.test(fileName)) {
              return `assets/css/[name]-[hash][extname]`;
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(fileName)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(fileName)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
        // Removed aggressive tree-shaking config - use Rollup defaults
        // React 19 scheduler requires proper module side effect handling
        treeshake: true,
      },
      chunkSizeWarningLimit: 1000,
    },

    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
      dedupe: ['react', 'react-dom', '@tanstack/react-virtual'],
    },

    // Development server configuration
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true,
        port: 5174,
      },
      // Proxy OpenAlex API requests to avoid CORS issues in development
      proxy: {
        '/api/openalex': {
          target: 'https://api.openalex.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openalex/, ''),
          secure: true,
        },
      },
      fs: {
        strict: false,
        allow: [
          '.',           // Current project
          '..',          // Parent directory
          '../..',       // For accessing sibling projects
          '../../.pnpm', // For pnpm store access
          '../../node_modules' // For workspace dependencies
        ],
      },
      watch: {
        usePolling: false,
        interval: 300,
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/public/data/**',
          '**/*.log',
          '**/.nx/**',
        ],
      },
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client',
        '@tanstack/react-router',
        '@tanstack/react-query',
        '@tanstack/react-virtual',
        '@mantine/core',
        '@mantine/hooks',
      ],
      exclude: [
        '@bibgraph/client',
        '@bibgraph/utils',
        '@nx/vite',
        '@nx/vite/plugin',
        '@nx/devkit',
        '@nx/angular',
        'rxjs',
        '@angular-devkit/architect',
        '@angular-devkit/core',
        '@angular-devkit/schematics',
        'ts-node',
        '@swc-node/register'
      ],
      force: false,
    },

    // Define global replacements
    define: {
      global: 'globalThis',
      __BUILD_INFO__: JSON.stringify(getBuildInfo()),
    },

    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
      headers: {
        // Prevent CSS caching issues in CI
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
  };
}

// Create and export the configuration
export default defineConfig(createWebConfig());
