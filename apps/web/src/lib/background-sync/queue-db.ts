/**
 * Dexie store for the background job queue (constitution Principle IV: the drain talks to a storage port, implemented here over IndexedDB, so the drain logic itself stays pure and testable). Shared verbatim between the page and the service worker: both origins see the same IndexedDB, so a job enqueued by a failing surface is visible to whichever context drains it.
 */

import Dexie, { type Table } from "dexie";

import type { BackgroundJob, StoredBackgroundJob } from "./queue-schema";

const QUEUE_DB_NAME = "bibgraph-background-queue";

/**
Schema version 1: the jobs table, keyed by job id with the drain's ordering and bookkeeping columns indexed.
 */
const QUEUE_SCHEMA_VERSION = 1;

/**
 * The storage port the drain consumes. nextJobs returns pending jobs oldest first (FIFO by first failure), which is also the order the page and the service worker observe, so both drain paths make progress on the same head.
 */
export interface BackgroundJobStore {
  nextJobs: (limit: number) => Promise<readonly BackgroundJob[]>;
  countJobs: () => Promise<number>;
  deleteJob: (id: string) => Promise<void>;
  recordFailure: (id: string, attempts: number, lastError: string) => Promise<void>;
}

export class BackgroundQueueDB extends Dexie {
  jobs!: Table<StoredBackgroundJob, string>;

  constructor() {
    super(QUEUE_DB_NAME);
    this.version(QUEUE_SCHEMA_VERSION).stores({
      jobs: "id, kind, enqueuedAt, attempts",
    });
  }
}

let databaseInstance: BackgroundQueueDB | null = null;

/**
Singleton accessor: one connection per context (page and worker each hold one).
 */
export const getBackgroundQueueDB = (): BackgroundQueueDB => {
  databaseInstance ??= new BackgroundQueueDB();
  return databaseInstance;
};

/**
The drain's storage port over the Dexie table.
 */
export const createDexieJobStore = (db: BackgroundQueueDB): BackgroundJobStore => ({
  nextJobs: async (limit: number): Promise<readonly BackgroundJob[]> =>
    db.jobs.orderBy("enqueuedAt").limit(limit).toArray(),
  countJobs: async (): Promise<number> => db.jobs.count(),
  deleteJob: async (id: string): Promise<void> => {
    await db.jobs.delete(id);
  },
  recordFailure: async (id: string, attempts: number, lastError: string): Promise<void> => {
    await db.jobs.update(id, { attempts, lastError });
  },
});
