 
import { cachedOpenAlex } from "@bibgraph/client";
import { DexieStorageProvider } from "@bibgraph/utils";
import { logger,setupGlobalErrorHandling } from "@bibgraph/utils/logger";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import posthog from "posthog-js";
import { createRoot } from "react-dom/client";

import { PostHogProvider } from "@/components/PostHogProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { StorageProviderWrapper } from "@/contexts/storage-provider-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { AppActivityProvider } from "@/stores/app-activity";
import { LayoutProvider } from "@/stores/layout-store";
import { initWebVitals } from "@/utils/web-vitals";

import { routeTree } from "./routeTree.gen";
import { initializeNetworkMonitoring } from "./services/network-interceptor";

// Fix URL display issues immediately when page loads
// This runs before React mounts to fix browser address bar display
if (typeof window !== "undefined") {
  const currentHash = window.location.hash;

  logger.debug("routing", "main.tsx URL processing started", {
    currentHash,
    href: window.location.href
  });

  if (currentHash && currentHash !== "#") {
    let fixedHash = currentHash;
    let needsUpdate = false;

    // First, fix double hash issue (##/... should become #/...)
    if (currentHash.startsWith("##")) {
      fixedHash = "#" + currentHash.slice(2);
      needsUpdate = true;
      logger.debug("routing", "Fixed double hash:", { original: currentHash, clean: fixedHash });
    }

    // Only decode regular URLs, not external canonical IDs - let usePrettyUrl hook handle those
    // This prevents routing interference while still allowing pretty URL display via React hooks
    if (!needsUpdate && currentHash.includes("%")) {
      const hashParts = fixedHash.split("/");
      const entityType = hashParts[1]; // works, authors, institutions, etc.
      const encodedId = hashParts.slice(2).join("/"); // Join the rest with slashes

      // Only decode if this is NOT an external canonical ID URL pattern
      // External canonical IDs will be handled by the usePrettyUrl hook in React components
      if (entityType && encodedId && !/^(?:https?%3A%2F%2F|orcid%3A|ror%3A|doi%3A)/i.test(encodedId)) {
        try {
          const decodedId = decodeURIComponent(encodedId);

          // Only update if the decoded version is different and contains protocols
          if (decodedId !== encodedId && (decodedId.includes("://") || decodedId.includes(":/"))) {
            const hashQueryParams = currentHash.includes("?")
              ? "?" + currentHash.split("?").slice(1).join("?")
              : "";

            fixedHash = `#/${entityType}/${decodedId}${hashQueryParams}`;
            needsUpdate = true;

            logger.debug("routing", "Converting encoded URL to pretty URL:", {
              original: currentHash,
              fixed: fixedHash,
              encodedId,
              decodedId
            });
          }
        } catch (error) {
          // If decoding fails, continue with normal processing
          logger.debug("routing", "Failed to decode URL:", { error, encodedId });
        }
      }
      // Skip processing external canonical IDs here - let React hooks handle pretty URL display
    }

    // Check for collapsed protocol slashes in the (potentially updated) hash
    if (!needsUpdate) {
      const collapsedPattern = /https?:\/[^/]/;
      if (collapsedPattern.test(fixedHash)) {
        // Fix collapsed patterns in the hash portion only
        fixedHash = fixedHash
          .replaceAll(/https?:\/(?!\/)/g, 'https://')
          .replaceAll(/http?:\/(?!\/)/g, 'http://')
          .replaceAll(/ror:\/(?!\/)/g, 'ror://');

        needsUpdate = true;

        logger.debug("routing", "Fixing collapsed URL display in hash:", {
          original: currentHash,
          fixed: fixedHash
        });
      }
    }

    // Apply the update if needed
    if (needsUpdate && fixedHash !== currentHash) {
      // Ensure we have a single hash, not double hash
      const cleanHash = fixedHash.startsWith("#") ? fixedHash : "#" + fixedHash;
      const newUrl = window.location.pathname + window.location.search + cleanHash;

      logger.debug("routing", "Applying URL fix:", {
        original: currentHash,
        fixed: fixedHash,
        clean: cleanHash,
        final: newUrl
      });

      // Use history.replaceState to update URL without page reload
      window.history.replaceState(window.history.state, "", newUrl);

      logger.debug("routing", "URL fix applied, new location:", {
        href: window.location.href,
        hash: window.location.hash
      });
    } else {
      logger.debug("routing", "No URL fix needed:", {
        currentHash,
        needsUpdate
      });
    }
  } else {
    logger.debug("routing", "No hash to process");
  }
}

