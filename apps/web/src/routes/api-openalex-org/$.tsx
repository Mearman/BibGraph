import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const ApiOpenAlexRoute = lazy(async () => import("./$.lazy"));

export const Route = createFileRoute("/api-openalex-org/$")({
  component: () => (
    <LazyRoute>
      <ApiOpenAlexRoute />
    </LazyRoute>
  ),
  validateSearch: openAlexSearchSchema,
});
