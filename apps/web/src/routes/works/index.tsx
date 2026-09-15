import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const WorksListRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/works/")({
  component: () => (
    <LazyRoute>
      <WorksListRoute />
    </LazyRoute>
  ),
  validateSearch: openAlexSearchSchema,
});
