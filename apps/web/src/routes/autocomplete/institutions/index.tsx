import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { AutocompletePage } from "@/components/AutocompletePage";
import { useEntityAutocomplete } from "@/hooks/use-entity-autocomplete";

const searchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

const AutocompleteInstitutionsRoute = () => {
  const urlSearch = useSearch({ from: "/autocomplete/institutions/" });

  const { query, handleSearch, results, isLoading, error, filter } = useEntityAutocomplete({
    entityType: "institutions",
    urlSearch,
    routePath: "/autocomplete/institutions",
  });

  return (
    <AutocompletePage
      entityType="institutions"
      query={query}
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      error={error}
      filter={filter}
      placeholder="Search for universities, research centers..."
      description="Search for institutions with real-time suggestions from the OpenAlex database"
    />
  );
};

export const Route = createFileRoute("/autocomplete/institutions/")({
  component: AutocompleteInstitutionsRoute,
  validateSearch: searchSchema,
});
