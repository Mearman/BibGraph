/**
 * Cache management page (US-26): shows what the browser's multi-tier cache holds, lets the user clear it per entity type or entirely, and previews recently accessed entities. All data access lives in useCacheManagement; this container only wires the hook to presentational components and owns the confirmation dialogs around destructive actions.
 */

import { getEntityPlural } from "@bibgraph/types";
import {
	Alert,
	Box,
	Button,
	Card,
	Container,
	Group,
	Loader,
	Stack,
	Text,
	ThemeIcon,
	Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDatabase, IconInfoCircle, IconRefresh, IconTrash } from "@tabler/icons-react";

import { useEntityNavigation } from "@/components/catalogue/cache-tier/useCacheTierData";
import { ICON_SIZE } from "@/config/style-constants";
import { useCacheManagement } from "@/hooks/use-cache-management";

import type { EntityTypeCacheStats } from "./cache-management-utils";
import { CachePreviewList } from "./CachePreviewList";
import { CacheStatsPanel } from "./CacheStatsPanel";
import { CacheTypeStatsTable } from "./CacheTypeStatsTable";

/**
 * US-26 asks for a "cache rebuild option". It is deliberately omitted: this cache repopulates lazily from the static JSON tier and the OpenAlex API as entities are visited, so there is no local index to rebuild and no batch of entries worth re-fetching up front. Clearing is the real operation; the empty state says how entries come back.
 */

const LoadingView = () => (
	<Stack align="center" py="xl">
		<Loader size="lg" />
		<Text size="sm" c="dimmed">Loading cache contents...</Text>
	</Stack>
);

interface EmptyStateProperties {
	memoryEntryCount: number;
}

const EmptyState = ({ memoryEntryCount }: EmptyStateProperties) => (
	<Card p="xl" withBorder>
		<Stack align="center" gap="md">
			<ThemeIcon size="xl" variant="light" color="gray">
				<IconDatabase size={ICON_SIZE.XXL} />
			</ThemeIcon>
			<Text size="lg" fw={500}>Nothing is cached yet</Text>
			<Text size="sm" c="dimmed" maw={480} ta="center">
				Entities you view are cached here automatically and load instantly on repeat visits.
				{memoryEntryCount > 0
					? ` The memory tier still holds ${memoryEntryCount.toLocaleString()} entries for this session.`
					: ""}
			</Text>
		</Stack>
	</Card>
);

/**
 * Cache management page container
 */
export const CacheBrowser = () => {
	const {
		typeStats,
		usage,
		memoryEntryCount,
		previews,
		isLoading,
		isClearing,
		error,
		refresh,
		clearByType,
		clearAll,
	} = useCacheManagement();

	const navigateToEntity = useEntityNavigation();

	const confirmClearAll = () => {
		modals.openConfirmModal({
			title: "Clear Entire Cache",
			centered: true,
			children: (
				<Text size="sm">
					Remove all {usage.totalEntries.toLocaleString()} cached entries, both the persistent
					browser cache and this session's memory tier? Entries are re-cached automatically as
					you view entities.
				</Text>
			),
			labels: { confirm: "Clear All", cancel: "Cancel" },
			confirmProps: { color: "red" },
			onConfirm: () => {
				void clearAll();
			},
		});
	};

	const confirmClearType = (entityType: EntityTypeCacheStats["entityType"]) => {
		const typeStat = typeStats.find((stat) => stat.entityType === entityType);
		modals.openConfirmModal({
			title: `Clear Cached ${getEntityPlural(entityType)}`,
			centered: true,
			children: (
				<Text size="sm">
					Remove the {(typeStat?.count ?? 0).toLocaleString()} cached
					{" "}{getEntityPlural(entityType).toLowerCase()} from the persistent browser cache?
					They are re-cached automatically as you view them.
				</Text>
			),
			labels: { confirm: "Clear", cancel: "Cancel" },
			confirmProps: { color: "red" },
			onConfirm: () => {
				void clearByType(entityType);
			},
		});
	};

	if (isLoading) {
		return (
			<Container size="lg" py="xl">
				<Title order={1}>Cache</Title>
				<LoadingView />
			</Container>
		);
	}

	const hasPersistentEntries = usage.totalEntries > 0;

	return (
		<Container size="lg" py="xl">
			<Stack gap="md">
				<Group justify="space-between" wrap="nowrap" align="flex-start">
					<Box>
						<Title order={1}>Cache</Title>
						<Text size="sm" c="dimmed" mt={4}>
							Browse and manage the browser cache of OpenAlex entities
						</Text>
					</Box>
					<Group gap="xs">
						<Button
							variant="light"
							leftSection={<IconRefresh size={ICON_SIZE.SM} />}
							onClick={() => {
								void refresh();
							}}
						>
							Refresh
						</Button>
						<Button
							variant="light"
							color="red"
							leftSection={<IconTrash size={ICON_SIZE.SM} />}
							disabled={!hasPersistentEntries && memoryEntryCount === 0}
							loading={isClearing}
							onClick={confirmClearAll}
							data-testid="clear-all-cache"
						>
							Clear all
						</Button>
					</Group>
				</Group>

				{error !== null && (
					<Alert icon={<IconInfoCircle size={ICON_SIZE.MD} />} color="red" title="Cache unavailable">
						{error}
					</Alert>
				)}

				<CacheStatsPanel usage={usage} memoryEntryCount={memoryEntryCount} />

				{hasPersistentEntries ? (
					<Card withBorder p="md">
						<Stack gap="sm">
							<Text size="sm" fw={500}>Storage by entity type</Text>
							<CacheTypeStatsTable
								typeStats={typeStats}
								isClearing={isClearing}
								onClearType={confirmClearType}
							/>
						</Stack>
					</Card>
				) : (
					<EmptyState memoryEntryCount={memoryEntryCount} />
				)}

				{previews.length > 0 && (
					<Card withBorder p="md">
						<Stack gap="sm">
							<Text size="sm" fw={500}>Recently accessed</Text>
							<CachePreviewList previews={previews} onOpenEntity={navigateToEntity} />
						</Stack>
					</Card>
				)}
			</Stack>
		</Container>
	);
};
