/**
 * Data Fetcher Component
 *
 * Provides a unified component for data fetching operations with integrated
 * error handling, loading states, and toast notifications. Improves both
 * user experience and developer experience by standardizing common patterns.
 */

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { ErrorBoundary } from "./ErrorBoundary";
import { CardSkeleton, GraphSkeleton, ListSkeleton, StatsSkeleton } from "./LoadingSkeleton";
import { useToast } from "./ToastNotification";

const DEFAULT_SKELETON_ITEM_COUNT = 3;
const DEFAULT_PAGINATION_INITIAL_PAGE = 1;
const DEFAULT_PAGINATION_PER_PAGE = 25;

export interface DataFetcherConfig<T> {
  /**
  Function to fetch data
   */
  fetchFn: () => Promise<T>;
  /**
  Dependencies that should trigger refetch
   */
  deps?: unknown[];
  /**
  Initial data to use before first fetch
   */
  initialData?: T;
  /**
  Whether to fetch on mount
   */
  fetchOnMount?: boolean;
  /**
  Custom error message for display
   */
  errorMessage?: string;
  /**
  Custom loading message
   */
  loadingMessage?: string;
  /**
  Whether to show success toast on fetch
   */
  showSuccessToast?: boolean;
  /**
  Success toast message
   */
  successMessage?: string;
  /**
  Whether to show error toast on failure
   */
  showErrorToast?: boolean;
  /**
  Whether to show retry status in toasts
   */
  showRetryStatus?: boolean;
  /**
  Retry configuration
   */
  retry?: {
    maxAttempts: number;
    delay: number;
    backoffMultiplier?: number;
  };
  /**
  Loading skeleton type
   */
  skeletonType?: "text" | "card" | "list" | "table" | "graph" | "stats";
  /**
  Number of skeleton items to show
   */
  skeletonCount?: number;
  /**
  Custom loading component
   */
  loadingComponent?: ReactNode;
  /**
  Custom error component
   */
  errorComponent?: ReactNode;
  /**
  Custom empty component
   */
  emptyComponent?: ReactNode;
  /**
  Function to determine if data is empty
   */
  isEmpty?: (data: T) => boolean;
}

export interface DataFetcherProps<T> {
  /**
  Configuration object
   */
  config: DataFetcherConfig<T>;
  /**
  Render function with data state
   */
  children: (state: {
    data: T | undefined;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    retryCount: number;
  }) => ReactNode;
}

/**
 * Hook for data fetching with integrated error handling and toasts
 */
export const useDataFetcher = <T,>(config: DataFetcherConfig<T>) => {
  const toast = useToast();
  const [data, setData] = useState<T | undefined>(config.initialData);
  const [loading, setLoading] = useState(config.fetchOnMount ?? true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const executeFetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await config.fetchFn();
      setData(result);

      // Show success toast if enabled
      if (config.showSuccessToast === true && retryCount === 0) {
        toast.success(config.successMessage ?? "Data loaded successfully");
      }

      setRetryCount(0);
      return result;
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error("Unknown error occurred");
      setError(errorObject);

      // Show error toast if enabled
      if (config.showErrorToast === true) {
        toast.error(config.errorMessage ?? errorObject.message);
      }

      // Handle retry logic with enhanced visibility
      if (config.retry && retryCount < config.retry.maxAttempts) {
        const nextRetryCount = retryCount + 1;
        const backoffMultiplier = config.retry.backoffMultiplier ?? 1;
        const delay = config.retry.delay * Math.pow(backoffMultiplier, retryCount);

        setRetryCount(nextRetryCount);

        // Show retry status toast if enabled
        if (config.showRetryStatus === true) {
          const remainingAttempts = config.retry.maxAttempts - nextRetryCount;
          toast.info(
            `Retrying... Attempt ${String(nextRetryCount)} of ${String(config.retry.maxAttempts)} (${String(remainingAttempts)} remaining)`,
            { autoClose: delay }
          );
        }

        setTimeout(() => {
          void executeFetch();
        }, delay);
      } else if (config.retry && retryCount >= config.retry.maxAttempts && config.showErrorToast === true) {
        // Show final failure message when all retries exhausted
        toast.error(
          config.errorMessage ?? `Failed after ${String(config.retry.maxAttempts)} attempts. Please try again later.`
        );
      }

      throw errorObject;
    } finally {
      setLoading(false);
    }
  }, [config, toast, retryCount]);

  const refetch = useCallback(async () => {
    setRetryCount(0);
    await executeFetch();
  }, [executeFetch]);

  // Serialized so the effect depends on the deps array's contents, not its (potentially unstable) reference identity.
  const depsSignature = config.deps ? JSON.stringify(config.deps) : "";

  useEffect(() => {
    if (config.fetchOnMount !== false) {
      void executeFetch();
    }
  }, [executeFetch, config.fetchOnMount, depsSignature]);

  return {
    data,
    loading,
    error,
    refetch,
    retryCount,
  };
};;

/**
 * Data Fetcher Component that provides integrated UI and state management
 */
