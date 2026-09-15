/**
 * Hook for fit-to-view operations in 2D and 3D graph visualizations.
 *
 * Provides intelligent camera positioning for:
 * - Fitting all nodes to view
 * - Fitting selected (highlighted) nodes to view with optimal viewing angle
 *
 * 3D mode uses PCA analysis to find the optimal viewing direction that
 * maximizes the visible cross-sectional area of selected nodes.
 */

import { useCallback } from 'react';

/**
 * Node interface for filter callbacks.
 * Matches the node shape passed to zoomToFit filter functions.
 */
export interface FilterNode {
	id?: string | number;
	x?: number;
	y?: number;
	z?: number;
}

/**
 * Node interface with simulation positions.
 */
export interface SimulationNode {
	id?: string | number;
	x?: number;
	y?: number;
	z?: number;
}

/**
 * Graph methods interface for react-force-graph-2d/3d.
 * The library's type definitions are incomplete, so we define the full interface.
 */
export interface GraphMethods {
	// Core methods (2D and 3D)
	zoomToFit: (duration?: number, padding?: number, nodeFilter?: (node: Readonly<FilterNode>) => boolean) => void;
	centerAt?: (x: number, y: number, duration?: number) => void;
	graphData?: () => { nodes: SimulationNode[]; links: unknown[] };
	zoom?: (scale?: number, duration?: number) => number | undefined;

	// 2D-specific methods for viewport dimensions
	screen2GraphCoords?: (x: number, y: number) => { x: number; y: number };
	graph2ScreenCoords?: (x: number, y: number) => { x: number; y: number };

	// 3D-specific methods
	cameraPosition?: (
		position?: { x: number; y: number; z: number },
		lookAt?: { x: number; y: number; z: number },
		transitionDuration?: number
	) => { x: number; y: number; z: number } | undefined;
	camera?: () => {
		position: { x: number; y: number; z: number; set?: (x: number, y: number, z: number) => void };
		lookAt?: (x: number, y: number, z: number) => void;
	} | null;
	controls?: () => {
		target: { x: number; y: number; z: number; set?: (x: number, y: number, z: number) => void };
		update?: () => void;
	} | null;
	renderer?: () => {
		domElement?: { clientWidth?: number; clientHeight?: number };
	} | null;
}

export type ViewMode = '2D' | '3D';

export interface UseFitToViewOptions {
	/**
	Reference to graph methods (from react-force-graph)
	 */
	graphMethodsRef: React.RefObject<GraphMethods | null>;
	/**
	Current view mode
	 */
	viewMode: ViewMode;
	/**
	Set of highlighted node IDs
	 */
	highlightedNodes: Set<string>;
}

export interface UseFitToViewReturn {
	/**
	Fit all nodes to view
	 */
	fitToViewAll: () => void;
	/**
	Fit selected (highlighted) nodes to view
	 */
	fitToViewSelected: () => void;
}

const DEFAULT_MIN_CAMERA_DISTANCE = 100;
const MIN_BOUNDING_DIMENSION = 50;

/**
 * Calculate camera distance based on bounding box dimensions and FOV.
 * @param maxDimension - Largest dimension of the bounding box
 * @param minDistance - Minimum camera distance (default: 100)
 */
const calculateCameraDistance = (maxDimension: number, minDistance = DEFAULT_MIN_CAMERA_DISTANCE): number => {
	// FOV factor approximates 1 / tan(37.5 degrees) with padding
	const FOV_FACTOR = 1.5;
	return Math.max(maxDimension, MIN_BOUNDING_DIMENSION) * FOV_FACTOR + minDistance;
};

/**
 * Calculate 3D bounding box from node positions.
 */
const calculate3DBoundingBox = (positions: readonly { x: number; y: number; z: number }[]) => {
	let minX = Infinity,
		maxX = -Infinity;
	let minY = Infinity,
		maxY = -Infinity;
	let minZ = Infinity,
		maxZ = -Infinity;

	for (const pos of positions) {
		minX = Math.min(minX, pos.x);
		maxX = Math.max(maxX, pos.x);
		minY = Math.min(minY, pos.y);
		maxY = Math.max(maxY, pos.y);
		minZ = Math.min(minZ, pos.z);
		maxZ = Math.max(maxZ, pos.z);
	}

	return {
		min: { x: minX, y: minY, z: minZ },
		max: { x: maxX, y: maxY, z: maxZ },
		center: {
			x: (minX + maxX) / 2,
			y: (minY + maxY) / 2,
			z: (minZ + maxZ) / 2,
		},
		dimensions: {
			width: maxX - minX,
			height: maxY - minY,
			depth: maxZ - minZ,
		},
	};
};

