import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const SubfieldRoute = lazy(async () =>
  import("./$subfieldId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/subfields/$subfieldId")({
  component: () => (
    <LazyRoute>
      <SubfieldRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
