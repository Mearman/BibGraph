/**
 * Cache Tier Lists component for displaying entities in each cache tier
 * Shows synthetic system lists for Memory and IndexedDB cache tiers
 * @module components/catalogue/CacheTierLists
 */

import {
  Badge,
  Box,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconCloud,
  IconCpu,
  IconDatabase,
  IconFolder,
} from "@tabler/icons-react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

import { CacheTierCard } from "./cache-tier/CacheTierCard";
import { StaticCacheTierCard } from "./cache-tier/StaticCacheTierCard";
import { useCacheTierData } from "./cache-tier/useCacheTierData";

/** Maximum entries for memory cache tier */
const MEMORY_CACHE_MAX_ENTRIES = 1000;

/** Maximum entries for IndexedDB cache tier */
const INDEXED_DB_MAX_ENTRIES = 10_000;

/**
 * Main component displaying all cache tiers with stats and entity listings
 */
export const CacheTierLists = () => {
  const {
    summary,
    staticCacheEntities,
    tierStats,
    staticConfig,
    isLoading,
    isRefreshingMemory,
    isRefreshingIndexedDB,
    isRefreshingStatic,
    handleRefreshMemory,
    handleRefreshIndexedDB,
    handleClearIndexedDB,
    handleRefreshStatic,
  } = useCacheTierData();

  if (isLoading) {
    return <LoadingView />;
  }

  if (!summary) {
    return <ErrorView />;
  }

  const totalCachedEntities = summary.memory.count + summary.indexedDB.count;

  return (
    <Stack gap="md">
      <CacheTierHeader totalCachedEntities={totalCachedEntities} />

      {/* Local Cache Tiers */}
      <Text size="sm" fw={500} c="dimmed" mt="xs">Local Cache Tiers</Text>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <CacheTierCard
          title="Memory Cache"
          description="Fast in-memory cache for current session"
          icon={<IconCpu size={ICON_SIZE.XL} />}
          entities={summary.memory.entities}
          isLoading={isRefreshingMemory}
          onRefresh={handleRefreshMemory}
          isPersistent={false}
          maxEntries={MEMORY_CACHE_MAX_ENTRIES}
        />

        <CacheTierCard
          title="IndexedDB Cache"
          description="Persistent browser storage across sessions"
          icon={<IconDatabase size={ICON_SIZE.XL} />}
          entities={summary.indexedDB.entities}
          isLoading={isRefreshingIndexedDB}
          onRefresh={handleRefreshIndexedDB}
          onClear={handleClearIndexedDB}
          isPersistent={true}
          maxEntries={INDEXED_DB_MAX_ENTRIES}
        />
      </SimpleGrid>

      {/* Static Cache Tiers */}
      <Text size="sm" fw={500} c="dimmed" mt="md">Static Cache Tiers</Text>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {staticConfig?.gitHubPages.isProduction && (
          <StaticCacheTierCard
            title="GitHub Pages Cache"
            description="Pre-cached entities from GitHub Pages CDN"
            icon={<IconBrandGithub size={ICON_SIZE.XL} />}
            url={staticConfig.gitHubPages.url}
            isConfigured={staticConfig.gitHubPages.isConfigured}
            entities={staticCacheEntities}
            stats={tierStats?.gitHubPages ?? null}
            isLoading={isRefreshingStatic}
            onRefresh={handleRefreshStatic}
            color="grape"
            badges={
              <Badge size="xs" color="grape" variant="light">
                Remote CDN
              </Badge>
            }
          />
        )}

        {staticConfig?.gitHubPages.isLocalhost && (
          <StaticCacheTierCard
            title="Local Static Cache"
            description="Pre-cached entities served from local dev server"
            icon={<IconFolder size={ICON_SIZE.XL} />}
            url={staticConfig.localStatic.path || staticConfig.gitHubPages.url}
            isConfigured={staticConfig.localStatic.isAvailable}
            entities={staticCacheEntities}
            stats={tierStats?.gitHubPages ?? null}
            isLoading={isRefreshingStatic}
            onRefresh={handleRefreshStatic}
            color="teal"
            badges={
              <Badge size="xs" color="teal" variant="light">
                Dev Mode
              </Badge>
            }
          />
        )}

        {staticConfig && !staticConfig.gitHubPages.isConfigured && (
          <NoStaticCacheCard />
        )}
      </SimpleGrid>
    </Stack>
  );
};

interface CacheTierHeaderProps {
  totalCachedEntities: number;
}

const CacheTierHeader = ({ totalCachedEntities }: CacheTierHeaderProps) => (
  <Group justify="space-between">
    <div>
      <Text size="lg" fw={500}>Cache Tier Overview</Text>
      <Text size="sm" c="dimmed">
        Multi-tier caching: Memory - IndexedDB - Static Files - OpenAlex API
      </Text>
    </div>
    <Badge size="lg" variant="light">
      {totalCachedEntities.toLocaleString()} cached entities
    </Badge>
  </Group>
);

const LoadingView = () => (
  <Stack align="center" py="xl">
    <Loader size="lg" />
    <Text size="sm" c="dimmed">Loading cache tiers...</Text>
  </Stack>
);

const ErrorView = () => (
  <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
    <Stack align="center" gap="md">
      <Box c="gray.4">
        <IconDatabase size={ICON_SIZE.EMPTY_STATE} />
      </Box>
      <Text size="lg" fw={500}>Unable to load cache data</Text>
      <Text size="sm" c="dimmed">
        There was an error loading the cache tier information.
      </Text>
    </Stack>
  </Card>
);

const NoStaticCacheCard = () => (
  <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding="md">
    <Stack align="center" gap="md" py="lg">
      <ThemeIcon size="xl" variant="light" color="gray">
        <IconCloud size={ICON_SIZE.XXL} />
      </ThemeIcon>
      <div style={{ textAlign: "center" }}>
        <Text fw={500}>No Static Cache Configured</Text>
        <Text size="sm" c="dimmed">
          Static caching is not configured for this environment.
        </Text>
      </div>
    </Stack>
  </Card>
);
