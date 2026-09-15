/**
 * FieldDisplay component - displays entity field values with on-demand fetching
 * Shows cached values or clickable placeholders for missing data
 */

import { logger } from "@bibgraph/utils";
import { ActionIcon, Group, Skeleton, Text, Tooltip } from "@mantine/core";
import { IconClick,IconRefresh } from "@tabler/icons-react";
import React, { useState } from "react";

import type { CacheKeyType } from "@/config/cache";
import { ICON_SIZE, TEXT } from "@/config/style-constants";
import { useFieldFetch } from "@/hooks/use-field-fetch";

interface FieldDisplayProperties {
  label: string;
  value: unknown;
  fieldName: string;
  entityId: string;
  entityType: CacheKeyType;
  onDataFetched?: (data: unknown) => void;
  formatter?: (value: unknown) => React.ReactNode;
}

/**
 * Checks if a value is considered "empty" (undefined, null, empty string, empty array)
 */
const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

/**
 * Checks whether a value is a plain (non-array) object, narrowing it to an indexable record
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Default formatter for field values
 */
const defaultFormatter = (value: unknown): React.ReactNode => {
  if (isEmpty(value)) return null;

  // Handle arrays
  if (Array.isArray(value)) {
    return value.length > 0 ? `${String(value.length)} items` : null;
  }

  // Handle objects
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }

  // Handle primitives
  return String(value);
};

export const FieldDisplay: React.FC<FieldDisplayProperties> = ({
  label,
  value,
  fieldName,
  entityId,
  entityType,
  onDataFetched,
  formatter = defaultFormatter,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [hasBeenFetched, setHasBeenFetched] = useState(() => !isEmpty(value));

  const { fetchField, isFetching } = useFieldFetch({
    entityId,
    entityType,
    onSuccess: (data: unknown) => {
      logger.debug("ui", "[FieldDisplay] Field data fetched", {
        fieldName,
        entityId,
        entityType,
        hasData: isRecord(data) && fieldName in data
      });
      // Extract the fetched field from the response
      const fetchedValue = isRecord(data) ? data[fieldName] : undefined;
      setCurrentValue(fetchedValue);
      setHasBeenFetched(true);

      if (onDataFetched) {
        logger.debug("ui", "[FieldDisplay] Triggering onDataFetched callback", {
          fieldName,
          dataSize: JSON.stringify(data).length
        });
        onDataFetched(data);
      }
    },
  });

  const handleFetchClick = async () => {
    logger.debug("ui", "[FieldDisplay] Fetch button clicked", {
      fieldName,
      entityId,
      entityType
    });
    await fetchField(fieldName);
  };

  const hasValue = !isEmpty(currentValue);

  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="sm" fw={500} style={{ minWidth: TEXT.LABEL_MIN_WIDTH }}>
        {label}:
      </Text>

      {isFetching ? (
        <Skeleton height={20} width="100%" />
      ) : (hasValue ? (
        <Text size="sm" flex={1} style={{ wordBreak: "break-word" }}>
          {formatter(currentValue)}
        </Text>
      ) : (
        <Group gap="xs" flex={1}>
          <Text size="sm" c="dimmed" fs="italic">
            {hasBeenFetched ? "No data" : "Not loaded"}
          </Text>
          {!hasBeenFetched && (
            <Tooltip label={`Click to fetch ${label.toLowerCase()}`}>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={() => { void handleFetchClick(); }}
                loading={isFetching}
                aria-label={`Fetch ${label.toLowerCase()}`}
              >
                <IconClick size={ICON_SIZE.XS} />
              </ActionIcon>
            </Tooltip>
          )}
          {hasBeenFetched && (
            <Tooltip label="Retry fetch">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => { void handleFetchClick(); }}
                loading={isFetching}
                aria-label={`Retry fetching ${label.toLowerCase()}`}
              >
                <IconRefresh size={ICON_SIZE.XS} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ))}
    </Group>
  );
};
