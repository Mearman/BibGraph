import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const TopicsListRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/topics/")({
  component: () => (
    <LazyRoute>
      <TopicsListRoute />
    </LazyRoute>
  ),
  validateSearch: openAlexSearchSchema,
});
