import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { tanstackRouter } from '@tanstack/router-vite-plugin';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig, type PluginOption } from 'vite';
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa';

// import { openalexCachePlugin } from "../../config/vite-plugins/openalex-cache";


// Under Vite's native TypeScript config loader, import.meta.dirname is apps/web itself: the app root is the config directory (the previous ".." escape wrote build output metadata one directory too high, into apps/dist).
const appRoot = resolve(import.meta.dirname, ".");
const monorepoRoot = resolve(import.meta.dirname, "../..");

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

/*
 * PWA configuration (vite-plugin-pwa).
 *
 * The app deploys under two prefixes (mearman.github.io/BibGraph/ and the bibgraph.com site root), so every URL the plugin emits inherits Vite's `base` and stays relative to the deployment directory. The service worker script, scope, manifest link and icon entries all resolve correctly on both hosts that way.
 *
 * Routing is hash-based (createHashHistory in main.tsx): every route is the same document, so the precached app shell IS the navigation fallback. There is no per-route server fallback to configure.
 *
 * In development the plugin generates nothing (devOptions stays disabled): the dev server serves no sw.js and `virtual:pwa-register` resolves to a no-op stub, so registration code paths are inert there.
 */

// Matches the description meta tag in index.html, which is the app's canonical description.
const PWA_DESCRIPTION = 'BibGraph - Explore academic research data from OpenAlex, visualize citation networks, and discover research relationships across works, authors, institutions, and more.';

// The app shell is white in light mode (the default Mantine body background); the manifest only allows a single static theme colour, so it matches the light shell.
const APP_THEME_COLOUR = '#ffffff';
const APP_BACKGROUND_COLOUR = '#ffffff';

const SECONDS_PER_DAY = 60 * 60 * 24;

// NetworkFirst caches for OpenAlex API responses: previously viewed entities render offline. Bounded so long browsing sessions cannot grow the cache without limit. The full request URL (including any mailto= politeness parameter) is the cache key, which is correct because identical query parameters return identical responses.
const OPENALEX_API_CACHE_NAME = 'openalex-api-runtime';
const OPENALEX_API_CACHE_MAX_ENTRIES = 100;
const OPENALEX_API_CACHE_MAX_AGE_DAYS = 30;
const OPENALEX_API_NETWORK_TIMEOUT_SECONDS = 8;
const OPENALEX_API_URL_PATTERN = /^https:\/\/api\.openalex\.org\/.*$/;
// The dev server proxies this path to api.openalex.org (see server.proxy below); the route keeps a worker enabled in development caching the identical surface.
const OPENALEX_DEV_PROXY_URL_PATTERN = /\/api\/openalex\/.*$/;

// CacheFirst caches for the committed static data tier (public/data/openalex, also deployed to mearman.github.io/BibGraph/data/openalex/ and read cross-origin from bibgraph.com). Entries are immutable per deployment, so no age limit is needed.
const OPENALEX_STATIC_DATA_CACHE_NAME = 'openalex-static-data';
const OPENALEX_STATIC_DATA_CACHE_MAX_ENTRIES = 500;
const OPENALEX_STATIC_DATA_URL_PATTERN = /^https:\/\/mearman\.github\.io\/BibGraph\/data\/openalex\/.*$/;
const OPENALEX_LOCAL_STATIC_DATA_URL_PATTERN = /^https?:\/\/[^/]+\/data\/openalex\/.*$/;

// Largest emitted chunk is currently ~1.5MB (the graph lazy route); 4MiB leaves headroom for growth. The 19MB static data tree never matches the precache globs.
const PRECACHE_MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

// Derived from the plugin's own option types so the literals below are checked against workbox's mutable shapes (an `as const` tuple for `statuses` would be readonly and rejected).
type RuntimeCacheOptions = NonNullable<NonNullable<NonNullable<VitePWAOptions['workbox']>['runtimeCaching']>[number]['options']>;

