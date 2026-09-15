/**
 * Scheduler API Strategy
 *
 * Executes tasks using the Scheduler API (scheduler.postTask).
 * Provides priority-based scheduling with explicit priority levels.
 *
 * Best for: Tasks that need priority control and modern browser support
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Scheduler
 */

import type {
  BackgroundTaskOptions,
  BackgroundTaskResult,
  BackgroundTaskStrategy,
  ProgressCallback,
  TaskPriority,
} from './types';

/**
Default chunk size for batch processing
 */
const DEFAULT_CHUNK_SIZE = 10;

/**
 * Combine multiple abort signals into one
 */
const anySignal = (signals: readonly AbortSignal[]): AbortSignal => {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => { controller.abort(); }, { once: true });
  }

  return controller.signal;
};

/**
 * Check whether an abort signal has fired. Wrapped in a function so re-checks inside a loop are not statically narrowed away as "always false" by an earlier check in the same scope.
 */
const isAborted = (signal: AbortSignal): boolean => signal.aborted;

/**
 * Map TaskPriority to Scheduler API priority
 */
const mapPriority = (priority?: TaskPriority): SchedulerPostTaskOptions['priority'] => {
  switch (priority) {
    case 'high':
      return 'user-blocking';
    case 'normal':
      return 'user-visible';
    case 'low':
    case 'background':
    case undefined:
    default:
      return 'background';
  }
};

/**
 * Check if Scheduler API is available
 */
const hasScheduler = (): boolean => typeof window !== 'undefined' && 'scheduler' in window && typeof window.scheduler.postTask === 'function';

/**
 * Background task strategy using the Scheduler API
 *
 * Pros:
 * - Priority-based scheduling
 * - Can interrupt for higher priority tasks
 * - Modern, standards-based API
 *
 * Cons:
 * - Limited browser support (Chrome 94+, Edge 94+)
 * - No Firefox/Safari support yet
 */
export class SchedulerStrategy implements BackgroundTaskStrategy {
  readonly name = 'scheduler' as const;

  private abortController: AbortController | null = null;

  isSupported(): boolean {
    return hasScheduler();
  }

  async execute<T>(
    task: () => T | Promise<T>,
    options?: BackgroundTaskOptions
  ): Promise<BackgroundTaskResult<T>> {
    const startTime = performance.now();

    if (!this.isSupported()) {
      return {
        success: false,
        error: new Error('Scheduler API not supported'),
        executionTime: 0,
      };
    }

    // Check for abort signal
    if (options?.signal?.aborted === true) {
      return {
        success: false,
        cancelled: true,
        executionTime: 0,
      };
    }

    try {
      const scheduler = window.scheduler;

      // scheduler.postTask's native lib.dom typing returns Promise<any>, since it cannot know the callback's return type. Capture the real result in a boxed closure variable instead of trusting postTask's own return value, so no `any` ever crosses into our typed result.
      let outcomeBox: { value: T } | undefined;
      await scheduler.postTask(
        async () => {
          outcomeBox = { value: await task() };
        },
        {
          priority: mapPriority(options?.priority),
          signal: options?.signal,
        }
      );

      if (outcomeBox === undefined) {
        throw new Error('Scheduled task completed without producing a result');
      }

      return {
        success: true,
        data: outcomeBox.value,
        executionTime: performance.now() - startTime,
      };
    } catch (error) {
      // Check if it was an abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          cancelled: true,
          executionTime: performance.now() - startTime,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: performance.now() - startTime,
      };
    }
  }

  async processBatch<T, R>(
    items: readonly T[],
    processor: (item: T) => R | Promise<R>,
    options?: BackgroundTaskOptions & { onProgress?: ProgressCallback }
  ): Promise<BackgroundTaskResult<R[]>> {
    const startTime = performance.now();
    const results: R[] = [];
    const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;

    if (!this.isSupported()) {
      return {
        success: false,
        error: new Error('Scheduler API not supported'),
        executionTime: 0,
      };
    }

    // Create abort controller for this batch
    this.abortController = new AbortController();
    const signal = options?.signal
      ? anySignal([options.signal, this.abortController.signal])
      : this.abortController.signal;

    // Check for abort signal
    if (signal.aborted) {
      return {
        success: false,
        cancelled: true,
        executionTime: 0,
      };
    }

    const scheduler = window.scheduler;

    try {
      for (let index = 0; index < items.length; index += chunkSize) {
        // Check for abort
        if (isAborted(signal)) {
          return {
            success: false,
            data: results,
            cancelled: true,
            executionTime: performance.now() - startTime,
          };
        }

        // Process chunk via scheduler
        const chunk = items.slice(index, index + chunkSize);

        // See the note in execute() above: postTask's native return type is Promise<any>, so the real result is captured via a boxed closure variable rather than trusted from postTask's own return value.
        let chunkResultsBox: { value: R[] } | undefined;
        await scheduler.postTask(
          async () => {
            const chunkRes: R[] = [];
            for (const item of chunk) {
              chunkRes.push(await processor(item));
            }
            chunkResultsBox = { value: chunkRes };
          },
          {
            priority: mapPriority(options?.priority),
            signal,
          }
        );

        if (chunkResultsBox === undefined) {
          throw new Error('Scheduled chunk completed without producing a result');
        }

        results.push(...chunkResultsBox.value);

        // Report progress
        options?.onProgress?.(results.length, items.length);

        // Yield to the main thread between chunks
        await scheduler.yield();
      }

      return {
        success: true,
        data: results,
        executionTime: performance.now() - startTime,
      };
    } catch (error) {
      // Check if it was an abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          data: results,
          cancelled: true,
          executionTime: performance.now() - startTime,
        };
      }

      return {
        success: false,
        data: results,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: performance.now() - startTime,
      };
    } finally {
      this.abortController = null;
    }
  }

  cancelAll(): void {
    this.abortController?.abort();
  }
}
