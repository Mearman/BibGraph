import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const SourceRoute = lazy(async () =>
  import("./$sourceId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/sources/$sourceId")({
  component: () => (
    <LazyRoute>
      <SourceRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
