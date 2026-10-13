/**
 * useCanvasPanPolling - Report the 2D canvas pan transform to the mini-map
 *
 * react-force-graph exposes no pan-change event, so the canvas' CSS transform is polled and parsed for its translate component.
 */

import { type RefObject,useEffect } from 'react';

// Polling interval (ms) for reading the canvas pan transform (react-force-graph exposes no pan-change event).
const PAN_POLL_INTERVAL_MS = 100;

export const useCanvasPanPolling = (
	containerRef: RefObject<HTMLDivElement | null>,
	onPan: ((x: number, y: number) => void) | undefined
): void => {
	useEffect(() => {
		if (!onPan || !containerRef.current) return undefined;

		// Poll for camera position changes
		const interval = setInterval(() => {
			try {
				// Access canvas through container
				const canvas = containerRef.current?.querySelector('canvas');
				if (!canvas) return;

				// Get transformation matrix from canvas
				const transform = canvas.style.transform;
				if (!transform) return;

				// Parse transform: "translate(x, y) scale(z)" Split by parentheses to extract translate values
				const translatePrefix = 'translate(';
				const translateStart = transform.indexOf(translatePrefix);
				if (translateStart === -1) return;

				const translateEnd = transform.indexOf(')', translateStart);
				if (translateEnd === -1) return;

				const valuesString = transform.slice(translateStart + translatePrefix.length, translateEnd);
				const values = valuesString.split(',').map(v => v.trim());

				if (values.length >= 2) {
					const panX = Number.parseFloat(values[0]) || 0;
					const panY = Number.parseFloat(values[1]) || 0;
					onPan(panX, panY);
				}
			} catch {
				// Canvas might not be ready or transform not available
			}
		}, PAN_POLL_INTERVAL_MS);

		return () => { clearInterval(interval); };
	}, [onPan, containerRef]);
};
