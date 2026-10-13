/**
 * useNodeLongPress - Touch long-press opening the node context menu
 *
 * Phones cannot produce the right-click that opens the node context menu, so holding a finger on a node (within a small movement slop, for the standard long-press window) raises the same menu. The click that follows the lifted finger is suppressed so the long-press does not also change the selection.
 *
 * Touch events are attached natively to the container element rather than through React props: the canvas library creates the canvas the finger actually lands on, and native listeners on an ancestor receive those events regardless of which descendant dispatched them.
 */

import type { GraphNode } from '@bibgraph/types';
import { type RefObject,useCallback, useEffect, useRef } from 'react';

import { LONG_PRESS_MS, LONG_PRESS_SLOP_PX, syntheticContextMenuEvent } from './graph-touch';

export interface UseNodeLongPressOptions {
	/**
	 * Container element whose descendants deliver the touches (the graph canvas lives inside it).
	 */
	containerRef: RefObject<HTMLElement | null>;
	/**
	 * Resolve the node under the given client coordinates, or null.
	 */
	hitTest: (clientX: number, clientY: number) => GraphNode | null;
	/**
	 * Handler that opens the context menu (the right-click handler).
	 */
	onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
	/**
	 * The node click handler to guard against the click after a long-press.
	 */
	onNodeClick?: (node: GraphNode) => void;
}

export interface UseNodeLongPressResult {
	/**
	 * Wrap the node click handler: swallowed once after a long-press.
	 */
	handleNodeClick: (node: GraphNode) => void;
}

interface LongPressState {
	startX: number;
	startY: number;
	timer: number;
}

export const useNodeLongPress = ({
	containerRef,
	hitTest,
	onNodeRightClick,
	onNodeClick,
}: UseNodeLongPressOptions): UseNodeLongPressResult => {
	const hitTestRef = useRef(hitTest);
	const onNodeRightClickRef = useRef(onNodeRightClick);
	useEffect(() => {
		hitTestRef.current = hitTest;
		onNodeRightClickRef.current = onNodeRightClick;
	});

	const longPressStateRef = useRef<LongPressState | null>(null);
	const suppressNextClickRef = useRef(false);

	useEffect(() => {
		const container = containerRef.current;
		if (container === null) return undefined;

		const cancel = () => {
			const state = longPressStateRef.current;
			if (state) {
				window.clearTimeout(state.timer);
				longPressStateRef.current = null;
			}
		};

		const handleTouchStart = (event: TouchEvent) => {
			if (event.touches.length !== 1) return;
			const { clientX, clientY } = event.touches[0];
			const timer = window.setTimeout(() => {
				longPressStateRef.current = null;
				const node = hitTestRef.current(clientX, clientY);
				if (node === null) return;
				suppressNextClickRef.current = true;
				onNodeRightClickRef.current?.(node, syntheticContextMenuEvent(clientX, clientY));
			}, LONG_PRESS_MS);
			longPressStateRef.current = { startX: clientX, startY: clientY, timer };
		};

		const handleTouchMove = (event: TouchEvent) => {
			const state = longPressStateRef.current;
			if (state === null || event.touches.length === 0) return;
			const touch = event.touches[0];
			const moved = Math.hypot(touch.clientX - state.startX, touch.clientY - state.startY);
			if (moved > LONG_PRESS_SLOP_PX) cancel();
		};

		container.addEventListener('touchstart', handleTouchStart, { passive: true });
		container.addEventListener('touchmove', handleTouchMove, { passive: true });
		container.addEventListener('touchend', cancel, { passive: true });
		container.addEventListener('touchcancel', cancel, { passive: true });
		return () => {
			container.removeEventListener('touchstart', handleTouchStart);
			container.removeEventListener('touchmove', handleTouchMove);
			container.removeEventListener('touchend', cancel);
			container.removeEventListener('touchcancel', cancel);
			cancel();
		};
	}, [containerRef]);

	const handleNodeClick = useCallback(
		(node: GraphNode) => {
			if (suppressNextClickRef.current) {
				suppressNextClickRef.current = false;
				return;
			}
			onNodeClick?.(node);
		},
		[onNodeClick]
	);

	return { handleNodeClick };
};
