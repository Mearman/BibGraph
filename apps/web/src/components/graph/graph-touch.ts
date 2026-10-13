/**
 * Touch helpers for the force-graph canvases
 *
 * Long-press is the touch replacement for the mouse right-click that opens the node context menu. Hit-testing a long-pressed finger needs the 2D canvas transform inverted (graph coordinates to CSS pixels), which these helpers do.
 */

/**
 * Hold duration (ms) after which a touch counts as a long-press.
 */
export const LONG_PRESS_MS = 500;

/**
 * Movement (CSS px) beyond which a touch is a drag and cancels the long-press.
 */
export const LONG_PRESS_SLOP_PX = 10;

/**
 * Maximum distance (CSS px) between a touch and a node centre for a hit.
 */
export const LONG_PRESS_NODE_HIT_RADIUS_PX = 24;

/**
 * The affine transform a 2D canvas context reports (device pixels).
 */
export interface CanvasTransform {
	/**
	 * Uniform zoom scale (d3-zoom applies the same scale to both axes).
	 */
	a: number;
	/**
	 * Horizontal translation (device px).
	 */
	e: number;
	/**
	 * Vertical translation (device px).
	 */
	f: number;
}

/**
 * A point in CSS pixels, relative to the canvas element.
 */
export interface CssPoint {
	x: number;
	y: number;
}

/**
 * A positioned graph node (force-graph nodes carry optional x/y).
 */
export interface PositionedNode {
	id: string;
	x?: number;
	y?: number;
}

/**
 * Map a graph-space point to canvas-relative CSS pixels through the canvas context transform and device pixel ratio.
 */
export const graphToCssPoint = (
	point: Readonly<CssPoint>,
	transform: Readonly<CanvasTransform>,
	devicePixelRatio: number
): CssPoint => ({
	x: (point.x * transform.a + transform.e) / devicePixelRatio,
	y: (point.y * transform.a + transform.f) / devicePixelRatio,
});

/**
 * Return the node closest to the CSS point within the hit radius, or null. Nodes without positions are ignored.
 */
export const findNearestNode = <T extends PositionedNode>(
	nodes: readonly T[],
	point: Readonly<CssPoint>,
	hitRadiusPx: number
): T | null => {
	let nearest: T | null = null;
	let nearestDistanceSquared = Infinity;
	const hitRadiusSquared = hitRadiusPx * hitRadiusPx;

	for (const node of nodes) {
		if (node.x === undefined || node.y === undefined) continue;
		const dx = node.x - point.x;
		const dy = node.y - point.y;
		const distanceSquared = dx * dx + dy * dy;
		if (distanceSquared <= hitRadiusSquared && distanceSquared < nearestDistanceSquared) {
			nearest = node;
			nearestDistanceSquared = distanceSquared;
		}
	}

	return nearest;
};

/**
 * Read the current transform of a 2D canvas element, or null when the element is not a 2D canvas.
 */
export const readCanvasTransform = (element: Element | null): CanvasTransform | null => {
	if (!(element instanceof HTMLCanvasElement)) return null;
	const context = element.getContext('2d');
	if (!context) return null;
	const matrix = context.getTransform();
	return { a: matrix.a, e: matrix.e, f: matrix.f };
};

/**
 * Build the synthetic contextmenu MouseEvent a long-press delivers to the node right-click handler (only clientX/clientY are consumed).
 */
export const syntheticContextMenuEvent = (clientX: number, clientY: number): MouseEvent =>
	new MouseEvent('contextmenu', { clientX, clientY, bubbles: true, cancelable: true });
