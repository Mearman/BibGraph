/**
 * The incremental queue drain shared by the service worker's sync handler and the app-open fallback. Resilient to service worker termination by design: jobs run one at a time, and a job's row is deleted only after its runner has resolved (which for hydrate-entities means the fetched entities are already written to the entity cache the page reads), so a kill mid-wake at worst re-runs one job on the next wake. When jobs remain after the wake's bound, requestWake re-registers the sync tag and Chrome fires the event again.
 */

import type { BackgroundJobStore as StorePort } from "./queue-db";
import type { BackgroundJob } from "./queue-schema";

/**
 * Upper bound on jobs processed per wake. Chrome terminates a busy sync handler after tens of seconds; one hydrate-entities job costs at least one batched list request (the client chunks at 100 ids per request) whose retry/backoff under throttling can itself take seconds, so a small cap keeps each wake inside the browser's budget while re-registration drains the rest.
 */
export const MAX_JOBS_PER_WAKE = 3;

/**
 * Attempt cap per queued job. Chrome re-dispatches a failing sync event on its own exponential backoff for at most about 3 days; five attempts spans that window with margin while guaranteeing a permanently failing batch is dropped (its lastError is logged) instead of retrying forever.
 */
export const MAX_JOB_ATTEMPTS = 5;

export interface DrainQueueParams {
  readonly store: StorePort;
  /**
  Runs one job; resolves only after the job's results are persisted.
   */
  readonly runJob: (job: BackgroundJob) => Promise<void>;
  /**
  Re-register the sync tag; false when the platform cannot (the open-page drain).
   */
  readonly requestWake: () => Promise<boolean>;
}

export interface DrainSummary {
  readonly completed: number;
  readonly failed: number;
  readonly dropped: number;
  /**
  Jobs still queued after this wake, failed-but-under-cap ones included.
   */
  readonly remaining: number;
  /**
  Whether a new wake was requested because jobs remained.
   */
  readonly wakeRequested: boolean;
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const drainBackgroundQueue = async ({
  store,
  runJob,
  requestWake,
}: DrainQueueParams): Promise<DrainSummary> => {
  let completed = 0;
  let failed = 0;
  let dropped = 0;

  for (const job of await store.nextJobs(MAX_JOBS_PER_WAKE)) {
    try {
      await runJob(job);
      await store.deleteJob(job.id);
      completed++;
    } catch (error: unknown) {
      failed++;
      const attempts = job.attempts + 1;
      if (attempts >= MAX_JOB_ATTEMPTS) {
        await store.deleteJob(job.id);
        dropped++;
      } else {
        await store.recordFailure(job.id, attempts, errorText(error));
      }
    }
  }

  const remaining = await store.countJobs();
  const wakeRequested = remaining > 0 ? await requestWake() : false;

  return { completed, failed, dropped, remaining, wakeRequested };
};
