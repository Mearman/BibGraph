import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const ReviewsRoute = lazy(async () => import("./index.lazy"));

export const Route = createFileRoute("/reviews/")({
  component: () => (
    <LazyRoute>
      <ReviewsRoute />
    </LazyRoute>
  ),
});
