import type { EntityType } from "@bibgraph/types";
import { EntityCard } from "@bibgraph/ui";
import { Stack } from "@mantine/core";

import { ContentSkeleton } from "./molecules/ContentSkeleton";
import { EmptyState } from "./ui/EmptyState";

export interface EntityListItem {
  id: string;
  displayName: string;
  entityType: EntityType;
  worksCount?: number;
  citedByCount?: number;
  description?: string;
  tags?: Array<{ label: string; color?: string }>;
}

interface EntityListViewProps {
  items: EntityListItem[];
  onNavigate?: (path: string) => void;
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
  emptyMessage?: string;
  loading?: boolean;
  loadingCount?: number;
  /** Empty state variant */
  emptyVariant?: "no-data" | "no-results";
  /** Optional empty state actions */
  emptyActions?: Array<{ label: string; onClick?: () => void }>;
  /** Whether to show quick start guide in empty state */
  showQuickStart?: boolean;
}

export const EntityListView = ({
  items,
  onNavigate,
  spacing = "sm",
  emptyMessage = "No items to display",
  loading = false,
  loadingCount = 5,
  emptyVariant = "no-data",
  emptyActions,
  showQuickStart = false,
}: EntityListViewProps) => {
  if (loading) {
    return <ContentSkeleton variant="list" count={loadingCount} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant={emptyVariant}
        title={emptyMessage}
        actions={emptyActions}
        quickStart={showQuickStart ? [
          { step: "Search for entities", detail: "Browse the OpenAlex database" },
          { step: "View details", detail: "Click any entity to learn more" },
          { step: "Build collection", detail: "Bookmarks and history are saved automatically" },
        ] : undefined}
      />
    );
  }

  return (
    <Stack gap={spacing}>
      {items.map((item) => (
        <EntityCard
          key={item.id}
          id={item.id}
          displayName={item.displayName}
          entityType={item.entityType}
          worksCount={item.worksCount}
          citedByCount={item.citedByCount}
          description={item.description}
          tags={item.tags}
          onNavigate={onNavigate}
        />
      ))}
    </Stack>
  );
};
