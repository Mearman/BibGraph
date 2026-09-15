import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const PublisherRoute = lazy(async () => {
  const routeModule = await import("./$publisherId.lazy");
  return { default: routeModule.default };
});

export const Route = createFileRoute("/publishers/$publisherId")({
  component: () => (
    <LazyRoute>
      <PublisherRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
