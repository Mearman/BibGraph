/**
 * Background Task Executor
 *
 * Unified interface for executing background tasks with pluggable strategies.
 * Automatically falls back to supported strategies if preferred is unavailable.
 */

import { IdleCallbackStrategy } from './idle-strategy';
import { SchedulerStrategy } from './scheduler-strategy';
import type {
  BackgroundStrategy,
  BackgroundTaskExecutorConfig,
  BackgroundTaskOptions,
  BackgroundTaskResult,
  BackgroundTaskStrategy,
  ProgressCallback,
} from './types';
import { isSignalAborted } from './types';
import { WorkerStrategy } from './worker-strategy';

/**
 * Default fallback chain: scheduler -\> idle -\> sync
 */
const DEFAULT_FALLBACK_CHAIN: BackgroundStrategy[] = ['scheduler', 'idle', 'sync'];

/**
 * How often to yield to the main thread while fetching on it, in requests
 */
const YIELD_EVERY_N_REQUESTS = 5;

/**
 * Synchronous strategy for when no background processing is available/wanted
 */
class SyncStrategy implements BackgroundTaskStrategy {
  readonly name = 'sync' as const;

  isSupported(): boolean {
    return true;
  }

  async execute<T>(
    task: () => T | Promise<T>,
    options?: BackgroundTaskOptions
  ): Promise<BackgroundTaskResult<T>> {
    const startTime = performance.now();

    if (options?.signal?.aborted === true) {
      return { success: false, cancelled: true, executionTime: 0 };
    }

    try {
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

    if (options?.signal?.aborted === true) {
      return { success: false, cancelled: true, executionTime: 0 };
    }

    try {
      for (let index = 0; index < items.length; index++) {
        // Via isSignalAborted so this is a fresh expression: an earlier identical check narrows this same readonly property, and TypeScript persists that narrowing across loop iterations even though AbortSignal.aborted is live external state that can flip between them.
        if (isSignalAborted(options?.signal)) {
          return {
            success: false,
            data: results,
            cancelled: true,
            executionTime: performance.now() - startTime,
          };
        }

        results.push(await processor(items[index]));
        options?.onProgress?.(index + 1, items.length);
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
    // No-op for sync strategy
  }
}

/**
 * Background Task Executor
 *
 * Manages strategy selection and provides unified interface for background tasks.
 * @example
 * ```typescript
 * const executor = new BackgroundTaskExecutor({
 *   preferredStrategy: 'idle',
 *   fallbackChain: ['scheduler', 'sync'],
 * });
 *
 * // Execute single task
 * const result = await executor.execute(() => heavyComputation());
 *
 * // Process batch with progress
 * const batchResult = await executor.processBatch(
 *   items,
 *   (item) => processItem(item),
 *   { onProgress: (done, total) => console.log(`${done}/${total}`) }
 * );
 * ```
 */
export class BackgroundTaskExecutor {
  private readonly strategies: Map<BackgroundStrategy, BackgroundTaskStrategy>;
  private activeStrategy: BackgroundTaskStrategy;
  private readonly config: BackgroundTaskExecutorConfig;

  constructor(config?: Partial<BackgroundTaskExecutorConfig>) {
    this.config = {
      preferredStrategy: config?.preferredStrategy ?? 'idle',
      defaultOptions: config?.defaultOptions,
      fallbackChain: config?.fallbackChain ?? DEFAULT_FALLBACK_CHAIN,
    };

    // Initialize all strategies
    this.strategies = new Map<BackgroundStrategy, BackgroundTaskStrategy>([
      ['idle', new IdleCallbackStrategy()],
      ['scheduler', new SchedulerStrategy()],
      ['worker', new WorkerStrategy()],
      ['sync', new SyncStrategy()],
    ]);

    // Select active strategy
    this.activeStrategy = this.selectStrategy(this.config.preferredStrategy);
  }

  /**
   * Select best available strategy
   */
  private selectStrategy(preferred: BackgroundStrategy): BackgroundTaskStrategy {
    // Try preferred first
    const preferredStrategy = this.strategies.get(preferred);
    if (preferredStrategy?.isSupported() === true) {
      return preferredStrategy;
    }

    // Try fallback chain
    for (const fallback of this.config.fallbackChain ?? DEFAULT_FALLBACK_CHAIN) {
      const strategy = this.strategies.get(fallback);
      if (strategy?.isSupported() === true) {
        return strategy;
      }
    }

    // Ultimate fallback: sync
    const syncStrategy = this.strategies.get('sync');
    if (!syncStrategy) {
      throw new Error('Sync strategy not found - this should never happen');
    }
    return syncStrategy;
  }

  /**
   * Get current active strategy name
   */
  get currentStrategy(): BackgroundStrategy {
    return this.activeStrategy.name;
  }

  /**
   * Get all available strategies and their support status
   */
  getStrategies(): { name: BackgroundStrategy; supported: boolean; active: boolean }[] {
    return [...this.strategies].map(([name, strategy]) => ({
      name,
      supported: strategy.isSupported(),
      active: strategy === this.activeStrategy,
    }));
  }

  /**
   * Switch to a different strategy
   * @returns true if switch was successful, false if strategy not supported
   */
  setStrategy(strategy: BackgroundStrategy): boolean {
    const newStrategy = this.strategies.get(strategy);
    if (newStrategy?.isSupported() !== true) {
      return false;
    }
    this.activeStrategy = newStrategy;
    return true;
  }

  /**
   * Execute a single task in the background
   */
  async execute<T>(
    task: () => T | Promise<T>,
    options?: BackgroundTaskOptions
  ): Promise<BackgroundTaskResult<T>> {
    const mergedOptions = { ...this.config.defaultOptions, ...options };
    return this.activeStrategy.execute(task, mergedOptions);
  }

  /**
   * Process items in batches with background scheduling
   */
  async processBatch<T, R>(
    items: readonly T[],
    processor: (item: T) => R | Promise<R>,
    options?: BackgroundTaskOptions & { onProgress?: ProgressCallback }
  ): Promise<BackgroundTaskResult<R[]>> {
    const mergedOptions = { ...this.config.defaultOptions, ...options };
    return this.activeStrategy.processBatch(items, processor, mergedOptions);
  }

  /**
   * Execute batch fetch in worker (only available with worker strategy)
   */
  async fetchBatchInWorker(
    requests: readonly { url: string; options?: RequestInit; id: string }[],
    options?: BackgroundTaskOptions & { onProgress?: ProgressCallback }
  ): Promise<BackgroundTaskResult<Map<string, { success: boolean; data?: unknown; error?: string }>>> {
    const rawStrategy = this.strategies.get('worker');
    const workerStrategy = rawStrategy instanceof WorkerStrategy ? rawStrategy : undefined;

    if (workerStrategy?.isSupported() !== true) {
      // Fallback: execute fetches on main thread with yielding
      const results = new Map<string, { success: boolean; data?: unknown; error?: string }>();
      const startTime = performance.now();

      for (let index = 0; index < requests.length; index++) {
        if (options?.signal?.aborted === true) {
          return {
            success: false,
            data: results,
            cancelled: true,
            executionTime: performance.now() - startTime,
          };
        }

        const request = requests[index];
        try {
          const response = await fetch(request.url, request.options);
          if (response.ok) {
            const data: unknown = await response.json();
            results.set(request.id, { success: true, data });
          } else {
            results.set(request.id, { success: false, error: response.statusText });
          }
        } catch (error) {
          results.set(request.id, {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Yield every YIELD_EVERY_N_REQUESTS requests
        if ((index + 1) % YIELD_EVERY_N_REQUESTS === 0) {
          await new Promise((resolve) => { setTimeout(resolve, 0); });
          options?.onProgress?.(index + 1, requests.length);
        }
      }

      return {
        success: true,
        data: results,
        executionTime: performance.now() - startTime,
      };
    }

    return workerStrategy.fetchBatch(requests, options);
  }

  /**
   * Cancel all pending tasks
   */
  cancelAll(): void {
    this.activeStrategy.cancelAll();
  }

  /**
   * Cleanup resources (call when done with executor)
   */
  dispose(): void {
    this.strategies.forEach((strategy) => {
      strategy.cancelAll();
      if (strategy instanceof WorkerStrategy) {
        strategy.terminate();
      }
    });
  }
}

/**
 * Singleton executor with default configuration
 */
let defaultExecutor: BackgroundTaskExecutor | null = null;

/**
 * Get or create the default background task executor
 */
export const getBackgroundTaskExecutor = (): BackgroundTaskExecutor => {
  defaultExecutor ??= new BackgroundTaskExecutor();
  return defaultExecutor;
};

/**
 * Configure the default executor
 */
export const configureBackgroundTaskExecutor = (config: Partial<BackgroundTaskExecutorConfig>): BackgroundTaskExecutor => {
  if (defaultExecutor) {
    defaultExecutor.dispose();
  }
  defaultExecutor = new BackgroundTaskExecutor(config);
  return defaultExecutor;
};
