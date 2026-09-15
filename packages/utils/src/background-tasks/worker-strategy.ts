/**
 * Web Worker Strategy
 *
 * Executes tasks in a dedicated Web Worker thread.
 * Uses predefined operations for security (no dynamic code evaluation).
 *
 * Best for: API calls and data processing that should happen off main thread
 */

import type {
  BackgroundTaskOptions,
  BackgroundTaskResult,
  BackgroundTaskStrategy,
  ProgressCallback,
} from './types';
import { isSignalAborted } from './types';

/**
Task counter for unique IDs
 */
let taskIdCounter = 0;

/**
Default chunk size for batch processing and progress reporting
 */
const DEFAULT_CHUNK_SIZE = 10;

/**
 * Generate unique task ID
 */
const generateTaskId = (): string => `task_${String(++taskIdCounter)}_${String(Date.now())}`;

/**
 * Worker message types
 */
interface WorkerRequest {
  type: 'fetch-batch' | 'cancel';
  taskId: string;
  payload?: FetchBatchPayload;
}

interface FetchBatchPayload {
  requests: readonly {
    url: string;
    options?: RequestInit;
    id: string;
  }[];
  chunkSize: number;
}

interface WorkerResponse {
  type: 'result' | 'progress' | 'error';
  taskId: string;
  payload?: unknown;
  error?: string;
  progress?: { processed: number; total: number };
}

/**
 * Inline worker script for processing fetch requests
 * Only performs predefined operations - no dynamic code evaluation
 */
const WORKER_SCRIPT = `
  // Track cancelled tasks
  const cancelledTasks = new Set();

  // Handle incoming messages
  self.onmessage = async (event) => {
    const { type, taskId, payload } = event.data;

    switch (type) {
      case 'fetch-batch':
        await handleFetchBatch(taskId, payload);
        break;

      case 'cancel':
        cancelledTasks.add(taskId);
        break;
    }
  };

  async function handleFetchBatch(taskId, payload) {
    const { requests, chunkSize } = payload;
    const results = new Map();

    try {
      for (let i = 0; i < requests.length; i++) {
        // Check for cancellation
        if (cancelledTasks.has(taskId)) {
          cancelledTasks.delete(taskId);
          return;
        }

        const req = requests[i];
        try {
          const response = await fetch(req.url, req.options);
          if (response.ok) {
            const data = await response.json();
            results.set(req.id, { success: true, data });
          } else {
            results.set(req.id, { success: false, error: response.statusText });
          }
        } catch (err) {
          results.set(req.id, { success: false, error: err.message });
        }

        // Report progress every chunk
        if ((i + 1) % chunkSize === 0 || i === requests.length - 1) {
          self.postMessage({
            type: 'progress',
            taskId,
            progress: { processed: i + 1, total: requests.length }
          });
        }
      }

      // Convert Map to object for transfer
      const resultObj = {};
      results.forEach((value, key) => { resultObj[key] = value; });

      self.postMessage({ type: 'result', taskId, payload: resultObj });
    } catch (error) {
      self.postMessage({ type: 'error', taskId, error: error.message });
    }
  }
`;

/**
 * Create inline worker from script string
 */
const createInlineWorker = (): Worker | null => {
  try {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  } catch {
    return null;
  }
};

/**
 * Pending task information
 */
interface PendingTask<T> {
  resolve: (result: BackgroundTaskResult<T>) => void;
  startTime: number;
  onProgress?: ProgressCallback;
}

/**
 * Result of a single fetch in the batch
 */
export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Type guard for a single worker-reported fetch result entry, after it has crossed the structured-clone boundary from the worker's postMessage payload
 */
const isFetchResultEntry = (value: unknown): value is FetchResult<unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('success' in value)) return false;
  return typeof value.success === 'boolean';
};

/**
 * Type guard for the full worker-reported fetch result record
 */
const isFetchResultRecord = (value: unknown): value is Record<string, FetchResult<unknown>> => {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every(isFetchResultEntry);
};

/**
 * Background task strategy using Web Workers
 *
 * This strategy focuses on batch fetch operations which are the primary
 * use case for background processing in the graph auto-population.
 *
 * Pros:
 * - True parallel execution
 * - Completely separate from main thread
 * - Network requests don't block UI at all
 *
 * Cons:
 * - Only supports predefined operations (fetch-batch)
 * - Communication overhead for small tasks
 */
export class WorkerStrategy implements BackgroundTaskStrategy {
  readonly name = 'worker' as const;

  private worker: Worker | null = null;
  private readonly pendingTasks = new Map<string, PendingTask<unknown>>();
  private isTerminated = false;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (this.isTerminated) return;

    this.worker = createInlineWorker();

    if (this.worker) {
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, taskId, payload, error, progress } = event.data;
        const task = this.pendingTasks.get(taskId);

        if (!task) return;

