import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";
import { openAlexSearchSchema } from "@/lib/route-schemas";

const FundersRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/funders/")({
  validateSearch: openAlexSearchSchema,
  component: () => (
    <LazyRoute>
      <FundersRoute />
    </LazyRoute>
  ),
});
