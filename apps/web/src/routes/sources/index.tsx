import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const SourcesRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/sources/")({
  validateSearch: openAlexSearchSchema,
  component: () => (
    <LazyRoute>
      <SourcesRoute />
    </LazyRoute>
  ),
});
