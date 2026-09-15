import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const FunderRoute = lazy(async () =>
  import("./$funderId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/funders/$funderId")({
  component: () => (
    <LazyRoute>
      <FunderRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
