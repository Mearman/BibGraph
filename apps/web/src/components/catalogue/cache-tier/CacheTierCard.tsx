/**
 * Cache Tier Card component for displaying local cache tier information
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconRefresh, IconTrash } from "@tabler/icons-react";
import React from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

import { formatBytes, generateTestId, groupByEntityType } from "./cache-tier-utils";
import { EntityTypeBreakdown } from "./EntityTypeBreakdown";

const DEFAULT_MAX_ENTRIES = 10_000;
const WARNING_USAGE_THRESHOLD = 60;
const CRITICAL_USAGE_THRESHOLD = 80;
const USAGE_PERCENT_MULTIPLIER = 100;
const USAGE_PERCENT_MAX = 100;

interface StatCardProperties {
  label: string;
  value: string;
}

const StatCard = ({ label, value }: StatCardProperties) => (
  <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
    <Text size="xs" c="dimmed" fw={500}>{label}</Text>
    <Text size="lg" fw={700}>{value}</Text>
  </Paper>
);

interface CacheStatsProperties {
  entityCount: number;
  totalSize: number;
  entityTypeCount: number;
  usagePercent: number;
}

const CacheStats = ({ entityCount, totalSize, entityTypeCount, usagePercent }: CacheStatsProperties) => (
  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
    <StatCard label="Entities" value={entityCount.toLocaleString()} />
    <StatCard label="Total Size" value={formatBytes(totalSize)} />
    <StatCard label="Entity Types" value={entityTypeCount.toString()} />
    <StatCard label="Usage" value={`${usagePercent.toFixed(1)}%`} />
  </SimpleGrid>
);

interface UsageBarProperties {
  entityCount: number;
  maxEntries: number;
  usagePercent: number;
}

const UsageBar = ({ entityCount, maxEntries, usagePercent }: UsageBarProperties) => {
  const getUsageColor = () => {
    if (usagePercent > CRITICAL_USAGE_THRESHOLD) return "red";
    if (usagePercent > WARNING_USAGE_THRESHOLD) return "yellow";
    return "blue";
  };

  return (
    <div>
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed">Cache Usage</Text>
        <Text size="xs" c="dimmed">
          {entityCount.toLocaleString()} / {maxEntries.toLocaleString()}
        </Text>
      </Group>
      <Progress value={usagePercent} color={getUsageColor()} size="sm" />
    </div>
  );
};

const LoadingState = () => (
  <Stack align="center" py="xl">
    <Loader size="sm" />
    <Text size="xs" c="dimmed">Loading cache data...</Text>
  </Stack>
);

const EmptyState = () => (
  <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" bg="gray.0">
    <Text size="sm" c="dimmed" ta="center">
      No entities cached in this tier
    </Text>
  </Paper>
);

interface CacheTierHeaderProperties {
  title: string;
  description: string;
  icon: React.ReactNode;
  isPersistent: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onClear?: () => void;
  hasEntities: boolean;
}

const CacheTierHeader = ({
  title,
  description,
  icon,
  isPersistent,
  isLoading,
  onRefresh,
  onClear,
  hasEntities,
}: CacheTierHeaderProperties) => (
  <Group justify="space-between" mb="md">
    <Group>
      <ThemeIcon size="lg" variant="light" color={isPersistent ? "blue" : "orange"}>
        {icon}
      </ThemeIcon>
      <div>
        <Text fw={500} size="lg">{title}</Text>
        <Text size="xs" c="dimmed">{description}</Text>
      </div>
    </Group>
    <Group gap="xs">
      <Badge size="xs" color={isPersistent ? "blue" : "orange"} variant="light">
        {isPersistent ? "Persistent" : "Session Only"}
      </Badge>
      <Tooltip label="Refresh">
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={onRefresh}
          loading={isLoading}
          aria-label={`Refresh ${title} cache`}
        >
          <IconRefresh size={ICON_SIZE.SM} />
        </ActionIcon>
      </Tooltip>
      {onClear && hasEntities && (
        <Tooltip label="Clear cache tier">
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={onClear}
            aria-label={`Clear ${title} cache`}
          >
            <IconTrash size={ICON_SIZE.SM} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  </Group>
);

interface CacheTierCardProperties {
  title: string;
  description: string;
  icon: React.ReactNode;
  entities: CachedEntityEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  onClear?: () => void;
  isPersistent: boolean;
  maxEntries?: number;
}

/**
 * Displays a cache tier card with stats, entity breakdown, and actions
 */
export const CacheTierCard = ({
  title,
  description,
  icon,
  entities,
  isLoading,
  onRefresh,
  onClear,
  isPersistent,
  maxEntries = DEFAULT_MAX_ENTRIES,
}: CacheTierCardProperties) => {
  const entityTypeCounts = groupByEntityType(entities);
  const totalSize = entities.reduce((sum, e) => sum + e.dataSize, 0);
  const usagePercent = Math.min((entities.length / maxEntries) * USAGE_PERCENT_MULTIPLIER, USAGE_PERCENT_MAX);

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding="md" data-testid={generateTestId(title)}>
      <CacheTierHeader
        title={title}
        description={description}
        icon={icon}
        isPersistent={isPersistent}
        isLoading={isLoading}
        onRefresh={onRefresh}
        onClear={onClear}
        hasEntities={entities.length > 0}
      />

      {isLoading ? (
        <LoadingState />
      ) : entities.length === 0 ? (
        <EmptyState />
      ) : (
        <Stack gap="md">
          <CacheStats
            entityCount={entities.length}
            totalSize={totalSize}
            entityTypeCount={entityTypeCounts.length}
            usagePercent={usagePercent}
          />
          <UsageBar
            entityCount={entities.length}
            maxEntries={maxEntries}
            usagePercent={usagePercent}
          />
          <EntityTypeBreakdown entities={entities} />
        </Stack>
      )}
    </Card>
  );
};
