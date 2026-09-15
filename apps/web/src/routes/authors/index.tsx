import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const AuthorsListRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/authors/")({
  component: () => (
    <LazyRoute>
      <AuthorsListRoute />
    </LazyRoute>
  ),
  validateSearch: openAlexSearchSchema,
});
