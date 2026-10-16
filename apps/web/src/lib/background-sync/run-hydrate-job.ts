/**
 * The hydrate-entities runner: one queued job becomes the same batched lookup the failing surface attempted inline (getWorksByIds). The runner resolves only after the shared cached client has written the fetched entities into the IndexedDB entity cache the page reads, which is what lets the drain checkpoint a job by deleting its row. Runs in both the service worker and the open page; the settings store is read first so worker-side requests carry the same politeness email and API key as page-side ones.
 */

import { getWorksByIds, updateOpenAlexApiKey, updateOpenAlexEmail } from "@bibgraph/client";

import { settingsStore } from "@/stores/settings-store";

import type { BackgroundJob } from "./queue-schema";

export const runHydrateJob = async (job: BackgroundJob): Promise<void> => {
  const settings = await settingsStore.getSettings();
  if (settings.politePoolEmail.length > 0) {
    updateOpenAlexEmail(settings.politePoolEmail);
  }
  if (settings.apiKey !== undefined && settings.apiKey.length > 0) {
    updateOpenAlexApiKey(settings.apiKey);
  }

  // Resolves only after the shared cached client wrote the fetched entities into the entity cache (the page reads that cache), which is the drain's checkpoint.
  await getWorksByIds(job.payload.ids);
};
