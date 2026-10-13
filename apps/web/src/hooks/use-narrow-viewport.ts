/**
 * useNarrowViewport - Reactive phone-width viewport detection
 *
 * Mirrors Mantine's `sm` breakpoint lower edge (the AppShell navbar drawer breakpoint) so graph layouts can switch between side-by-side and stacked arrangements exactly when the app shell does.
 */

import { useEffect, useState } from 'react';

/**
 * Matches viewports below Mantine's `sm` breakpoint minus a fraction, the same edge the AppShell uses to switch the navbar to a drawer.
 */
export const NARROW_VIEWPORT_MEDIA_QUERY = '(max-width: 47.99em)';

/**
 * Whether the current viewport is phone width. Updates live when the viewport crosses the breakpoint. jsdom (unit tests) has no matchMedia unless stubbed; a missing matchMedia is treated as a wide viewport.
 */
export const useNarrowViewport = (): boolean => {
	const [isNarrow, setIsNarrow] = useState(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
		return window.matchMedia(NARROW_VIEWPORT_MEDIA_QUERY).matches;
	});

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
		const mediaQueryList = window.matchMedia(NARROW_VIEWPORT_MEDIA_QUERY);
		const handleChange = (event: MediaQueryListEvent) => { setIsNarrow(event.matches); };
		mediaQueryList.addEventListener('change', handleChange);
		setIsNarrow(mediaQueryList.matches);
		return () => { mediaQueryList.removeEventListener('change', handleChange); };
	}, []);

	return isNarrow;
};
