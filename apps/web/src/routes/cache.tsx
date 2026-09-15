import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const CacheBrowserPage = lazy(async () => import("./cache.lazy"));

export const Route = createFileRoute("/cache")({
  component: () => (
    <LazyRoute>
      <CacheBrowserPage />
    </LazyRoute>
  ),
});
