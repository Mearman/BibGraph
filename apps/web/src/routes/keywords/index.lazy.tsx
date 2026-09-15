import { createFilterBuilder } from "@bibgraph/client";
import { createLazyFileRoute , useSearch } from "@tanstack/react-router";

import { EntityList } from "@/components/EntityList";
import type { ColumnConfig } from "@/components/types";

const keywordsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
];


const KeywordsListRoute = () => {
  const search = useSearch({ from: "/keywords/" });
  const filterBuilder = createFilterBuilder();
  const urlFilters = search.filter !== undefined && search.filter !== ''
    ? filterBuilder.parseFilterString(search.filter)
    : undefined;

  return (
    <EntityList
      entityType="keywords"
      columns={keywordsColumns}
      title="Keywords"
      urlFilters={urlFilters}
    />
  );
};

export const Route = createLazyFileRoute("/keywords/")({
  component: KeywordsListRoute,
});

export default KeywordsListRoute;
