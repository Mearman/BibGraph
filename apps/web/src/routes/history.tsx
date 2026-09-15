import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const HistoryPage = lazy(async () => import("./history.lazy"));

export const Route = createFileRoute("/history")({
  component: () => (
    <LazyRoute>
      <HistoryPage />
    </LazyRoute>
  ),
});