// Add a persistent URL fixer that runs after page load
// This catches any URL issues that weren't handled by the initial fix
if (typeof window !== "undefined") {
  const fixUrlDisplay = () => {
    const currentHash = window.location.hash;
    if (!currentHash || currentHash === "#") return;

    let needsUpdate = false;
    let fixedHash = currentHash;

    // Fix double hash
    if (currentHash.startsWith("##")) {
      fixedHash = "#" + currentHash.slice(2);
      needsUpdate = true;
    }

    // Fix collapsed protocol slashes
    const collapsedPattern = /(?:^|\/)https?:\/[^/]/;
    if (collapsedPattern.test(fixedHash)) {
      fixedHash = fixedHash.replace(/(^|\/)https?:\/([^/])/, '$1https://$2');
      needsUpdate = true;
    }

    // Apply fix if needed
    if (needsUpdate && fixedHash !== currentHash) {
      const newUrl = window.location.pathname + window.location.search + fixedHash;
      window.history.replaceState(window.history.state, "", newUrl);
      logger.debug("routing", "URL fix applied:", { original: currentHash, fixed: fixedHash });
    }
  };

  // Run immediately and then periodically for the first few seconds
  setTimeout(fixUrlDisplay, 100);
  setTimeout(fixUrlDisplay, 500);
  setTimeout(fixUrlDisplay, 1000);
  setTimeout(fixUrlDisplay, 2000);
}

// Import Mantine core styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

// Import { registerOpenAlexServiceWorker } from "@/lib/service-worker";


// Initialize global error handling, network monitoring, and performance tracking
setupGlobalErrorHandling(logger);
initializeNetworkMonitoring();
initWebVitals();

// Configure static cache URL for deployed environments
// Works for both GitHub Pages (mearman.github.io) and custom domain (bibgraph.com)
const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'mearman.github.io' ||
  window.location.hostname === 'bibgraph.com' ||
  window.location.hostname.endsWith('.github.io')
);
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

if (isProduction) {
  cachedOpenAlex.setStaticCacheGitHubPagesUrl(
    "https://mearman.github.io/BibGraph/data/openalex/"
  );
  logger.debug("main", "Configured production static cache URL");
} else if (isLocalhost) {
  // Configure local static cache for dev server and E2E preview server
  // This enables the static cache tier to use committed cache files
  // Dev: served from public/data/openalex/ via Vite
  // E2E preview: served from dist/data/openalex/ via vite preview
  cachedOpenAlex.setStaticCacheGitHubPagesUrl("/data/openalex/");
  logger.debug("main", "Configured local static cache URL for development/E2E");
}

// Create QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
    },
  },
});

// Create a new router instance with hash-based history for GitHub Pages
const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Navigation tracking is now handled by NavigationTracker component in MainLayout

// App activity events will be loaded by the AppActivityProvider

// Service worker registration handled by VitePWA plugin
// registerOpenAlexServiceWorker().then((registered) => {
//   if (registered) {
//     // Service worker registered successfully - API requests will be intercepted
//   }
// }).catch((error) => {
//   // Failed to register OpenAlex Service Worker - will fall back to direct API calls
//   void error; // Suppress unused variable warning
// });

