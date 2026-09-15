import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const OpenAlexRoute = lazy(async () => import("./$.lazy"));

export const Route = createFileRoute("/openalex/org/$")({
  component: () => (
    <LazyRoute>
      <OpenAlexRoute />
    </LazyRoute>
  ),
});
