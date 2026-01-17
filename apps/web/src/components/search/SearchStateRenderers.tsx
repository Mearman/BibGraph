/**
 * Search state renderer components (empty, loading, error, no results)
 */
import { ErrorRecovery, SearchEmptyState } from "@bibgraph/ui";

import { SearchResultsSkeleton } from "./SearchResultsSkeleton";

interface EmptyStateProps {
  onQuickSearch?: (query: string) => void;
}

export const SearchEmptyStateRenderer = ({ onQuickSearch }: EmptyStateProps) => (
  <SearchEmptyState
    variant="initial"
    onQuickSearch={onQuickSearch}
  />
);

export const SearchLoadingStateRenderer = () => (
  <SearchResultsSkeleton
    viewType="table"
    items={8}
    title="Searching OpenAlex database..."
  />
);

interface ErrorStateProps {
  error: unknown;
  onRetry: () => void;
  onRetryWithExponentialBackoff: () => void;
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
}

export const SearchErrorStateRenderer = ({
  error,
  onRetry,
  onRetryWithExponentialBackoff,
  retryCount,
  maxRetries,
  isRetrying,
}: ErrorStateProps) => (
  <ErrorRecovery
    error={error}
    onRetry={onRetry}
    onRetryWithExponentialBackoff={onRetryWithExponentialBackoff}
    retryCount={retryCount}
    maxRetries={maxRetries}
    isRetrying={isRetrying}
    context={{
      operation: "Search Academic Database",
      entity: "OpenAlex Search"
    }}
  />
);

interface NoResultsStateProps {
  query: string;
  onQuickSearch?: (query: string) => void;
}

export const SearchNoResultsStateRenderer = ({ query, onQuickSearch }: NoResultsStateProps) => (
  <SearchEmptyState
    variant="no-results"
    query={query}
    onQuickSearch={onQuickSearch}
  />
);
