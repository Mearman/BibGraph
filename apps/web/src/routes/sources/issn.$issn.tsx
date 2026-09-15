import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const ISSNSourceRoute = lazy(async () => import("./issn.$issn.lazy"));

export const Route = createFileRoute("/sources/issn/$issn")({
  component: () => (
    <LazyRoute>
      <ISSNSourceRoute />
    </LazyRoute>
  ),
});
