import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityList } from "@/components/EntityList";
import type { TableViewMode } from "@/components/TableViewModeToggle";
import type { ColumnConfig } from "@/components/types";

const hasTopicField = (value: unknown): value is { field: { display_name: string } } => {
  if (typeof value !== "object" || value === null) return false;
  if (!("field" in value) || typeof value.field !== "object" || value.field === null) return false;
  return "display_name" in value.field && typeof value.field.display_name === "string";
};

const topicsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
  {
    key: "field.display_name",
    header: "Field",
    render: (_value: unknown, row: unknown) => {
      if (!hasTopicField(row)) return "Unknown";
      return row.field.display_name;
    },
  },
];

const TopicsListRoute = () => {
  const search = useSearch({ from: "/topics/" });
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  return (
    <EntityList
      entityType="topics"
      columns={topicsColumns}
      title="Topics"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
};

export const Route = createLazyFileRoute("/topics/")({
  component: TopicsListRoute,
});

export default TopicsListRoute;
