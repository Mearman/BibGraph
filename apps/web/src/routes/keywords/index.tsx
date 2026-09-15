import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const KeywordsListRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/keywords/")({
  component: () => (
    <LazyRoute>
      <KeywordsListRoute />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
});
