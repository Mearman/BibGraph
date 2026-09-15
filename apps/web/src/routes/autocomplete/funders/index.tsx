import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { AutocompletePage } from "@/components/AutocompletePage";
import { useEntityAutocomplete } from "@/hooks/use-entity-autocomplete";

const searchSchema = z.object({
  filter: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

const AutocompleteFundersRoute = () => {
  const urlSearch = useSearch({ from: "/autocomplete/funders/" });

  const { query, handleSearch, results, isLoading, error, filter } = useEntityAutocomplete({
    entityType: "funders",
    urlSearch,
    routePath: "/autocomplete/funders",
  });

  return (
    <AutocompletePage
      entityType="funders"
      query={query}
      onSearch={handleSearch}
      results={results}
      isLoading={isLoading}
      error={error}
      filter={filter}
      placeholder="Search for funders..."
      description="Search for funders with real-time suggestions from the OpenAlex database"
    />
  );
};

export const Route = createFileRoute("/autocomplete/funders/")({
  component: AutocompleteFundersRoute,
  validateSearch: searchSchema,
});
