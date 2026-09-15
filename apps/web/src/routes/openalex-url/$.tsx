import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "../../components/routing/LazyRoute";

const OpenAlexUrlComponent = lazy(async () => import("./$.lazy"));

export const Route = createFileRoute("/openalex-url/$")({
  component: () => (
    <LazyRoute>
      <OpenAlexUrlComponent />
    </LazyRoute>
  ),
});
