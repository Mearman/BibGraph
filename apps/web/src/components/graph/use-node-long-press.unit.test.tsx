/**
 * Unit tests for useNodeLongPress, the touch replacement for the right-click node context menu.
 *
 * jsdom has no Touch constructor, so touchstart events are synthesised as plain events carrying a touches list. The headless browser used for e2e cannot deliver touchstart to the event target at all, so this hook is verified here rather than end to end.
 */

import type { GraphNode } from '@bibgraph/types';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNodeLongPress } from './use-node-long-press';

const HOLD_MS = 600;
// Touch coordinates used across the gesture cases.
const TOUCH_X_PX = 120;
const TOUCH_Y_PX = 80;

const NODE: GraphNode = {
	id: 'W1',
	entityType: 'works',
	entityId: 'W1',
	label: 'Node One',
	x: 0,
	y: 0,
	externalIds: [],
	entityData: {},
};

interface FakeTouch {
	clientX: number;
	clientY: number;
}

const fireTouch = (element: Element, type: 'touchstart' | 'touchmove' | 'touchend', touches: readonly FakeTouch[]): void => {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'touches', { value: touches });
	element.dispatchEvent(event);
};

const noop = (): void => { /* test double */ };

const Harness = ({
	containerRef,
	hitTest,
	onNodeRightClick,
	onNodeClick,
	onClick,
}: {
	containerRef: React.RefObject<HTMLDivElement | null>;
	hitTest: (x: number, y: number) => GraphNode | null;
	onNodeRightClick: (node: GraphNode, event: MouseEvent) => void;
	onNodeClick: (node: GraphNode) => void;
	onClick: () => void;
}) => {
	const { handleNodeClick } = useNodeLongPress({ containerRef, hitTest, onNodeRightClick, onNodeClick });
	const handleClick = (): void => {
		handleNodeClick(NODE);
		onClick();
	};
	return (
		<div ref={containerRef}>
			<canvas onClick={handleClick} />
		</div>
	);
};

const renderHarness = (
	hitTest: (x: number, y: number) => GraphNode | null,
	onNodeRightClick: (node: GraphNode, event: MouseEvent) => void,
	onNodeClick: (node: GraphNode) => void = noop
): React.RefObject<HTMLDivElement | null> => {
	const containerRef: React.RefObject<HTMLDivElement | null> = { current: null };
	render(
		<Harness
			containerRef={containerRef}
			hitTest={hitTest}
			onNodeRightClick={onNodeRightClick}
			onNodeClick={onNodeClick}
			onClick={noop}
		/>
	);
	return containerRef;
};

describe('useNodeLongPress', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('opens the context menu when a finger holds a node past the long-press window', () => {
		const onNodeRightClick = vi.fn<(node: GraphNode, event: MouseEvent) => void>();
		renderHarness(() => NODE, onNodeRightClick);
		const canvas = document.querySelector('canvas')!;

		fireTouch(canvas, 'touchstart', [{ clientX: TOUCH_X_PX, clientY: TOUCH_Y_PX }]);
		act(() => { vi.advanceTimersByTime(HOLD_MS); });

		expect(onNodeRightClick).toHaveBeenCalledTimes(1);
		const call = onNodeRightClick.mock.calls[0];
		expect(call).toBeDefined();
		expect(call[0].id).toBe('W1');
		expect(call[1].clientX).toBe(TOUCH_X_PX);
		expect(call[1].clientY).toBe(TOUCH_Y_PX);
	});

	it('does not open the menu when no node is under the finger', () => {
		const onNodeRightClick = vi.fn<(node: GraphNode, event: MouseEvent) => void>();
		renderHarness(() => null, onNodeRightClick);
		const canvas = document.querySelector('canvas')!;

		fireTouch(canvas, 'touchstart', [{ clientX: 10, clientY: 10 }]);
		act(() => { vi.advanceTimersByTime(HOLD_MS); });

		expect(onNodeRightClick).not.toHaveBeenCalled();
	});

	it('cancels the long-press when the finger moves beyond the slop', () => {
		const onNodeRightClick = vi.fn<(node: GraphNode, event: MouseEvent) => void>();
		renderHarness(() => NODE, onNodeRightClick);
		const canvas = document.querySelector('canvas')!;

		fireTouch(canvas, 'touchstart', [{ clientX: 100, clientY: 100 }]);
		fireTouch(canvas, 'touchmove', [{ clientX: 130, clientY: 100 }]);
		act(() => { vi.advanceTimersByTime(HOLD_MS); });

		expect(onNodeRightClick).not.toHaveBeenCalled();
	});

	it('swallows the click that follows a long-press, once', () => {
		const onNodeClick = vi.fn<(node: GraphNode) => void>();
		renderHarness(() => NODE, vi.fn<(node: GraphNode, event: MouseEvent) => void>(), onNodeClick);
		const canvas = document.querySelector('canvas')!;

		fireTouch(canvas, 'touchstart', [{ clientX: 50, clientY: 50 }]);
		act(() => { vi.advanceTimersByTime(HOLD_MS); });
		fireTouch(canvas, 'touchend', []);
		canvas.click();
		expect(onNodeClick).not.toHaveBeenCalled();

		// A later ordinary click still selects.
		canvas.click();
		expect(onNodeClick).toHaveBeenCalledTimes(1);
	});

	it('ignores multi-finger touches', () => {
		const onNodeRightClick = vi.fn<(node: GraphNode, event: MouseEvent) => void>();
		renderHarness(() => NODE, onNodeRightClick);
		const canvas = document.querySelector('canvas')!;

		fireTouch(canvas, 'touchstart', [
			{ clientX: 50, clientY: 50 },
			{ clientX: 200, clientY: 50 },
		]);
		act(() => { vi.advanceTimersByTime(HOLD_MS); });

		expect(onNodeRightClick).not.toHaveBeenCalled();
	});
});
