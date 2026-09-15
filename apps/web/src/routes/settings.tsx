import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const SettingsPage = lazy(async () => import("./settings.lazy"));

export const Route = createFileRoute("/settings")({
  component: () => (
    <LazyRoute>
      <SettingsPage />
    </LazyRoute>
  ),
});
