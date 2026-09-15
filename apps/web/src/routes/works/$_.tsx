import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const WorkRoute = lazy(async () => {
  const module = await import("./$_.lazy");
  return { default: module.default };
});

export const Route = createFileRoute("/works/$_")({
  component: () => (
    <LazyRoute>
      <WorkRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
