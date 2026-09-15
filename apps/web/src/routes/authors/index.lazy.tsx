import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityListWithQueryBookmarking } from "@/components/EntityListWithQueryBookmarking";
import type { TableViewMode } from "@/components/TableViewModeToggle";
import type { ColumnConfig } from "@/components/types";

const hasLastKnownInstitutions = (
  value: unknown,
): value is { last_known_institutions: { display_name: string }[] } => {
  if (typeof value !== "object" || value === null) return false;
  if (!("last_known_institutions" in value) || !Array.isArray(value.last_known_institutions)) return false;
  return value.last_known_institutions.every(
    (institution: unknown) =>
      typeof institution === "object" &&
      institution !== null &&
      "display_name" in institution &&
      typeof institution.display_name === "string",
  );
};

const authorsColumns: ColumnConfig[] = [
  { key: "display_name", header: "Name" },
  { key: "orcid", header: "ORCID" },
  { key: "works_count", header: "Works" },
  { key: "cited_by_count", header: "Citations" },
  {
    key: "last_known_institutions",
    header: "Institution",
    render: (_value: unknown, row: unknown) => {
      if (!hasLastKnownInstitutions(row) || row.last_known_institutions.length === 0) return "Unknown";
      return row.last_known_institutions[0]?.display_name ?? "Unknown";
    },
  },
];

const AuthorsListRoute = () => {
  const search = useSearch({ from: "/authors/" });
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  return (
    <EntityListWithQueryBookmarking
      entityType="authors"
      columns={authorsColumns}
      title="Authors"
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showBookmarkButton={true}
      bookmarkButtonPosition="header"
    />
  );
};

export const Route = createLazyFileRoute("/authors/")({
  component: AuthorsListRoute,
});

export default AuthorsListRoute;
