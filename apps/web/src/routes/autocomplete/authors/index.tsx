import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { AutocompletePage } from "@/components/AutocompletePage";
import { useEntityAutocomplete } from "@/hooks/use-entity-autocomplete";

const searchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

const AutocompleteAuthorsRoute = () => {
  const urlSearch = useSearch({ from: "/autocomplete/authors/" });

  const { query, handleSearch, results, isLoading, error, filter } = useEntityAutocomplete({
    entityType: "authors",
    urlSearch,
    routePath: "/autocomplete/authors",
  });

  return (
    <AutocompletePage
      entityType="authors"
      query={query}
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      error={error}
      filter={filter}
      placeholder="Search for authors, researchers..."
      description="Search for authors and researchers with real-time suggestions from the OpenAlex database"
    />
  );
};

export const Route = createFileRoute("/autocomplete/authors/")({
  component: AutocompleteAuthorsRoute,
  validateSearch: searchSchema,
});
