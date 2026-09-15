import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const DomainRoute = lazy(async () =>
  import("./$domainId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/domains/$domainId")({
  component: () => (
    <LazyRoute>
      <DomainRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
