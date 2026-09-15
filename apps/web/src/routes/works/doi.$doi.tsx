import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const DOIWorkRoute = lazy(async () => import("./doi.$doi.lazy"));

export const Route = createFileRoute("/works/doi/$doi")({
  component: () => (
    <LazyRoute>
      <DOIWorkRoute />
    </LazyRoute>
  ),
});
