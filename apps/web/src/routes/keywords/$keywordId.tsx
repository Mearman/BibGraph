import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const KeywordRoute = lazy(async () =>
  import("./$keywordId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/keywords/$keywordId")({
  component: () => (
    <LazyRoute>
      <KeywordRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
