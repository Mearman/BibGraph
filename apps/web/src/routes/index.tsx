import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const HomePage = lazy(() => import("./index.lazy"));

export const Route = createFileRoute("/")({
  component: () => (
    <LazyRoute>
      <HomePage />
    </LazyRoute>
  ),
});
