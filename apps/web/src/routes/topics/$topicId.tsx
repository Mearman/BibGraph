import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { z } from "zod";

import { LazyRoute } from "@/components/routing/LazyRoute";

const TopicRoute = lazy(async () =>
  import("./$topicId.lazy").then((m) => ({ default: m.default })),
);

export const Route = createFileRoute("/topics/$topicId")({
  component: () => (
    <LazyRoute>
      <TopicRoute />
    </LazyRoute>
  ),
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});
