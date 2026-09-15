import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const RORInstitutionRoute = lazy(async () => import("./ror.$ror.lazy"));

export const Route = createFileRoute("/institutions/ror/$ror")({
  component: () => (
    <LazyRoute>
      <RORInstitutionRoute />
    </LazyRoute>
  ),
});
