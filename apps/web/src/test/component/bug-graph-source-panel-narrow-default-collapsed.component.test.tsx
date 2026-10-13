/**
 * Bug regression test: graph source panel squeezing the graph to a sliver at phone width
 *
 * GraphSourcePanel rendered as a fixed 280px column beside the graph at every viewport width, so at 390px the force-graph canvas was left roughly 40px wide. On narrow viewports the panel must default to collapsed and, when the user expands it, overlay the graph instead of squeezing it.
 */

import type { GraphDataSourceState, GraphSourceCategory } from '@bibgraph/utils';
import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GraphSourcePanel } from '@/components/graph/GraphSourcePanel';

interface MediaQueryListMock {
	matches: boolean;
	media: string;
	addEventListener: (type: string, listener: (event: Readonly<{ matches: boolean }>) => void) => void;
	removeEventListener: (type: string, listener: (event: Readonly<{ matches: boolean }>) => void) => void;
}

/**
Entity count the mocked static-cache source reports.
 */
const STATIC_CACHE_ENTITY_COUNT = 12;

const installMatchMedia = (narrow: boolean) => {
	const listeners: ((event: Readonly<{ matches: boolean }>) => void)[] = [];
	const mql: MediaQueryListMock = {
		matches: narrow,
		media: '(max-width: 47.99em)',
		addEventListener: (_type, listener) => { listeners.push(listener); },
		removeEventListener: (_type, listener) => {
			const index = listeners.indexOf(listener);
			if (index !== -1) listeners.splice(index, 1);
		},
	};
	vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
	return { mql, listeners };
};

const makeSource = (id: string, label: string, category: GraphSourceCategory, entityCount: number): GraphDataSourceState => ({
	source: {
		id,
		label,
		category,
		getEntities: async () => { await Promise.resolve(); return []; },
		getEntityCount: async () => { await Promise.resolve(); return entityCount; },
		isAvailable: async () => { await Promise.resolve(); return true; },
	},
	entityCount,
	enabled: false,
	loading: false,
	error: null,
});

const sources: GraphDataSourceState[] = [
	makeSource('catalogue:bookmarks', 'Bookmarks', 'catalogue', 0),
	makeSource('cache:static', 'Static Cache', 'cache', STATIC_CACHE_ENTITY_COUNT),
];

const renderPanel = () => render(
	<MantineProvider>
		<GraphSourcePanel
			sources={sources}
			enabledSourceIds={new Set(['catalogue:bookmarks'])}
			onToggleSource={() => undefined}
			onEnableAll={() => undefined}
			onDisableAll={() => undefined}
			onRefresh={() => undefined}
		/>
	</MantineProvider>
);

describe('GraphSourcePanel on narrow viewports', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('defaults to collapsed when the viewport is phone width', () => {
		installMatchMedia(true);
		renderPanel();

		// Collapsed state exposes the "show sources" expander instead of the list.
		expect(screen.getByRole('button', { name: 'Show data sources' })).toBeDefined();
		expect(screen.queryByText('Enable All')).toBeNull();
	});

	it('defaults to expanded on wide viewports', () => {
		installMatchMedia(false);
		renderPanel();

		expect(screen.getByText('Enable All')).toBeDefined();
	});

	it('overlays the graph instead of squeezing it when expanded on a narrow viewport', () => {
		installMatchMedia(true);
		renderPanel();

		fireEvent.click(screen.getByRole('button', { name: 'Show data sources' }));

		// Expanded on narrow: the panel is an overlay with absolute positioning.
		const panel = screen.getByText('Data Sources').closest('.mantine-Paper-root');
		expect(panel).not.toBeNull();
		expect(panel instanceof HTMLElement ? getComputedStyle(panel).position : '').toBe('absolute');
	});

	it('stays an in-flow column when expanded on a wide viewport', () => {
		installMatchMedia(false);
		renderPanel();

		const panel = screen.getByText('Data Sources').closest('.mantine-Paper-root');
		expect(panel).not.toBeNull();
		const position = panel instanceof HTMLElement ? getComputedStyle(panel).position : '';
		expect(position).not.toBe('absolute');
	});
});
