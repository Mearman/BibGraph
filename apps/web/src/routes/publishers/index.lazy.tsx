import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityList, type EntityListColumnConfig } from "@/components/EntityList";
import type { TableViewMode } from "@/components/TableViewModeToggle";

const publishersColumns: EntityListColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  {
    key: "international_standard_identifier",
    header: "International Standard Identifier",
  },
];

const PublishersRoute = () => {
  const search = useSearch({ from: "/publishers/" });
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  return (
    <EntityList
      entityType="publishers"
      columns={publishersColumns}
      title="Publishers"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
};

export const Route = createLazyFileRoute("/publishers/")({
  component: PublishersRoute,
});

export default PublishersRoute;
