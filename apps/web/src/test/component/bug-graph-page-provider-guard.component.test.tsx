/**
 * Bug regression test: /graph route crashing during same-document navigation
 *
 * EntityGraphPage threw when its GraphVisualizationContext was absent for a frame (the provider is mounted by the root layout only once the router settles on /graph), so navigating to the graph page through any in-app link (header menu, which phones rely on) bricked the page behind the error boundary. The page must render its loading state instead of throwing.
 */

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EntityGraphPage from '@/routes/graph.lazy';

describe('EntityGraphPage without GraphVisualizationProvider', () => {
	it('renders a loading state instead of throwing while the provider mounts', () => {
		expect(() => render(<MantineProvider><EntityGraphPage /></MantineProvider>)).not.toThrow();

		// GraphLoadingState renders an accessible loading indicator.
		expect(screen.getByText(/loading/iu)).toBeDefined();
	});
});