// Create and initialize storage provider
const storageProvider = new DexieStorageProvider(logger);

// Initialize special system lists (Bookmarks, History) before app starts
storageProvider.initializeSpecialLists().catch((error) => {
  logger.error("main", "Failed to initialize special lists", { error });
});

// Initialize OpenAlex client with settings from storage
(async () => {
  try {
    const { settingsStoreInstance } = await import("@/stores/settings-store");
    const { updateOpenAlexEmail, updateOpenAlexApiKey } = await import("@bibgraph/client");

    const settings = await settingsStoreInstance.getSettings();

    if (settings.politePoolEmail) {
      updateOpenAlexEmail(settings.politePoolEmail);
      logger.debug("main", "Initialized OpenAlex client with email from settings");
    }

    if (settings.apiKey) {
      updateOpenAlexApiKey(settings.apiKey);
      logger.debug("main", "Initialized OpenAlex client with API key from settings");
    }
  } catch (error) {
    logger.error("main", "Failed to initialize OpenAlex client with settings", { error });
  }
})();

const rootElementOrNull = document.querySelector("#root");
if (!rootElementOrNull || !(rootElementOrNull instanceof HTMLElement)) {
  throw new TypeError("Root element not found or is not an HTMLElement");
}
const rootElement = rootElementOrNull;

/**
 * React 19 error handlers for PostHog error tracking
 * These callbacks capture errors at different stages of React's error handling
 */
const reactErrorHandlers = {
  // Callback for errors not caught by an ErrorBoundary
  onUncaughtError: (error: unknown, errorInfo: { componentStack?: string }) => {
    logger.error("react", "Uncaught error in React component", {
      error,
      componentStack: errorInfo.componentStack,
    });

    // Send to PostHog if initialized
    if (posthog.__loaded) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)), {
        error_type: 'uncaught_react_error',
        component_stack: errorInfo.componentStack,
      });
    }
  },

  // Callback for errors caught by an ErrorBoundary
  onCaughtError: (error: unknown, errorInfo: { componentStack?: string }) => {
    logger.warn("react", "Error caught by ErrorBoundary", {
      error,
      componentStack: errorInfo.componentStack,
    });

    // Send to PostHog if initialized
    if (posthog.__loaded) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)), {
        error_type: 'caught_react_error',
        component_stack: errorInfo.componentStack,
      });
    }
  },

  // Callback for errors React automatically recovers from
  onRecoverableError: (error: unknown, errorInfo: { componentStack?: string }) => {
    logger.debug("react", "Recoverable React error", {
      error,
      componentStack: errorInfo.componentStack,
    });

    // Send to PostHog if initialized (with lower priority)
    if (posthog.__loaded) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)), {
        error_type: 'recoverable_react_error',
        component_stack: errorInfo.componentStack,
      });
    }
  },
};

createRoot(rootElement, reactErrorHandlers).render(
  <QueryClientProvider client={queryClient}>
    <PostHogProvider>
      <ThemeProvider>
        <ModalsProvider>
          <Notifications />
          <StorageProviderWrapper provider={storageProvider}>
            <LayoutProvider>
              <AppActivityProvider>
                <ErrorBoundary
                  title="Application Error"
                  description="Something went wrong while loading the application. Please try again."
                  showRetry={true}
                  showDetails={process.env.NODE_ENV === 'development'}
                  onError={(error, errorInfo, errorId) => {
                    logger.error('main', 'Application error caught by ErrorBoundary', {
                      errorId,
                      error: error.message,
                      stack: error.stack,
                      componentStack: errorInfo?.componentStack,
                    });
                  }}
                >
                  <RouterProvider router={router} />
                </ErrorBoundary>
              </AppActivityProvider>
            </LayoutProvider>
          </StorageProviderWrapper>
        </ModalsProvider>
      </ThemeProvider>
    </PostHogProvider>
  </QueryClientProvider>,
);
