/**
 * Hook for history operations (record visits, clear history)
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import { useCallback } from "react";

import { useNotifications } from "@/contexts/NotificationContext";
import { useStorageProvider } from "@/contexts/storage-provider-context";

import type { RecordPageVisitParams } from "./types";
import { USER_INTERACTIONS_LOGGER_CONTEXT } from "./types";

export interface UseHistoryOperationsParams {
  refreshData: () => Promise<void>;
}

export interface UseHistoryOperationsReturn {
  recordPageVisit: (params: RecordPageVisitParams) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryOperations = ({
  refreshData,
}: UseHistoryOperationsParams): UseHistoryOperationsReturn => {
  const { showNotification } = useNotifications();
  const storageProvider = useStorageProvider();

  const recordPageVisit = useCallback(
    async ({ url, metadata }: RecordPageVisitParams) => {
      try {
        if (!metadata?.entityId || !metadata?.entityType) {
          throw new Error("Entity ID and type are required to record page visit");
        }

        await storageProvider.addToHistory({
          entityType: metadata.entityType as EntityType,
          entityId: metadata.entityId,
          url,
          title: metadata.searchQuery ? `Search: ${metadata.searchQuery}` : undefined,
        });

        await refreshData();
      } catch (error) {
        logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to record page visit", {
          url,
          error,
        });
        throw error;
      }
    },
    [refreshData, storageProvider],
  );

  const clearHistory = useCallback(async () => {
    try {
      await storageProvider.clearHistory();

      showNotification({
        title: "Success",
        message: "History cleared",
        category: "success",
      });

      await refreshData();
    } catch (error) {
      logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to clear history", { error });

      showNotification({
        title: "Error",
        message: `Failed to clear history: ${error instanceof Error ? error.message : "Unknown error"}`,
        category: "error",
      });

      throw error;
    }
  }, [refreshData, showNotification, storageProvider]);

  return {
    recordPageVisit,
    clearHistory,
  };
};
