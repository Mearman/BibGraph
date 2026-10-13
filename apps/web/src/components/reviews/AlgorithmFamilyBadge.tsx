/**
 * Family badge: marks an algorithm as a novel contribution or a baseline. The text and the icon both carry the meaning, the colour only reinforces it, so the marking survives greyscale, colour-blind viewing and the low-contrast trap of a light badge: the baseline badge is outlined with the page's own text colour rather than light grey on light grey.
 */

import { Badge } from "@mantine/core";
import { IconFlask, IconRuler2 } from "@tabler/icons-react";

import type { AlgorithmFamily } from "@/lib/algorithms/registry";

/**
 * Matches the Badge's default content height, so the icon sits on the text line without growing the badge.
 */
const ICON_SIZE = 14;

export interface AlgorithmFamilyBadgeProps {
	readonly family: AlgorithmFamily;
}

export const AlgorithmFamilyBadge = ({ family }: AlgorithmFamilyBadgeProps) =>
	family === "novel" ? (
		<Badge color="violet" variant="light" leftSection={<IconFlask size={ICON_SIZE} aria-hidden />}>
			novel
		</Badge>
	) : (
		<Badge color="gray" variant="outline" leftSection={<IconRuler2 size={ICON_SIZE} aria-hidden />}>
			baseline
		</Badge>
	);
