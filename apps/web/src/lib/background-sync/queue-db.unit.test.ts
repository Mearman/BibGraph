/**
 * Unit tests for the Dexie-backed background job queue: round-trip through the real store (fake-indexeddb), FIFO ordering through the drain port, and the enqueue-side id merge.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { enqueueHydrationJob } from "./enqueue";
import { BackgroundQueueDB, createDexieJobStore } from "./queue-db";

const ENQUEUED_AT_OLDEST = 100;
const ENQUEUED_AT_MIDDLE = 200;
const ENQUEUED_AT_NEWEST = 300;
const NEXT_JOBS_LIMIT = 2;
const SEEDED_JOB_COUNT = 3;

const seededJob = (
  id: string,
  enqueuedAt: number,
  ids: readonly string[] = [id],
): {
  id: string;
  kind: "hydrate-entities";
  payload: { entityType: "works"; ids: string[] };
  enqueuedAt: number;
  attempts: number;
  lastError: string | null;
} => ({
  id,
  kind: "hydrate-entities",
  payload: { entityType: "works", ids: [...ids] },
  enqueuedAt,
  attempts: 0,
  lastError: null,
});

describe("BackgroundQueueDB store port", () => {
  let db: BackgroundQueueDB;

  beforeEach(async () => {
    db = new BackgroundQueueDB();
    await db.open();
    await db.jobs.clear();
  });

  it("returns pending jobs oldest-first through nextJobs, bounded by the limit", async () => {
    await db.jobs.bulkAdd([
      seededJob("W-newest", ENQUEUED_AT_NEWEST, ["W3"]),
      seededJob("W-oldest", ENQUEUED_AT_OLDEST, ["W1"]),
      seededJob("W-middle", ENQUEUED_AT_MIDDLE, ["W2"]),
    ]);
    const store = createDexieJobStore(db);

    const batch = await store.nextJobs(NEXT_JOBS_LIMIT);
    expect(batch.map((job) => job.payload.ids)).toEqual([["W1"], ["W2"]]);

    const all = await store.nextJobs(SEEDED_JOB_COUNT);
    expect(all).toHaveLength(SEEDED_JOB_COUNT);
    expect(await store.countJobs()).toBe(SEEDED_JOB_COUNT);
  });

  it("records failure bookkeeping and deletes rows through the port", async () => {
    await db.jobs.add(seededJob("W1", ENQUEUED_AT_OLDEST));
    const store = createDexieJobStore(db);

    await store.recordFailure("W1", 1, "offline");
    const [retained] = await store.nextJobs(1);
    expect(retained.attempts).toBe(1);
    expect(retained.lastError).toBe("offline");

    await store.deleteJob("W1");
    expect(await store.countJobs()).toBe(0);
  });
});

describe("enqueueHydrationJob", () => {
  let db: BackgroundQueueDB;

  beforeEach(async () => {
    db = new BackgroundQueueDB();
    await db.open();
    await db.jobs.clear();
  });

  it("round-trips a queued job with its payload and bookkeeping fields", async () => {
    await enqueueHydrationJob(db, "works", ["W2741809807", "W2751009151"]);

    const jobs = await db.jobs.toArray();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe("hydrate-entities");
    expect(jobs[0].payload).toEqual({
      entityType: "works",
      ids: ["W2741809807", "W2751009151"],
    });
    expect(jobs[0].attempts).toBe(0);
    expect(jobs[0].lastError).toBeNull();
    expect(typeof jobs[0].enqueuedAt).toBe("number");
    expect(typeof jobs[0].id).toBe("string");
  });

  it("merges a second enqueue into the pending job instead of adding rows", async () => {
    await enqueueHydrationJob(db, "works", ["W1", "W2"]);
    await enqueueHydrationJob(db, "works", ["W2", "W3"]);

    const jobs = await db.jobs.toArray();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].payload.ids).toEqual(["W1", "W2", "W3"]);
  });

  it("preserves failure bookkeeping when merging into an already-attempted job", async () => {
    await enqueueHydrationJob(db, "works", ["W1"]);
    const seeded = await db.jobs.toArray();
    expect(seeded).toHaveLength(1);
    const first = seeded[0];
    first.attempts = 2;
    first.lastError = "offline";
    await db.jobs.put(first);

    await enqueueHydrationJob(db, "works", ["W2"]);

    const mergedRows = await db.jobs.toArray();
    expect(mergedRows).toHaveLength(1);
    const merged = mergedRows[0];
    expect(merged.payload.ids).toEqual(["W1", "W2"]);
    expect(merged.attempts).toBe(2);
    expect(merged.lastError).toBe("offline");
  });
});
