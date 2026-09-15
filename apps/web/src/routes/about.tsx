import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const AboutPage = lazy(async () => import("./about.lazy"));

export const Route = createFileRoute("/about")({
  component: () => (
    <LazyRoute>
      <AboutPage />
    </LazyRoute>
  ),
});
