/**
 * Unit tests for the review label fetcher's retry-queue wrapper: a failed batch must enqueue a hydrate-entities job (so Background Sync or the app-open drain retries it) and still reject, so the screens keep today's degradation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { BackgroundQueueDB } from "@/lib/background-sync/queue-db";

import { withHydrationRetryQueue } from "./label-retry-queue";

const tick = async (): Promise<void> => {
  await Promise.resolve();
};

describe("withHydrationRetryQueue", () => {
  let db: BackgroundQueueDB;

  beforeEach(async () => {
    db = new BackgroundQueueDB();
    await db.open();
    await db.jobs.clear();
  });

  it("returns the fetched labels unchanged on success and queues nothing", async () => {
    const labels = new Map([["W1", { title: "A work", year: 2024 }]]);
    const fetch = vi.fn(async () => {
      await tick();
      return labels;
    });
    const wrapped = withHydrationRetryQueue(db, fetch);

    await expect(wrapped(["W1"])).resolves.toBe(labels);
    expect(await db.jobs.count()).toBe(0);
  });

  it("queues the failed ids and re-rejects, so the surface degrades exactly as before", async () => {
    const fetch = vi.fn(async (): Promise<Map<string, never>> => {
      await tick();
      throw new Error("offline");
    });
    const wrapped = withHydrationRetryQueue(db, fetch);

    await expect(wrapped(["W1", "W2"])).rejects.toThrow("offline");
    const jobs = await db.jobs.toArray();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe("hydrate-entities");
    expect(jobs[0].payload.ids).toEqual(["W1", "W2"]);
  });
});
