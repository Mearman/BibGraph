import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityList, type EntityListColumnConfig } from "@/components/EntityList";
import type { TableViewMode } from "@/components/TableViewModeToggle";

const fundersColumns: EntityListColumnConfig[] = [
  { key: "id", header: "ID" },
  { key: "display_name", header: "Name" },
  { key: "country_code", header: "Country" },
  { key: "international", header: "International" },
];

const FundersRoute = () => {
  const search = useSearch({ from: "/funders/" });
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  return (
    <EntityList
      entityType="funders"
      columns={fundersColumns}
      title="Funders"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
};

export const Route = createLazyFileRoute("/funders/")({
  component: FundersRoute,
});

export default FundersRoute;
