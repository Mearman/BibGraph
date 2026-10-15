/**
 * Presentational per-entity-type usage table for the /cache page (US-26). Each row shows a type's entry count, approximate size and recency with a per-type clear action; clearing is delegated to the parent's callback.
 */

import { getEntityPlural } from "@bibgraph/types";
import { Badge, Box, Button, Table, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import type { EntityTypeCacheStats } from "@/components/cache/cache-management-utils";
import { formatBytes, formatTimeAgo } from "@/components/catalogue/cache-tier/cache-tier-utils";
import { ICON_SIZE } from "@/config/style-constants";
import { getEntityTypeColor } from "@/styles/hash-colors";

interface CacheTypeStatsTableProperties {
	typeStats: EntityTypeCacheStats[];
	isClearing: boolean;
	onClearType: (entityType: EntityTypeCacheStats["entityType"]) => void;
}

/**
 * Show per-type cache usage with a clear action per row
 */
export const CacheTypeStatsTable = ({
	typeStats,
	isClearing,
	onClearType,
}: CacheTypeStatsTableProperties) => (
	<Box style={{ overflowX: "auto" }}>
		<Table striped highlightOnHover>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Entity type</Table.Th>
					<Table.Th>Entries</Table.Th>
					<Table.Th>Approximate size</Table.Th>
					<Table.Th>Last cached</Table.Th>
					<Table.Th>Last accessed</Table.Th>
					<Table.Th></Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>
				{typeStats.map((typeStat) => (
					<Table.Tr key={typeStat.entityType} data-testid="cache-type-row">
						<Table.Td>
							<Badge size="sm" variant="light" color={getEntityTypeColor(typeStat.entityType)}>
								{getEntityPlural(typeStat.entityType)}
							</Badge>
						</Table.Td>
						<Table.Td data-testid="entity-type-count">{typeStat.count.toLocaleString()}</Table.Td>
						<Table.Td>{formatBytes(typeStat.totalSizeBytes)}</Table.Td>
						<Table.Td>
							<Text size="sm" c="dimmed">{formatTimeAgo(typeStat.lastCachedAt)}</Text>
						</Table.Td>
						<Table.Td>
							<Text size="sm" c="dimmed">{formatTimeAgo(typeStat.lastAccessedAt)}</Text>
						</Table.Td>
						<Table.Td>
							<Tooltip label={`Clear all cached ${getEntityPlural(typeStat.entityType).toLowerCase()}`}>
								<Button
									size="xs"
									variant="light"
									color="red"
									leftSection={<IconTrash size={ICON_SIZE.SM} />}
									loading={isClearing}
									onClick={() => {
										onClearType(typeStat.entityType);
									}}
									data-testid="clear-cache-by-type"
								>
									Clear
								</Button>
							</Tooltip>
						</Table.Td>
					</Table.Tr>
				))}
			</Table.Tbody>
		</Table>
	</Box>
);
