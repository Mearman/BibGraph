/**
 * Dexie database for persistent app activity storage
 */

import { logger } from "@bibgraph/utils/logger";
import Dexie, { type Table } from "dexie";

import type { AppActivityEvent } from "./types";

export interface StoredAppActivityEvent extends Omit<AppActivityEvent, "id"> {
  id?: number;
}

class AppActivityDB extends Dexie {
  appActivityEvents!: Table<StoredAppActivityEvent, number>;

  constructor() {
    super("app-activity");

    this.version(1).stores({
      appActivityEvents: "++id, type, category, event, timestamp, severity",
    });
  }
}

// Singleton database instance
let dbInstance: AppActivityDB | null = null;

export const getDB = (): AppActivityDB => {
  if (!dbInstance) {
    dbInstance = new AppActivityDB();
  }
  return dbInstance;
};

export const saveEventToDB = async (event: AppActivityEvent): Promise<void> => {
  try {
    await getDB().appActivityEvents.add({
      ...event,
      id: undefined,
    });
  } catch (error) {
    logger.error("ui", "Failed to save event to Dexie", {
      error,
      eventId: event.id,
      component: "AppActivityStore",
    });
  }
};

export const deleteEventsFromDB = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  try {
    await getDB().appActivityEvents.bulkDelete(ids);
  } catch (error) {
    logger.error("ui", "Failed to delete old events from Dexie", {
      error,
      count: ids.length,
      component: "AppActivityStore",
    });
  }
};

export const clearAllEventsFromDB = async (): Promise<void> => {
  try {
    await getDB().appActivityEvents.clear();
  } catch (error) {
    logger.error("ui", "Failed to clear events from Dexie", {
      error,
      component: "AppActivityStore",
    });
  }
};

export const loadEventsFromDB = async (
  limit: number,
): Promise<Record<string, AppActivityEvent>> => {
  try {
    const dbEvents = await getDB()
      .appActivityEvents.orderBy("timestamp")
      .reverse()
      .limit(limit)
      .toArray();

    const events: Record<string, AppActivityEvent> = {};
    dbEvents.forEach((event) => {
      if (event.id !== undefined) {
        const id = event.id.toString();
        events[id] = {
          ...event,
          id,
        };
      }
    });

    return events;
  } catch (error) {
    logger.error("ui", "Failed to load events from Dexie", {
      error,
      component: "AppActivityStore",
    });
    return {};
  }
};
