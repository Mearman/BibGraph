/**
 * Integrated graph exploration route
 * Uses the MainLayout with full sidebar integration
 */

import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const GraphExplorer = lazy(async () => import("./graph.lazy"));

export const Route = createFileRoute("/explore/graph")({
  component: () => (
    <LazyRoute>
      <GraphExplorer />
    </LazyRoute>
  ),
});
