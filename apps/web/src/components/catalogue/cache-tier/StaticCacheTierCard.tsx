/**
 * Static Cache Tier Card component for displaying remote/local static cache information
 * @module components/catalogue/cache-tier/StaticCacheTierCard
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";
import {
  ActionIcon,
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
import { IconRefresh } from "@tabler/icons-react";
import React from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

import type { CacheTierStats } from "./cache-tier-types";
import { generateTestId, groupByEntityType } from "./cache-tier-utils";
import { EntityTypeBreakdown } from "./EntityTypeBreakdown";

const HIGH_HIT_RATE_THRESHOLD = 80;
const MEDIUM_HIT_RATE_THRESHOLD = 50;

interface StaticCacheTierCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  isConfigured: boolean;
  entities: CachedEntityEntry[];
  stats: CacheTierStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  color: string;
  badges?: React.ReactNode;
}

/**
 * Displays a static cache tier card with URL, stats, and entity breakdown
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.icon
 * @param root0.url
 * @param root0.isConfigured
 * @param root0.entities
 * @param root0.stats
 * @param root0.isLoading
 * @param root0.onRefresh
 * @param root0.color
 * @param root0.badges
 */
export const StaticCacheTierCard = ({
  title,
  description,
  icon,
  url,
  isConfigured,
  entities,
  stats,
  isLoading,
  onRefresh,
  color,
  badges,
}: StaticCacheTierCardProps) => {
  const entityTypeCounts = groupByEntityType(entities);
  const hitRate = stats && stats.requests > 0 ? (stats.hits / stats.requests) * 100 : 0;

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding="md" data-testid={generateTestId(title)}>
      <StaticCacheHeader
        title={title}
        description={description}
        icon={icon}
        color={color}
        badges={badges}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      {isConfigured ? (
        isLoading ? (
          <LoadingState />
        ) : (
          <Stack gap="md">
            <UrlDisplay url={url} />
            <StaticCacheStats
              entityCount={entities.length}
              entityTypeCount={entityTypeCounts.length}
              stats={stats}
              hitRate={hitRate}
            />
            {stats && stats.requests > 0 && <HitRateBar stats={stats} hitRate={hitRate} />}
            {entities.length > 0 ? (
              <EntityTypeBreakdown entities={entities} showSize={false} showAccessedAt={false} />
            ) : (
              <EmptyState />
            )}
          </Stack>
        )
      ) : (
        <NotConfiguredState />
      )}
    </Card>
  );
};

interface StaticCacheHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badges?: React.ReactNode;
  isLoading: boolean;
  onRefresh: () => void;
}

const StaticCacheHeader = ({
  title,
  description,
  icon,
  color,
  badges,
  isLoading,
  onRefresh,
}: StaticCacheHeaderProps) => (
  <Group justify="space-between" mb="md">
    <Group>
      <ThemeIcon size="lg" variant="light" color={color}>
        {icon}
      </ThemeIcon>
      <div>
        <Text fw={500} size="lg">{title}</Text>
        <Text size="xs" c="dimmed">{description}</Text>
      </div>
    </Group>
    <Group gap="xs">
      {badges}
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
    </Group>
  </Group>
);

const LoadingState = () => (
  <Stack align="center" py="xl">
    <Loader size="sm" />
    <Text size="xs" c="dimmed">Loading cache data...</Text>
  </Stack>
);

const EmptyState = () => (
  <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" bg="gray.0">
    <Text size="sm" c="dimmed" ta="center">
      No entities cached in static storage
    </Text>
  </Paper>
);

const NotConfiguredState = () => (
  <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" bg="gray.0">
    <Text size="sm" c="dimmed" ta="center">
      Not configured
    </Text>
  </Paper>
);

interface UrlDisplayProps {
  url: string;
}

const UrlDisplay = ({ url }: UrlDisplayProps) => (
  <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
    <Text size="xs" c="dimmed" fw={500} mb={4}>Cache URL</Text>
    <Text size="sm" ff="monospace" style={{ wordBreak: "break-all" }}>
      {url}
    </Text>
  </Paper>
);

interface StaticCacheStatsProps {
  entityCount: number;
  entityTypeCount: number;
  stats: CacheTierStats | null;
  hitRate: number;
}

const StaticCacheStats = ({
  entityCount,
  entityTypeCount,
  stats,
  hitRate,
}: StaticCacheStatsProps) => (
  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
    <StatCard label="Entities" value={entityCount.toLocaleString()} />
    <StatCard label="Entity Types" value={entityTypeCount.toString()} />
    {stats && (
      <>
        <StatCard label="Requests" value={stats.requests.toLocaleString()} />
        <StatCard label="Hit Rate" value={`${hitRate.toFixed(1)}%`} />
      </>
    )}
  </SimpleGrid>
);

interface StatCardProps {
  label: string;
  value: string;
}

const StatCard = ({ label, value }: StatCardProps) => (
  <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" radius="sm">
    <Text size="xs" c="dimmed" fw={500}>{label}</Text>
    <Text size="lg" fw={700}>{value}</Text>
  </Paper>
);

interface HitRateBarProps {
  stats: CacheTierStats;
  hitRate: number;
}

const HitRateBar = ({ stats, hitRate }: HitRateBarProps) => {
  const getHitRateColor = () => {
    if (hitRate > HIGH_HIT_RATE_THRESHOLD) return "green";
    if (hitRate > MEDIUM_HIT_RATE_THRESHOLD) return "blue";
    return "orange";
  };

  return (
    <div>
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed">Cache Hit Rate</Text>
        <Text size="xs" c="dimmed">{stats.hits} / {stats.requests}</Text>
      </Group>
      <Progress value={hitRate} color={getHitRateColor()} size="sm" />
    </div>
  );
};
