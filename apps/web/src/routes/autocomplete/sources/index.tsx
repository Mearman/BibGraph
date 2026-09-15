import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { AutocompletePage } from "@/components/AutocompletePage";
import { useEntityAutocomplete } from "@/hooks/use-entity-autocomplete";

const searchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

const AutocompleteSourcesRoute = () => {
  const urlSearch = useSearch({ from: "/autocomplete/sources/" });

  const { query, handleSearch, results, isLoading, error, filter } = useEntityAutocomplete({
    entityType: "sources",
    urlSearch,
    routePath: "/autocomplete/sources",
  });

  return (
    <AutocompletePage
      entityType="sources"
      query={query}
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      error={error}
      filter={filter}
      placeholder="Search for journals, repositories..."
      description="Search for sources with real-time suggestions from the OpenAlex database"
    />
  );
};

export const Route = createFileRoute("/autocomplete/sources/")({
  component: AutocompleteSourcesRoute,
  validateSearch: searchSchema,
});
