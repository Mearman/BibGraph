import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { AutocompletePage } from "@/components/AutocompletePage";
import { useEntityAutocomplete } from "@/hooks/use-entity-autocomplete";

const searchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

const AutocompleteConceptsRoute = () => {
  const urlSearch = useSearch({ from: "/autocomplete/concepts/" });

  const { query, handleSearch, results, isLoading, error, filter } = useEntityAutocomplete({
    entityType: "concepts",
    urlSearch,
    routePath: "/autocomplete/concepts",
  });

  return (
    <AutocompletePage
      entityType="concepts"
      query={query}
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      error={error}
      filter={filter}
      placeholder="Search for concepts, research areas..."
      description="Search for concepts with real-time suggestions from the OpenAlex database"
    />
  );
};

export const Route = createFileRoute("/autocomplete/concepts/")({
  component: AutocompleteConceptsRoute,
  validateSearch: searchSchema,
});