        switch (type) {
          case 'result':
            this.pendingTasks.delete(taskId);
            task.resolve({
              success: true,
              data: payload,
              executionTime: performance.now() - task.startTime,
            });
            break;

          case 'error':
            this.pendingTasks.delete(taskId);
            task.resolve({
              success: false,
              error: new Error(error),
              executionTime: performance.now() - task.startTime,
            });
            break;

          case 'progress':
            if (progress) {
              task.onProgress?.(progress.processed, progress.total);
            }
            break;
        }
      };

      this.worker.onerror = (event) => {
        // Reject all pending tasks
        this.pendingTasks.forEach((task, taskId) => {
          task.resolve({
            success: false,
            error: new Error(`Worker error: ${event.message}`),
            executionTime: performance.now() - task.startTime,
          });
          this.pendingTasks.delete(taskId);
        });
      };
    }
  }

  isSupported(): boolean {
    return typeof Worker !== 'undefined' && this.worker !== null;
  }

  /**
   * Execute a single task - delegates to processBatch for consistency
   * Note: For the worker strategy, single tasks are less efficient than batches
   */
  async execute<T>(
    task: () => T | Promise<T>,
    options?: BackgroundTaskOptions
  ): Promise<BackgroundTaskResult<T>> {
    // Worker strategy doesn't support arbitrary function execution
    // Fall back to running on main thread with yield
    const startTime = performance.now();

    if (options?.signal?.aborted === true) {
      return { success: false, cancelled: true, executionTime: 0 };
    }

    try {
      // Yield to browser first
      await new Promise((resolve) => { setTimeout(resolve, 0); });

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

  /**
   * Process batch - delegates to fetchBatch if items are fetch requests
   * Otherwise falls back to chunked main thread processing
   */
  async processBatch<T, R>(
    items: readonly T[],
    processor: (item: T) => R | Promise<R>,
    options?: BackgroundTaskOptions & { onProgress?: ProgressCallback }
  ): Promise<BackgroundTaskResult<R[]>> {
    // Worker strategy doesn't support arbitrary processors Fall back to chunked main thread processing with yields
    const startTime = performance.now();
    const results: R[] = [];
    const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;

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

        // Yield every chunk
        if ((index + 1) % chunkSize === 0) {
          await new Promise((resolve) => { setTimeout(resolve, 0); });
          options?.onProgress?.(index + 1, items.length);
        }
      }

      options?.onProgress?.(items.length, items.length);

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

  /**
   * Execute batch fetch requests in the worker
   * This is the primary use case for the worker strategy
   * @param requests - Array of fetch requests with IDs
   * @param options - Task options including progress callback
   * @returns Map of request ID to fetch result
   */
  async fetchBatch(
    requests: readonly { url: string; options?: RequestInit; id: string }[],
    options?: BackgroundTaskOptions & { onProgress?: ProgressCallback }
  ): Promise<BackgroundTaskResult<Map<string, FetchResult<unknown>>>> {
    const startTime = performance.now();
    const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;

    if (!this.worker || this.isTerminated) {
      return {
        success: false,
        error: new Error('Worker not available'),
        executionTime: 0,
      };
    }

    if (options?.signal?.aborted === true) {
      return { success: false, cancelled: true, executionTime: 0 };
    }

    const taskId = generateTaskId();
    const worker = this.worker; // Capture for type narrowing

    return new Promise((resolve) => {
      this.pendingTasks.set(taskId, {
        resolve: (result) => {
          // Convert object back to Map, validating the shape reported by the worker across the structured-clone boundary
          if (result.success && result.data !== undefined && isFetchResultRecord(result.data)) {
            const resultMap = new Map<string, FetchResult<unknown>>(Object.entries(result.data));
            resolve({
              ...result,
              data: resultMap,
            });
          } else if (result.success) {
            // Worker reported success but the payload did not match the expected shape
            resolve({
              success: false,
              error: new Error('Worker returned an unexpected result shape'),
              executionTime: result.executionTime,
            });
          } else {
            // Forward the original failure/cancellation; it has no `data` field to convert
            resolve({
              success: false,
              error: result.error,
              cancelled: result.cancelled,
              executionTime: result.executionTime,
            });
          }
        },
        startTime,
        onProgress: options?.onProgress,
      });

      // Handle abort signal
      options?.signal?.addEventListener('abort', () => {
        const pendingTask = this.pendingTasks.get(taskId);
        if (pendingTask) {
          this.pendingTasks.delete(taskId);
          worker.postMessage({ type: 'cancel', taskId });
          resolve({
            success: false,
            cancelled: true,
            executionTime: performance.now() - startTime,
          });
        }
      });

      // Send to worker
      const message: WorkerRequest = {
        type: 'fetch-batch',
        taskId,
        payload: { requests, chunkSize },
      };
      worker.postMessage(message);
    });
  }

  cancelAll(): void {
    this.pendingTasks.forEach((task, taskId) => {
      this.worker?.postMessage({ type: 'cancel', taskId });
      task.resolve({
        success: false,
        cancelled: true,
        executionTime: performance.now() - task.startTime,
      });
    });
    this.pendingTasks.clear();
  }

  /**
   * Terminate the worker (for cleanup)
   */
  terminate(): void {
    this.isTerminated = true;
    this.cancelAll();
    this.worker?.terminate();
    this.worker = null;
  }
}
