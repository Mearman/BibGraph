/**
 * Presentational storage-usage statistics for the /cache page (US-26): persistent-cache entries, approximate size, last write time, and the session memory tier's entry count. All data arrives via props.
 */

import { Box, Group, Paper, Text } from "@mantine/core";

import type { CacheUsageSummary } from "@/components/cache/cache-management-utils";
import { formatBytes, formatTimeAgo } from "@/components/catalogue/cache-tier/cache-tier-utils";
import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";

interface CacheStatsPanelProperties {
	usage: CacheUsageSummary;
	memoryEntryCount: number;
}

interface StatItemProperties {
	label: string;
	value: string;
	testId: string;
}

const StatItem = ({ label, value, testId }: StatItemProperties) => (
	<Box>
		<Text size="xs" c="dimmed" fw={500}>{label}</Text>
		<Text size="lg" fw={700} data-testid={testId}>{value}</Text>
	</Box>
);

/**
 * Show whole-cache usage statistics for the persistent and memory tiers
 */
export const CacheStatsPanel = ({ usage, memoryEntryCount }: CacheStatsPanelProperties) => (
	<Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" data-testid="storage-stats">
		<Group justify="space-between" gap="xl" wrap="wrap">
			<StatItem
				label="Cached entries (persistent)"
				value={usage.totalEntries.toLocaleString()}
				testId="cache-entry-count"
			/>
			<StatItem
				label="Approximate size"
				value={formatBytes(usage.totalSizeBytes)}
				testId="storage-size"
			/>
			<StatItem
				label="Last modified"
				value={usage.lastCachedAt === null ? "Never" : formatTimeAgo(usage.lastCachedAt)}
				testId="cache-last-modified"
			/>
			<StatItem
				label="Memory tier (this session)"
				value={memoryEntryCount.toLocaleString()}
				testId="memory-entry-count"
			/>
		</Group>
		{usage.totalSizeBytes > 0 && (
			<Text size="xs" c="dimmed" mt="xs">
				Sizes are the stored byte length of the serialised entities, an approximation of on-disk usage.
			</Text>
		)}
	</Paper>
);
