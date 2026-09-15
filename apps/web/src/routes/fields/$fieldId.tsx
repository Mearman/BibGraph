import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const FieldRoute = lazy(async () =>
  import("./$fieldId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/fields/$fieldId")({
  component: () => (
    <LazyRoute>
      <FieldRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
