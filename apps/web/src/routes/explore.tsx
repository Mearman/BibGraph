import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const GraphExplorer = lazy(async () => import("./explore.lazy"));

export const Route = createFileRoute("/explore")({
  component: () => (
    <LazyRoute>
      <GraphExplorer />
    </LazyRoute>
  ),
});
