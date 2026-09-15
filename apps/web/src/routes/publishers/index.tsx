import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const PublishersRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/publishers/")({
  validateSearch: openAlexSearchSchema,
  component: () => (
    <LazyRoute>
      <PublishersRoute />
    </LazyRoute>
  ),
});
