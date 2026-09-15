import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityList, type EntityListColumnConfig } from "@/components/EntityList";
import type { TableViewMode } from "@/components/TableViewModeToggle";

const sourcesColumns: EntityListColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  { key: "ids.issn", header: "ISSN" },
];

const SourcesRoute = () => {
  const search = useSearch({ from: "/sources/" });
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  return (
    <EntityList
      entityType="sources"
      columns={sourcesColumns}
      title="Sources"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
};

export const Route = createLazyFileRoute("/sources/")({
  component: SourcesRoute,
});

export default SourcesRoute;
