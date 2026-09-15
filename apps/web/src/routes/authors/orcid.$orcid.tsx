import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const ORCIDAuthorRoute = lazy(async () => import("./orcid.$orcid.lazy"));

export const Route = createFileRoute("/authors/orcid/$orcid")({
  component: () => (
    <LazyRoute>
      <ORCIDAuthorRoute />
    </LazyRoute>
  ),
});
