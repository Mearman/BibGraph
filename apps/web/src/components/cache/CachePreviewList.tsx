/**
 * Presentational preview list of recently accessed cached entities for the /cache page (US-26). Rows show the entity's type chip (hash-computed colour), display name, id, size and recency; navigation is delegated to the parent's callback.
 */

import type { CachedEntityPreview } from "@bibgraph/client/internal/static-data-provider";
import { getEntityPlural } from "@bibgraph/types";
import { Badge, Box, Group, List, Text } from "@mantine/core";

import { formatBytes, formatTimeAgo } from "@/components/catalogue/cache-tier/cache-tier-utils";
import { getEntityTypeColor } from "@/styles/hash-colors";

interface CachePreviewListProperties {
	previews: CachedEntityPreview[];
	onOpenEntity: (preview: Readonly<CachedEntityPreview>) => void;
}

/**
 * Show the most recently accessed cached entities as clickable previews
 */
export const CachePreviewList = ({ previews, onOpenEntity }: CachePreviewListProperties) => (
	<List listStyleType="none" spacing="xs" center>
		{previews.map((preview) => (
			<List.Item
				key={`${preview.entityType}:${preview.entityId}`}
				data-testid="cached-entity-preview"
			>
				<Group
					gap="sm"
					wrap="nowrap"
					style={{ cursor: "pointer" }}
					onClick={() => {
						onOpenEntity(preview);
					}}
				>
					<Badge size="sm" variant="light" color={getEntityTypeColor(preview.entityType)}>
						{getEntityPlural(preview.entityType)}
					</Badge>
					<Box style={{ minWidth: 0 }}>
						<Text size="sm" fw={500} truncate="end">
							{preview.displayName ?? preview.entityId}
						</Text>
						<Text size="xs" c="dimmed" ff="monospace">
							{preview.entityId}
						</Text>
					</Box>
					<Text size="xs" c="dimmed" ml="auto">
						{formatBytes(preview.dataSize)} · accessed {formatTimeAgo(preview.lastAccessedAt)}
					</Text>
				</Group>
			</List.Item>
		))}
	</List>
);