/**
 * Calculate centroid of positions.
 */
const calculateCentroid = (positions: readonly { x: number; y: number; z: number }[]) => {
	const n = positions.length;
	if (n === 0) return { x: 0, y: 0, z: 0 };

	let sumX = 0,
		sumY = 0,
		sumZ = 0;
	for (const pos of positions) {
		sumX += pos.x;
		sumY += pos.y;
		sumZ += pos.z;
	}

	return { x: sumX / n, y: sumY / n, z: sumZ / n };
};

/**
 * Find optimal viewing direction using PCA (Principal Component Analysis).
 * Returns the direction perpendicular to the plane of maximum spread,
 * which shows the largest cross-sectional area of the nodes.
 */
const MIN_POINTS_FOR_PCA = 3;
const PCA_POWER_ITERATION_COUNT = 20;
const PCA_MAGNITUDE_EPSILON = 0.0001;

const findOptimalViewDirection = (positions: readonly { x: number; y: number; z: number }[], centroid: Readonly<{ x: number; y: number; z: number }>): {
	viewDir: { x: number; y: number; z: number };
	v1: { x: number; y: number; z: number };
	v2: { x: number; y: number; z: number };
} => {
	const n = positions.length;
	const defaultResult = {
		viewDir: { x: 0, y: 0, z: 1 },
		v1: { x: 1, y: 0, z: 0 },
		v2: { x: 0, y: 1, z: 0 },
	};

	if (n < MIN_POINTS_FOR_PCA) return defaultResult;

	// Compute covariance matrix
	let cxx = 0,
		cxy = 0,
		cxz = 0,
		cyy = 0,
		cyz = 0,
		czz = 0;
	for (const pos of positions) {
		const dx = pos.x - centroid.x;
		const dy = pos.y - centroid.y;
		const dz = pos.z - centroid.z;
		cxx += dx * dx;
		cxy += dx * dy;
		cxz += dx * dz;
		cyy += dy * dy;
		cyz += dy * dz;
		czz += dz * dz;
	}
	cxx /= n;
	cxy /= n;
	cxz /= n;
	cyy /= n;
	cyz /= n;
	czz /= n;

	// Power iteration for largest eigenvector (direction of most spread)
	let vx = 1,
		vy = 0.5,
		vz = 0.3;
	for (let iter = 0; iter < PCA_POWER_ITERATION_COUNT; iter++) {
		const newX = cxx * vx + cxy * vy + cxz * vz;
		const newY = cxy * vx + cyy * vy + cyz * vz;
		const newZ = cxz * vx + cyz * vy + czz * vz;
		const mag = Math.hypot(newX, newY, newZ);
		if (mag > PCA_MAGNITUDE_EPSILON) {
			vx = newX / mag;
			vy = newY / mag;
			vz = newZ / mag;
		}
	}
	const v1 = { x: vx, y: vy, z: vz };

	// Find second eigenvector (orthogonal to first)
	let ux = 0.3,
		uy = 1,
		uz = 0.5;
	// Make orthogonal to first
	const dot1 = ux * vx + uy * vy + uz * vz;
	ux -= dot1 * vx;
	uy -= dot1 * vy;
	uz -= dot1 * vz;
	let mag = Math.hypot(ux, uy, uz);
	if (mag > PCA_MAGNITUDE_EPSILON) {
		ux /= mag;
		uy /= mag;
		uz /= mag;
	}

	for (let iter = 0; iter < PCA_POWER_ITERATION_COUNT; iter++) {
		let newX = cxx * ux + cxy * uy + cxz * uz;
		let newY = cxy * ux + cyy * uy + cyz * uz;
		let newZ = cxz * ux + cyz * uy + czz * uz;
		// Project out first eigenvector
		const dot = newX * vx + newY * vy + newZ * vz;
		newX -= dot * vx;
		newY -= dot * vy;
		newZ -= dot * vz;
		mag = Math.hypot(newX, newY, newZ);
		if (mag > PCA_MAGNITUDE_EPSILON) {
			ux = newX / mag;
			uy = newY / mag;
			uz = newZ / mag;
		}
	}
	const v2 = { x: ux, y: uy, z: uz };

	// Third eigenvector (smallest variance) is cross product of first two
	// This is the optimal viewing direction
	let viewDir = {
		x: vy * uz - vz * uy,
		y: vz * ux - vx * uz,
		z: vx * uy - vy * ux,
	};

	// Normalize
	mag = Math.hypot(viewDir.x, viewDir.y, viewDir.z);
	if (mag > PCA_MAGNITUDE_EPSILON) {
		viewDir.x /= mag;
		viewDir.y /= mag;
		viewDir.z /= mag;
	}

	// Prefer camera to be "above" (positive y component) for intuitive viewing
	if (viewDir.y < 0) {
		viewDir = { x: -viewDir.x, y: -viewDir.y, z: -viewDir.z };
	}

	return { viewDir, v1, v2 };
};