const openAlexApiCacheOptions: RuntimeCacheOptions = {
  cacheName: OPENALEX_API_CACHE_NAME,
  networkTimeoutSeconds: OPENALEX_API_NETWORK_TIMEOUT_SECONDS,
  expiration: {
    maxEntries: OPENALEX_API_CACHE_MAX_ENTRIES,
    maxAgeSeconds: OPENALEX_API_CACHE_MAX_AGE_DAYS * SECONDS_PER_DAY,
  },
  cacheableResponse: { statuses: [0, 200] },
};

const openAlexStaticDataCacheOptions: RuntimeCacheOptions = {
  cacheName: OPENALEX_STATIC_DATA_CACHE_NAME,
  expiration: {
    maxEntries: OPENALEX_STATIC_DATA_CACHE_MAX_ENTRIES,
  },
  // Status 0 covers opaque cross-origin responses (bibgraph.com reading the GitHub Pages data tier).
  cacheableResponse: { statuses: [0, 200] },
};

function pwaPlugin(): PluginOption {
  return VitePWA({
    registerType: 'autoUpdate',
    // favicon.svg is not referenced from the manifest; the PNG/manifest icons are added to the precache automatically (includeManifestIcons defaults to true).
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'BibGraph',
      short_name: 'BibGraph',
      description: PWA_DESCRIPTION,
      lang: 'en',
      // Relative to the deployment directory, inherited from Vite's base.
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: APP_BACKGROUND_COLOUR,
      theme_color: APP_THEME_COLOUR,
      icons: [
        // PNG entries carry installability on Chromium and Safari; the SVG entries let SVG-capable browsers use the sharper scalable mark (both adapt to colour scheme).
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
        { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    workbox: {
      // With hash routing every route is the same document, so the precached shell is the fallback for every navigation request (verified by e2e/pwa-offline.e2e.test.ts).
      navigateFallback: 'index.html',
      maximumFileSizeToCacheInBytes: PRECACHE_MAX_FILE_SIZE_BYTES,
      runtimeCaching: [
        {
          urlPattern: OPENALEX_API_URL_PATTERN,
          handler: 'NetworkFirst',
          options: openAlexApiCacheOptions,
        },
        {
          urlPattern: OPENALEX_DEV_PROXY_URL_PATTERN,
          handler: 'NetworkFirst',
          options: openAlexApiCacheOptions,
        },
        {
          urlPattern: OPENALEX_STATIC_DATA_URL_PATTERN,
          handler: 'CacheFirst',
          options: openAlexStaticDataCacheOptions,
        },
        {
          urlPattern: OPENALEX_LOCAL_STATIC_DATA_URL_PATTERN,
          handler: 'CacheFirst',
          options: openAlexStaticDataCacheOptions,
        },
      ],
    },
  });
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
      // TanStack Router Plugin - must come before React plugin
      // Use absolute paths to avoid issues during Nx project graph generation
      tanstackRouter({
        routesDirectory: resolve(import.meta.dirname, 'src/routes'),
        generatedRouteTree: resolve(import.meta.dirname, 'src/routeTree.gen.ts'),
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
      // PWA Plugin (manifest, service worker, runtime caching; inert in development)
      pwaPlugin(),
      // GitHub Pages Plugin
      githubPagesPlugin(),
    ],

    // Esbuild options - keep function names for better error stack traces
    // Module workers (new Worker(url, { type: "module" })) bundle as ES modules; the default IIFE format cannot code-split the worker's dependencies.
    worker: {
      format: 'es',
    },
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
      tsconfigPaths: true,
      alias: {
        '@': resolve(import.meta.dirname, 'src'),
      },
      dedupe: ['react', 'react-dom', '@tanstack/react-virtual', 'react-force-graph-2d', 'react-force-graph-3d', 'three', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
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
        'react-force-graph-2d',
        'react-force-graph-3d',
        'three',
        'three-spritetext',
      ],
      exclude: [
        '@bibgraph/client',
        '@bibgraph/utils',
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
