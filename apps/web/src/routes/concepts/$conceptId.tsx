import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const ConceptRoute = lazy(async () =>
  import("./$conceptId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/concepts/$conceptId")({
  component: () => (
    <LazyRoute>
      <ConceptRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
