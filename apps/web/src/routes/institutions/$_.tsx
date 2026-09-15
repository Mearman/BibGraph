import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const InstitutionRoute = lazy(async () =>
  import("./$_.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/institutions/$_")({
  component: () => (
    <LazyRoute>
      <InstitutionRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