const FIT_ALL_CENTER_DURATION_MS = 200;
const FIT_ALL_ZOOM_DURATION_MS = 300;
const FIT_ALL_ZOOM_PADDING = 100;
const FIT_ALL_ZOOM_DELAY_MS = 250;
const FIT_ALL_MIN_BOUNDING_DIMENSION_3D = 100;
const FIT_ZOOM_TO_FIT_DURATION_MS = 400;
const FIT_ZOOM_TO_FIT_PADDING = 50;
const FIT_SELECTED_MIN_BOUNDING_DIMENSION_3D = 50;
const FIT_SELECTED_MIN_CAMERA_DISTANCE = 100;
const FIT_SELECTED_CAMERA_TRANSITION_DURATION_MS = 500;

/**
 * Hook for fit-to-view operations in graph visualizations.
 */
export const useFitToView = ({
	graphMethodsRef,
	viewMode,
	highlightedNodes,
}: UseFitToViewOptions): UseFitToViewReturn => {
	/**
	 * Fit all nodes to view with proper centering.
	 */
	const fitToViewAll = useCallback(() => {
		const graph = graphMethodsRef.current;
		if (!graph?.zoomToFit) return;

		const graphNodes = graph.graphData?.().nodes ?? [];

		if (viewMode === '2D') {
			// 2D mode: calculate bounding box center, then use centerAt and zoomToFit
			if (graph.centerAt && graphNodes.length > 0) {
				let minX = Infinity,
					maxX = -Infinity;
				let minY = Infinity,
					maxY = -Infinity;

				for (const n of graphNodes) {
					const x = n.x ?? 0;
					const y = n.y ?? 0;
					minX = Math.min(minX, x);
					maxX = Math.max(maxX, x);
					minY = Math.min(minY, y);
					maxY = Math.max(maxY, y);
				}

				const centerX = (minX + maxX) / 2;
				const centerY = (minY + maxY) / 2;

				// Center on the bounding box center, then fit
				graph.centerAt(centerX, centerY, FIT_ALL_CENTER_DURATION_MS);
				setTimeout(() => {
					graph.zoomToFit(FIT_ALL_ZOOM_DURATION_MS, FIT_ALL_ZOOM_PADDING);
				}, FIT_ALL_ZOOM_DELAY_MS);
			} else {
				graph.zoomToFit(FIT_ALL_ZOOM_DURATION_MS, FIT_ALL_ZOOM_PADDING);
			}
		} else {
			// 3D mode: use manual camera positioning since zoomToFit is unreliable
			if (graph.cameraPosition && graphNodes.length > 0) {
				const positions = graphNodes.map((n) => ({
					x: n.x ?? 0,
					y: n.y ?? 0,
					z: n.z ?? 0,
				}));

				const bbox = calculate3DBoundingBox(positions);
				const maxDimension = Math.max(bbox.dimensions.width, bbox.dimensions.height, bbox.dimensions.depth, FIT_ALL_MIN_BOUNDING_DIMENSION_3D);
				const cameraDistance = calculateCameraDistance(maxDimension);

				// Directly set camera position and controls target
				const camera = graph.camera?.();
				const controls = graph.controls?.();

				if (camera && controls) {
					// Set the controls target (orbit center) to the bounding box center
					if (controls.target.set) {
						controls.target.set(bbox.center.x, bbox.center.y, bbox.center.z);
					} else {
						controls.target.x = bbox.center.x;
						controls.target.y = bbox.center.y;
						controls.target.z = bbox.center.z;
					}
					// Position camera along z-axis from center
					if (camera.position.set) {
						camera.position.set(bbox.center.x, bbox.center.y, bbox.center.z + cameraDistance);
					}
					// Make camera look at the target
					if (camera.lookAt) {
						camera.lookAt(bbox.center.x, bbox.center.y, bbox.center.z);
					}
					// Update controls
					if (controls.update) {
						controls.update();
					}
				} else {
					// Fallback to cameraPosition method with lookAt
					graph.cameraPosition(
						{ x: bbox.center.x, y: bbox.center.y, z: bbox.center.z + cameraDistance },
						{ x: bbox.center.x, y: bbox.center.y, z: bbox.center.z },
						0 // instant
					);
				}
			} else {
				// Fallback to zoomToFit
				graph.zoomToFit(FIT_ZOOM_TO_FIT_DURATION_MS, FIT_ZOOM_TO_FIT_PADDING);
			}
		}
	}, [graphMethodsRef, viewMode]);

	/**
	 * Fit selected nodes to view (or all if none selected).
	 * Uses PCA analysis in 3D mode to find optimal viewing angle.
	 */
	const fitToViewSelected = useCallback(() => {
		const graph = graphMethodsRef.current;
		if (!graph?.zoomToFit) return;

		if (highlightedNodes.size === 0) {
			fitToViewAll();
			return;
		}

		if (viewMode === '2D') {
			// 2D mode: use zoomToFit with filter
			graph.zoomToFit(FIT_ZOOM_TO_FIT_DURATION_MS, FIT_ZOOM_TO_FIT_PADDING, (node: Readonly<FilterNode>) => {
				if (node.id == null) return false;
				const nodeIdString = String(node.id);
				return highlightedNodes.has(nodeIdString);
			});
		} else {
			// 3D mode: collect node positions via zoomToFit filter, then manually position camera
			const matchedPositions: { x: number; y: number; z: number }[] = [];

			// Save current camera state to restore after zoomToFit
			const camera = graph.camera?.();
			const controls = graph.controls?.();
			const savedCameraPos = camera?.position ? { ...camera.position } : null;
			const savedTarget = controls?.target ? { ...controls.target } : null;

			// Call zoomToFit with filter to collect positions (it will also move camera)
			graph.zoomToFit(0, 0, (node: Readonly<FilterNode>) => {
				if (node.id == null) return false;
				const nodeIdString = String(node.id);
				const isMatches = highlightedNodes.has(nodeIdString);
				if (isMatches) {
					matchedPositions.push({
						x: node.x ?? 0,
						y: node.y ?? 0,
						z: node.z ?? 0,
					});
				}
				return isMatches;
			});

			// Immediately restore camera to prevent visual glitch
			if (savedCameraPos && camera?.position.set) {
				camera.position.set(savedCameraPos.x, savedCameraPos.y, savedCameraPos.z);
			}
			if (savedTarget && controls?.target.set) {
				controls.target.set(savedTarget.x, savedTarget.y, savedTarget.z);
			}
			if (controls?.update) {
				controls.update();
			}

			if (matchedPositions.length === 0) {
				fitToViewAll();
				return;
			}

			// Calculate bounding box and centroid
			const bbox = calculate3DBoundingBox(matchedPositions);
			const centroid = calculateCentroid(matchedPositions);
			const maxDimension = Math.max(bbox.dimensions.width, bbox.dimensions.height, bbox.dimensions.depth, FIT_SELECTED_MIN_BOUNDING_DIMENSION_3D);
			const cameraDistance = calculateCameraDistance(maxDimension, FIT_SELECTED_MIN_CAMERA_DISTANCE);

			// Find optimal viewing direction using PCA
			const { viewDir } = findOptimalViewDirection(matchedPositions, centroid);

			// Position camera along the optimal viewing direction
			const camX = centroid.x + viewDir.x * cameraDistance;
			const camY = centroid.y + viewDir.y * cameraDistance;
			const camZ = centroid.z + viewDir.z * cameraDistance;

			// Use cameraPosition for smooth animation
			if (graph.cameraPosition) {
				graph.cameraPosition({ x: camX, y: camY, z: camZ }, { x: centroid.x, y: centroid.y, z: centroid.z }, FIT_SELECTED_CAMERA_TRANSITION_DURATION_MS);
			}
		}
	}, [graphMethodsRef, viewMode, highlightedNodes, fitToViewAll]);

	return {
		fitToViewAll,
		fitToViewSelected,
	};
};
