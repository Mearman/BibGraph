import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";

const ReviewRoute = lazy(async () => import("./$reviewId.lazy"));

export const Route = createFileRoute("/reviews/$reviewId")({
	component: () => (
		<LazyRoute>
			<ReviewRoute />
		</LazyRoute>
	),
});
