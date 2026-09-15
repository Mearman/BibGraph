import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const HttpsRoute = lazy(async () => import("./$.lazy"));

export const Route = createFileRoute("/https/$")({
  component: () => (
    <LazyRoute>
      <HttpsRoute />
    </LazyRoute>
  ),
});
