import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const ExternalIdRoute = lazy(async () => import("./$externalId.lazy"));

export const Route = createFileRoute("/$externalId")({
  component: () => (
    <LazyRoute>
      <ExternalIdRoute />
    </LazyRoute>
  ),
});
