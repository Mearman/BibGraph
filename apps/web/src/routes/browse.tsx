import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const BrowsePage = lazy(async () => import("./browse.lazy"));

export const Route = createFileRoute("/browse")({
  component: () => (
    <LazyRoute>
      <BrowsePage />
    </LazyRoute>
  ),
});
