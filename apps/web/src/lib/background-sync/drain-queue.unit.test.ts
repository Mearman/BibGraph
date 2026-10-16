/**
 * Unit tests for the incremental queue drain: the checkpoint-and-reregister loop the service worker's sync handler and the page-open fallback both run.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { drainBackgroundQueue, MAX_JOB_ATTEMPTS, MAX_JOBS_PER_WAKE } from "./drain-queue";
import type { BackgroundJobStore } from "./queue-db";
import { BACKGROUND_SYNC_TAG } from "./queue-schema";

const ENQUEUED_AT_OLDEST = 100;
const ENQUEUED_AT_MIDDLE = 200;
const ENQUEUED_AT_NEWEST = 300;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * The repo's lint rules require every async function to await something (require-await) and every promise-returning function to be async (promise-function-async), so the in-memory fakes below tick one microtask before returning plain values.
 */
const tick = async (): Promise<void> => {
  await Promise.resolve();
};

/**
 * In-memory job store implementing the drain port, recording the read order so the tests can assert FIFO drain ordering.
 */
interface MemoryJobStore extends BackgroundJobStore {
  addJob: (id: string, enqueuedAt: number, ids?: readonly string[]) => Promise<void>;
  job: (id: string) => Promise<{ attempts: number; lastError: string | null } | undefined>;
}

const makeStore = (): MemoryJobStore => {
  const jobs = new Map<string, {
    id: string;
    kind: "hydrate-entities";
    payload: { entityType: "works"; ids: string[] };
    enqueuedAt: number;
    attempts: number;
    lastError: string | null;
  }>();
  return {
    nextJobs: async (limit: number) => {
      await tick();
      return [...jobs.values()].sort((a, b) => a.enqueuedAt - b.enqueuedAt).slice(0, limit);
    },
    countJobs: async () => {
      await tick();
      return jobs.size;
    },
    deleteJob: async (id: string) => {
      await tick();
      jobs.delete(id);
    },
    recordFailure: async (id: string, attempts: number, lastError: string) => {
      await tick();
      const job = jobs.get(id);
      if (job === undefined) {
        throw new Error(`recordFailure for absent job ${id}`);
      }
      job.attempts = attempts;
      job.lastError = lastError;
    },
    addJob: async (id: string, enqueuedAt: number, ids: readonly string[] = [id]) => {
      await tick();
      jobs.set(id, {
        id,
        kind: "hydrate-entities",
        payload: { entityType: "works", ids: [...ids] },
        enqueuedAt,
        attempts: 0,
        lastError: null,
      });
    },
    job: async (id: string) => {
      await tick();
      const job = jobs.get(id);
      return job === undefined ? undefined : { attempts: job.attempts, lastError: job.lastError };
    },
  };
};

describe("drainBackgroundQueue", () => {
  let store: MemoryJobStore;

  beforeEach(() => {
    store = makeStore();
  });

  it("drains jobs oldest-first, completing and deleting each in order", async () => {
    await store.addJob("W-newest", ENQUEUED_AT_NEWEST, ["W3"]);
    await store.addJob("W-oldest", ENQUEUED_AT_OLDEST, ["W1"]);
    await store.addJob("W-middle", ENQUEUED_AT_MIDDLE, ["W2"]);

    let runnerResolved = false;
    const runJob = vi.fn(
      async (_job: { payload: { ids: readonly string[] } }): Promise<void> => {
        await sleep(1);
        runnerResolved = true;
      },
    );
    const requestWake = vi.fn(async () => {
      await tick();
      return true;
    });

    const summary = await drainBackgroundQueue({ store, runJob, requestWake });

    expect(runJob.mock.calls.map(([job]) => job.payload.ids)).toEqual([["W1"], ["W2"], ["W3"]]);
    expect(runnerResolved).toBe(true);
    expect(summary).toMatchObject({ completed: 3, failed: 0, dropped: 0, remaining: 0 });
    expect(await store.countJobs()).toBe(0);
    expect(requestWake).not.toHaveBeenCalled();
  });

  it("keeps a failed job with attempts and lastError instead of deleting it", async () => {
    await store.addJob("W-good", ENQUEUED_AT_OLDEST);
    await store.addJob("W-bad", ENQUEUED_AT_MIDDLE);

    const runJob = vi.fn(async (job: Readonly<{ id: string }>): Promise<void> => {
      await tick();
      if (job.id === "W-bad") {
        throw new Error("network unavailable");
      }
    });

    const summary = await drainBackgroundQueue({
      store,
      runJob,
      requestWake: vi.fn(async () => {
        await tick();
        return true;
      }),
    });

    expect(summary).toMatchObject({ completed: 1, failed: 1, dropped: 0, remaining: 1 });
    expect(await store.job("W-bad")).toEqual({ attempts: 1, lastError: "network unavailable" });
  });

  it("drops a job after the attempt cap instead of retrying forever", async () => {
    await store.addJob("W-doomed", ENQUEUED_AT_OLDEST);

    let attemptsSeen = 0;
    const runOnce = vi.fn(async (): Promise<void> => {
      await tick();
      attemptsSeen++;
      throw new Error("still offline");
    });

    // Drain repeatedly, as repeated sync wakes would, until the cap drops the job.
    let dropped = 0;
    while (dropped === 0 && attemptsSeen <= MAX_JOB_ATTEMPTS) {
      const summary = await drainBackgroundQueue({
        store,
        runJob: runOnce,
        requestWake: vi.fn(async () => {
          await tick();
          return true;
        }),
      });
      dropped = summary.dropped;
    }

    // The cap dropped the job on exactly the MAX_JOB_ATTEMPTS-th run, and no row remains.
    expect(attemptsSeen).toBe(MAX_JOB_ATTEMPTS);
    expect(dropped).toBe(1);
    expect(await store.countJobs()).toBe(0);
  });

  it("bounds one wake to MAX_JOBS_PER_WAKE jobs and requests another wake while jobs remain", async () => {
    const enqueued: number[] = [];
    for (let index = 0; index < MAX_JOBS_PER_WAKE + 2; index++) {
      enqueued.push(index);
    }
    for (const at of enqueued) {
      await store.addJob(`W${String(at)}`, at);
    }

    const runJob = vi.fn(async (): Promise<void> => {
      await tick();
    });
    const requestWake = vi.fn(async () => {
      await tick();
      return true;
    });

    const summary = await drainBackgroundQueue({ store, runJob, requestWake });

    expect(runJob).toHaveBeenCalledTimes(MAX_JOBS_PER_WAKE);
    expect(summary).toMatchObject({ completed: MAX_JOBS_PER_WAKE, remaining: 2 });
    expect(requestWake).toHaveBeenCalledTimes(1);
  });

  it("does not request a wake when the queue empties within the wake", async () => {
    for (let index = 0; index < MAX_JOBS_PER_WAKE; index++) {
      await store.addJob(`W${String(index)}`, index);
    }

    const requestWake = vi.fn(async () => {
      await tick();
      return true;
    });
    await drainBackgroundQueue({
      store,
      runJob: vi.fn(async () => {
        await tick();
      }),
      requestWake,
    });

    expect(requestWake).not.toHaveBeenCalled();
  });

  it("wakes with the shared sync tag", () => {
    expect(BACKGROUND_SYNC_TAG).toBe("bibgraph-queue");
  });
});
