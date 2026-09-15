/**
 * Idle Callback Strategy
 *
 * Executes tasks during browser idle periods using requestIdleCallback.
 * Automatically yields to the main thread for high-priority work like rendering.
 *
 * Best for: Non-urgent background tasks that can be deferred
 */

import type {
  BackgroundTaskOptions,
  BackgroundTaskResult,
  BackgroundTaskStrategy,
  ProgressCallback,
} from './types';
import { isSignalAborted } from './types';

/**
Default time remaining threshold to continue processing (ms)
 */
const MIN_TIME_REMAINING = 1;

/**
Default chunk size for batch processing
 */
const DEFAULT_CHUNK_SIZE = 10;

/**
Fallback timeout for requestIdleCallback (ms)
 */
const IDLE_CALLBACK_TIMEOUT = 1000;

/**
Simulated idle time remaining (ms) when requestIdleCallback is unavailable
 */
const FALLBACK_IDLE_TIME_MS = 50;

/**
 * Polyfill check for requestIdleCallback
 */
const hasIdleCallback = (): boolean => typeof requestIdleCallback === 'function';

/**
 * Promisified requestIdleCallback with timeout
 */
const waitForIdle = async (timeout?: number): Promise<IdleDeadline> => await new Promise((resolve) => {
    if (hasIdleCallback()) {
      requestIdleCallback(resolve, { timeout: timeout ?? IDLE_CALLBACK_TIMEOUT });
    } else {
      // Fallback: simulate idle with setTimeout
      setTimeout(() => {
        resolve({
          didTimeout: true,
          timeRemaining: () => FALLBACK_IDLE_TIME_MS,
        });
      }, 0);
    }
  });

/**
 * Background task strategy using requestIdleCallback
 *
 * Pros:
 * - Browser-native, efficient scheduling
 * - Automatically yields for animations/user input
 * - Good browser support (with fallback)
 *
 * Cons:
 * - May be slow if browser is very busy
 * - Tasks can be significantly delayed
 */
export class IdleCallbackStrategy implements BackgroundTaskStrategy {
  readonly name = 'idle' as const;

  private readonly pendingCallbacks = new Set<number>();
  private aborted = false;

  isSupported(): boolean {
    // Always supported with fallback
    return true;
  }

  async execute<T>(
    task: () => T | Promise<T>,
    options?: BackgroundTaskOptions
  ): Promise<BackgroundTaskResult<T>> {
    const startTime = performance.now();

    // Check for abort signal
    if (options?.signal?.aborted === true) {
      return {
        success: false,
        cancelled: true,
        executionTime: 0,
      };
    }

    try {
      // Wait for idle period
      await waitForIdle(options?.timeout);

      // Check again after waiting -- via isSignalAborted so this is a fresh expression: TypeScript narrows the first check above and then (incorrectly, since AbortSignal.aborted is live external state that can flip during the preceding await) treats a second inline read of the same readonly property as still provably false.
      if (isSignalAborted(options?.signal) || this.aborted) {
        return {
          success: false,
          cancelled: true,
          executionTime: performance.now() - startTime,
        };
      }

      // Execute the task
      const result = await task();

      return {
        success: true,
        data: result,
        executionTime: performance.now() - startTime,
      };
    } catch (error) {
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
    let processed = 0;

    // Check for abort signal
    if (options?.signal?.aborted === true) {
      return {
        success: false,
        cancelled: true,
        executionTime: 0,
      };
    }

    try {
      while (processed < items.length) {
        // Wait for idle period
        const deadline = await waitForIdle(options?.timeout);

        // Check for abort -- Boolean(...) rather than a literal `=== true` comparison, since an earlier check already narrows this same readonly property and TypeScript persists that narrowing across the preceding await even though AbortSignal.aborted is live external state that can flip meanwhile.
        if (isSignalAborted(options?.signal) || this.aborted) {
          return {
            success: false,
            data: results,
            cancelled: true,
            executionTime: performance.now() - startTime,
          };
        }

        // Process items while we have idle time
        const chunkEnd = Math.min(processed + chunkSize, items.length);

        while (processed < chunkEnd && deadline.timeRemaining() > MIN_TIME_REMAINING) {
          const result = await processor(items[processed]);
          results.push(result);
          processed++;

          // Report progress
          options?.onProgress?.(processed, items.length);
        }

        // If we still have items but ran out of time, yield and continue
        if (processed < items.length && deadline.timeRemaining() <= MIN_TIME_REMAINING) {
          // Yield to browser via microtask
          await new Promise((resolve) => { setTimeout(resolve, 0); });
        }
      }

      return {
        success: true,
        data: results,
        executionTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        data: results,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: performance.now() - startTime,
      };
    }
  }

  cancelAll(): void {
    this.aborted = true;
    // Cancel pending callbacks
    this.pendingCallbacks.forEach((id) => {
      if (hasIdleCallback()) {
        cancelIdleCallback(id);
      }
    });
    this.pendingCallbacks.clear();

    // Reset abort flag after a tick
    setTimeout(() => {
      this.aborted = false;
    }, 0);
  }
}
