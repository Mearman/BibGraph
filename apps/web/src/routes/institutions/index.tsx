import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const InstitutionsListRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/institutions/")({
  validateSearch: openAlexSearchSchema,
  component: () => (
    <LazyRoute>
      <InstitutionsListRoute />
    </LazyRoute>
  ),
});
