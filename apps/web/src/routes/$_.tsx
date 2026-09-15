import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const CatchAllRoute = lazy(async () =>
  import("./$_.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/$_")({
  component: () => (
    <LazyRoute>
      <CatchAllRoute />
    </LazyRoute>
  ),
});
