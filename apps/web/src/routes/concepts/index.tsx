import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const ConceptsListRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/concepts/")({
  component: () => (
    <LazyRoute>
      <ConceptsListRoute />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
});
