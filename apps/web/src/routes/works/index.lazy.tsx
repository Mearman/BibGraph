import { createFilterBuilder } from "@bibgraph/client";
import type { Work } from "@bibgraph/types";
import { Anchor } from "@mantine/core";
import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { EntityListWithQueryBookmarking } from "@/components/EntityListWithQueryBookmarking";
import type { TableViewMode } from "@/components/TableViewModeToggle";
import type { ColumnConfig } from "@/components/types";
import { convertOpenAlexToInternalLink } from "@/utils/openalex-link-conversion";

const isWork = (value: unknown): value is Work => (
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "display_name" in value &&
  typeof value.display_name === "string"
);

const worksColumns: ColumnConfig[] = [
  {
    key: "display_name",
    header: "Title",
    render: (_value: unknown, row: unknown) => {
      if (!isWork(row)) return null;
      const workUrl = `#${convertOpenAlexToInternalLink(row.id).internalPath}`;
      if (workUrl) {
        return (
          <Anchor
            href={workUrl}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {row.display_name}
          </Anchor>
        );
      }
      return row.display_name;
    },
  },
  {
    key: "authorships",
    header: "Authors",
    render: (_value: unknown, row: unknown) => {
      if (!isWork(row)) return null;
      const { authorships } = row;
      if (!authorships || authorships.length === 0) return "Unknown";

      return (
        <>
          {authorships.map((authorship, index) => {
            const { author } = authorship;
            if (author.id === undefined) return null;
            const authorUrl = `#${convertOpenAlexToInternalLink(author.id).internalPath}`;

            return (
              <span key={author.id}>
                {authorUrl ? (
                  <Anchor
                    href={authorUrl}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {author.display_name}
                  </Anchor>
                ) : (
                  <span>{author.display_name}</span>
                )}
                {index < authorships.length - 1 && ", "}
              </span>
            );
          })}
        </>
      );
    },
  },
  {
    key: "primary_location",
    header: "Source",
    render: (_value: unknown, row: unknown) => {
      if (!isWork(row)) return null;
      const primaryLocation: unknown = row.primary_location;
      if (typeof primaryLocation !== "object" || primaryLocation === null || !("source" in primaryLocation)) {
        return "Unknown";
      }
      const { source } = primaryLocation;
      if (
        typeof source !== "object" || source === null ||
        !("id" in source) || typeof source.id !== "string" ||
        !("display_name" in source) || typeof source.display_name !== "string"
      ) {
        return "Unknown";
      }

      const sourceUrl = `#${convertOpenAlexToInternalLink(source.id).internalPath}`;
      if (sourceUrl) {
        return (
          <Anchor
            href={sourceUrl}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {source.display_name}
          </Anchor>
        );
      }
      return source.display_name;
    },
  },
  {
    key: "cited_by_count",
    header: "Citations",
    render: (_value: unknown, row: unknown) => {
      if (!isWork(row)) return null;
      return row.cited_by_count.toLocaleString();
    },
  },
  {
    key: "open_access",
    header: "Access",
    render: (_value: unknown, row: unknown) => {
      if (!isWork(row)) return null;
      return row.open_access?.is_oa === true ? "Open" : "Closed";
    },
  },
];

const WorksListRoute = () => {
  const search = useSearch({ from: "/works/" });
  const [viewMode, setViewMode] = useState<TableViewMode>("table");

  // Parse filter string into filter object if present
  const urlFilters = search.filter !== undefined && search.filter !== ''
    ? createFilterBuilder().parseFilterString(search.filter)
    : undefined;

  return (
    <EntityListWithQueryBookmarking
      entityType="works"
      columns={worksColumns}
      title="Works"
      urlFilters={urlFilters}
      searchParams={search}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showBookmarkButton={true}
      bookmarkButtonPosition="header"
    />
  );
};

export const Route = createLazyFileRoute("/works/")({
  component: WorksListRoute,
});

export default WorksListRoute;
