/**
 * Family badge: marks an algorithm as a novel contribution or a baseline. The text carries the meaning, the colour only reinforces it, so the marking survives greyscale and colour-blind viewing.
 */

import { Badge } from "@mantine/core";

import type { AlgorithmFamily } from "@/lib/algorithms/registry";

const FAMILY_COLOURS: Readonly<Record<AlgorithmFamily, string>> = {
	novel: "violet",
	baseline: "gray",
};

export interface AlgorithmFamilyBadgeProps {
	readonly family: AlgorithmFamily;
}

export const AlgorithmFamilyBadge = ({ family }: AlgorithmFamilyBadgeProps) => (
	<Badge color={FAMILY_COLOURS[family]} variant="light">
		{family}
	</Badge>
);
