import { type ComponentType, type ReactNode } from "react"

export interface DataStateProps<T = unknown> {
  loading: boolean
  error: Error | null
  data: T | null
  loadingMessage?: string
  errorMessage?: string
  emptyMessage?: string
  children: (data: T) => ReactNode
  onRetry?: () => void
  LoadingComponent?: ComponentType<{ message?: string }>
  ErrorComponent?: ComponentType<{ error: Error; message?: string; onRetry?: () => void }>
  EmptyComponent?: ComponentType<{ message?: string }>
}

export const DataState = <T,>({
  loading,
  error,
  data,
  loadingMessage = "Loading...",
  errorMessage = "An error occurred",
  emptyMessage = "No data available",
  children,
  onRetry,
  LoadingComponent,
  ErrorComponent,
  EmptyComponent,
}: DataStateProps<T>) => {
  if (loading) {
    if (LoadingComponent) {
      return <LoadingComponent message={loadingMessage} />
    }
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">{loadingMessage}</div>
      </div>
    )
  }

  if (error) {
    if (ErrorComponent) {
      return <ErrorComponent error={error} message={errorMessage} onRetry={onRetry} />
    }
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-red-500 mb-4">{errorMessage}</div>
        <div className="text-sm text-gray-600 mb-4">{error.message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (data === null) {
    if (EmptyComponent) {
      return <EmptyComponent message={emptyMessage} />
    }
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">{emptyMessage}</div>
      </div>
    )
  }

  return <>{children(data)}</>
};