export const DataFetcher = <T,>({ config, children }: DataFetcherProps<T>) => {
  const { data, loading, error, refetch, retryCount } = useDataFetcher(config);

  // Check if data is empty
  const isEmpty = config.isEmpty ? (data !== undefined && config.isEmpty(data)) : data === undefined;

  // Handle loading state
  if (loading) {
    if (config.loadingComponent !== undefined) {
      return <>{config.loadingComponent}</>;
    }

    const skeletonComponents = {
      card: CardSkeleton,
      list: ListSkeleton,
      graph: GraphSkeleton,
      stats: StatsSkeleton,
      text: ListSkeleton,
      table: ListSkeleton,
    } as const;
    const SkeletonComponent = skeletonComponents[config.skeletonType ?? "card"];

    if (config.skeletonType === "list" || config.skeletonType === "text" || config.skeletonType === "table") {
      return <SkeletonComponent items={config.skeletonCount ?? DEFAULT_SKELETON_ITEM_COUNT} />;
    }
    return <SkeletonComponent />;
  }

  // Handle error state
  if (error && (config.retry?.maxAttempts ?? 0) === 0) {
    if (config.errorComponent !== undefined) {
      return <>{config.errorComponent}</>;
    }

    return (
      <ErrorBoundary
        showRetry={true}
        title="Data Loading Error"
        description={config.errorMessage ?? error.message}
        onError={() => { void refetch(); }}
      >
        <div>Failed to load data</div>
      </ErrorBoundary>
    );
  }

  // Handle empty state
  if (isEmpty && !error && config.emptyComponent !== undefined) {
    return <>{config.emptyComponent}</>;
  }

  // Render children with state
  return <>{children({ data, loading, error, refetch, retryCount })}</>;
};;

/**
 * Specialized fetcher for API responses with count and results
 */
export const usePaginatedFetcher = <T,>(fetchFn: (page?: number, perPage?: number) => Promise<{
    results: T[];
    count: number;
    page?: number;
    perPage?: number;
  }>, options?: {
    initialPage?: number;
    perPage?: number;
    autoFetch?: boolean;
  }) => {
  const [page, setPage] = useState(options?.initialPage ?? DEFAULT_PAGINATION_INITIAL_PAGE);
  const [perPage, setPerPage] = useState(options?.perPage ?? DEFAULT_PAGINATION_PER_PAGE);
  const [pagination, setPagination] = useState<{
    results: T[];
    count: number;
    page?: number;
    perPage?: number;
  }>({
    results: [],
    count: 0,
    page: DEFAULT_PAGINATION_INITIAL_PAGE,
    perPage: DEFAULT_PAGINATION_PER_PAGE,
  });

  const { loading, error, refetch } = useDataFetcher({
    fetchFn: async () => fetchFn(page, perPage),
    deps: [page, perPage],
    fetchOnMount: options?.autoFetch !== false,
    showSuccessToast: false,
    showErrorToast: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchFn(page, perPage);
        setPagination(result);
      } catch {
        // Error handled by useDataFetcher
      }
    };

    if (options?.autoFetch !== false) {
      void loadData();
    }
  }, [page, perPage, fetchFn, options?.autoFetch]);

  const nextPage = () => { setPage((previous) => previous + 1); };
  const previousPage = () => { setPage((previous) => Math.max(1, previous - 1)); };
  const goToPage = (newPage: number) => { setPage(Math.max(1, newPage)); };
  const changePerPage = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page
  };

  return {
    data: pagination.results,
    count: pagination.count,
    page,
    perPage,
    totalPages: Math.ceil(pagination.count / perPage),
    loading,
    error,
    refetch,
    nextPage,
    prevPage: previousPage,
    goToPage,
    changePerPage,
    hasNextPage: page * perPage < pagination.count,
    hasPrevPage: page > 1,
  };
};;

/**
 * Higher-order component for adding data fetching to existing components.
 *
 * `P` is the wrapped component's own props, excluding the fetcher state - `Component` must accept `P` merged with the fetcher state, so the merge below type-checks structurally with no type assertion needed.
 */
export const withDataFetching = <P extends object,>(
  Component: React.ComponentType<P & ReturnType<typeof useDataFetcher<unknown>>>,
  config: DataFetcherConfig<unknown>
) => {
  const WrappedComponent = (properties: Readonly<P>) => {
    return (
      <DataFetcher config={config}>
        {(state) => <Component {...properties} {...state} />}
      </DataFetcher>
    );
  };

  WrappedComponent.displayName = `withDataFetching(${Component.displayName ?? Component.name})`;
  return WrappedComponent;
};;

/**
 * Predefined configurations for common use cases
 */
export const DataFetcherConfigs = {
  /**
  Configuration for entity list fetching
   */
  entityList: {
    skeletonType: "list" as const,
    skeletonCount: 5,
    showSuccessToast: false,
    showErrorToast: true,
    showRetryStatus: true,
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 1.5,
    },
  },

  /**
  Configuration for search results
   */
  search: {
    skeletonType: "card" as const,
    skeletonCount: 6,
    showSuccessToast: false,
    showErrorToast: true,
    showRetryStatus: true,
    errorMessage: "Search failed. Please try again.",
    retry: {
      maxAttempts: 2,
      delay: 800,
      backoffMultiplier: 2,
    },
  },

  /**
  Configuration for entity details
   */
  entityDetails: {
    skeletonType: "card" as const,
    skeletonCount: 1,
    showSuccessToast: false,
    showErrorToast: true,
    showRetryStatus: true,
    retry: {
      maxAttempts: 2,
      delay: 500,
      backoffMultiplier: 1.5,
    },
  },

  /**
  Configuration for graph data
   */
  graphData: {
    skeletonType: "graph" as const,
    skeletonCount: 1,
    showSuccessToast: true,
    successMessage: "Graph data loaded successfully",
    showErrorToast: true,
    showRetryStatus: true,
    retry: {
      maxAttempts: 2,
      delay: 2000,
      backoffMultiplier: 1.2,
    },
  },
} as const;

