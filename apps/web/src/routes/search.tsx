import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const SearchPage = lazy(async () => import("./search.lazy"));

export const Route = createFileRoute("/search")({
  component: () => (
    <LazyRoute>
      <SearchPage />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>) => {
    // Handle the case where q parameter might be a full OpenAlex URL
    // e.g., ?q=https://api.openalex.org/autocomplete/works?filter=...&search=...
    return {
      q: typeof search.q === "string" && search.q !== "" ? search.q : "",
      filter: typeof search.filter === "string" && search.filter !== "" ? search.filter : undefined,
      search: typeof search.search === "string" && search.search !== "" ? search.search : undefined,
    };
  },
});
