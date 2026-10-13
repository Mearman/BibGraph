/**
 * Unit tests for touch hit-testing helpers used by graph long-press support.
 *
 * The 2D canvas maps graph coordinates to screen pixels through the canvas context transform (a scale, e/f translation, in device pixels) and the device pixel ratio. Long-press hit-testing must invert that mapping.
 */

import { describe, expect, it } from 'vitest';

import {
	findNearestNode,
	graphToCssPoint,
	LONG_PRESS_MS,
	LONG_PRESS_NODE_HIT_RADIUS_PX,
	LONG_PRESS_SLOP_PX,
} from './graph-touch';

// Reference hit radius used across the findNearestNode cases.
const HIT_RADIUS_PX = 24;

const TRANSFORM = { a: 2, e: 100, f: 50 };

describe('graphToCssPoint', () => {
	it('maps graph coordinates through the canvas transform and device pixel ratio', () => {
		// device px = a * graph + e = 2 * 50 + 100 = 200; css px = 200 / 2 (dpr) = 100
		expect(graphToCssPoint({ x: 50, y: -25 }, TRANSFORM, 2)).toEqual({ x: 100, y: 0 });
	});

	it('is the identity at unit transform and device pixel ratio', () => {
		expect(graphToCssPoint({ x: 13, y: 17 }, { a: 1, e: 0, f: 0 }, 1)).toEqual({ x: 13, y: 17 });
	});
});

describe('findNearestNode', () => {
	const nodes = [
		{ id: 'a', x: 100, y: 100 },
		{ id: 'b', x: 300, y: 100 },
		{ id: 'c', x: 300, y: 300 },
	];

	it('returns the node within the hit radius of the touch point', () => {
		expect(findNearestNode(nodes, { x: 95, y: 104 }, HIT_RADIUS_PX)?.id).toBe('a');
		expect(findNearestNode(nodes, { x: 285, y: 310 }, HIT_RADIUS_PX)?.id).toBe('c');
	});

	it('returns null when no node is within the hit radius', () => {
		expect(findNearestNode(nodes, { x: 200, y: 200 }, HIT_RADIUS_PX)).toBeNull();
	});

	it('prefers the closest node when several are in range', () => {
		expect(findNearestNode([...nodes, { id: 'd', x: 108, y: 100 }], { x: 104, y: 100 }, HIT_RADIUS_PX)?.id).toBe('a');
	});

	it('ignores nodes without positions', () => {
		expect(findNearestNode([{ id: 'unpositioned' }], { x: 0, y: 0 }, HIT_RADIUS_PX)).toBeNull();
	});
});

describe('long-press tuning constants', () => {
	it('keeps the hold, slop and hit radius within touch ergonomic ranges', () => {
		// The standard touch long-press window sits in this range; slop must stay below typical finger jitter so small movements do not cancel.
		const MIN_LONG_PRESS_WINDOW_MS = 400;
		const MAX_LONG_PRESS_WINDOW_MS = 600;
		const MIN_FINGER_JITTER_PX = 8;
		const MAX_FINGER_JITTER_PX = 16;
		const MIN_HIT_RADIUS_PX = 20;

		expect(LONG_PRESS_MS).toBeGreaterThanOrEqual(MIN_LONG_PRESS_WINDOW_MS);
		expect(LONG_PRESS_MS).toBeLessThanOrEqual(MAX_LONG_PRESS_WINDOW_MS);
		expect(LONG_PRESS_SLOP_PX).toBeGreaterThanOrEqual(MIN_FINGER_JITTER_PX);
		expect(LONG_PRESS_SLOP_PX).toBeLessThanOrEqual(MAX_FINGER_JITTER_PX);
		// The hit radius must comfortably exceed a 6px node radius.
		expect(LONG_PRESS_NODE_HIT_RADIUS_PX).toBeGreaterThanOrEqual(MIN_HIT_RADIUS_PX);
	});
});
