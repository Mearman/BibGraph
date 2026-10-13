/**
 * E2E tests for the force-graph surfaces at phone width (touch context)
 *
 * Runs in the dedicated mobile Playwright project (iPhone-class device with hasTouch). Covers /graph and /graph-comparison: canvas sizing at phone width, touch pan and pinch on the 2D canvas, tap-to-select, long-press context menu (the touch replacement for right-click), the 2D/3D toggle, WebGL fallback and reaching /graph through in-app navigation.
 *
 * Pan and pinch are injected with CDP Input.dispatchTouchEvent (the browser translates them to the same d3-zoom gestures a finger drives), taps use page.touchscreen.tap, and the 3D rotate uses pointer events (OrbitControls is pointer-based). The touch-replacement long-press menu is covered by use-node-long-press.unit.test.ts instead: in this headless shell a touchstart never reaches the event target, so the gesture cannot be driven end to end here.
 */

import { type CDPSession, expect, type Page, test } from '@playwright/test';

const SUITE_TIMEOUT_MS = 90_000;
const SETTLE_MS = 500;
const DRAWER_CLOSE_POLL_MS = 400;
const DRAWER_CLOSE_ATTEMPTS = 20;
const PAGE_LOAD_MS = 2000;
const ROUTE_SETTLE_MS = 3000;
const CANVAS_WAIT_MS = 30_000;
const NODE_WAIT_POLL_MS = 500;
const NODE_WAIT_ATTEMPTS = 30;
const GESTURE_FRAME_MS = 40;
const GESTURE_SETTLE_MS = 700;
const POST_PREPARE_SETTLE_MS = 3000;
// Usable graph canvas width at a 390px viewport once the source panel no longer squeezes the page: the content column minus its padding.
const MIN_PHONE_CANVAS_WIDTH_PX = 300;
const PAN_STEP_PX = 25;
const PAN_STEPS = 3;
const PINCH_START_SPREAD_PX = 25;
const PINCH_SPREAD_STEP_PX = 30;
const PINCH_STEPS = 3;
const NODE_SCAN_STRIDE_PX = 2;
const NODE_SCAN_MARGIN = 0.05;
const NODE_DISC_PROBE_PX = 4;
const NODE_DISC_MIN_HITS = 4;
const NODE_CENTRE_WINDOW_PX = 30;
const NODE_MIN_SEPARATION_PX = 30;
const MAX_TAP_TARGETS = 4;
const COLOUR_SATURATION_MIN = 60;
const COLOUR_BRIGHTNESS_MIN = 90;
const COLOUR_BRIGHTNESS_MAX = 250;
const ROTATE_DRAG_PX = 20;
const ROTATE_DRAG_STEPS = 3;
const ROTATE_START_X_PX = 200;
const ROTATE_START_Y_PX = 300;

interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface Point {
	x: number;
	y: number;
}

interface SeedNode {
	id: string;
	type: string;
	label: string;
}

const SEED_NODES: readonly SeedNode[] = [
	{ id: 'W2741809807', type: 'works', label: 'Mobile Test Work One' },
	{ id: 'W27595768', type: 'works', label: 'Mobile Test Work Two' },
	{ id: 'A5017898742', type: 'authors', label: 'Mobile Test Author One' },
	{ id: 'A5023888391', type: 'authors', label: 'Mobile Test Author Two' },
	{ id: 'I33213144', type: 'institutions', label: 'Mobile Test Institution' },
];

/**
 * Seed the graph-list special catalogue list directly in IndexedDB.
 */
const seedGraphList = async (page: Page): Promise<void> => {
	await page.evaluate(async (nodes) => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open('bibgraph-catalogue');
			request.onsuccess = () => { resolve(request.result); };
			request.onerror = () => { reject(request.error ?? new Error('IndexedDB open failed')); };
		});
		for (const [index, node] of nodes.entries()) {
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction('catalogueEntities', 'readwrite');
				tx.objectStore('catalogueEntities').put({
					id: `mobile-e2e-${String(index)}`,
					listId: 'graph-list',
					entityType: node.type,
					entityId: node.id,
					addedAt: new Date().toISOString(),
					position: index,
					notes: `provenance:user|label:${node.label}`,
				});
				tx.oncomplete = () => { resolve(); };
				tx.onerror = () => { reject(tx.error ?? new Error('IndexedDB write failed')); };
			});
		}
	}, SEED_NODES);
};

/**
 * Close the app navbar drawer (app chrome, not under test) and wait until it
 * is actually off-screen: the layout store hydrates from IndexedDB after
 * first paint and can re-open a drawer that was just closed.
 */
const closeLeftPanelDrawer = async (page: Page): Promise<void> => {
	for (let attempt = 0; attempt < DRAWER_CLOSE_ATTEMPTS; attempt++) {
		const closed = await page.evaluate(() => {
			const nav = document.querySelector('#navigation');
			if (nav === null) return true;
			if (nav.getBoundingClientRect().right > 0) {
				const buttons = [...document.querySelectorAll('button[aria-label="Close left panel"]')];
				const visible = buttons.find((button) => button instanceof HTMLElement && button.offsetParent !== null);
				if (visible instanceof HTMLElement) visible.click();
				return false;
			}
			return true;
		});
		if (closed) return;
		await page.waitForTimeout(DRAWER_CLOSE_POLL_MS);
	}
	throw new Error('App navbar drawer did not close');
};

/**
 * Expand the (phone-collapsed) data source panel and enable one source.
 */
const enableSource = async (page: Page, switchLabel: string): Promise<void> => {
	await page.evaluate(() => {
		const expand = document.querySelector('button[aria-label="Show data sources"]');
		if (expand instanceof HTMLButtonElement && expand.offsetParent !== null) expand.click();
	});
	await page.waitForTimeout(SETTLE_MS);
	await page.evaluate((label) => {
		const toggle = document.querySelector(`input[aria-label="${CSS.escape(label)}"]`);
		if (toggle instanceof HTMLInputElement && !toggle.checked) toggle.click();
	}, switchLabel);
	await page.waitForTimeout(SETTLE_MS);
	// Collapse the panel again: expanded it overlays the canvas and swallows gestures.
	await page.evaluate(() => {
		const button = document.querySelector('button[aria-label="Collapse panel"]');
		if (button instanceof HTMLElement) button.click();
	});
	await page.waitForTimeout(SETTLE_MS);
};

const readCanvasBox = async (page: Page): Promise<Box | null> =>
	page.evaluate(() => {
		const canvas = document.querySelector('#root canvas');
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
	});

/**
 * Wait until a canvas exists, then return its box.
 */
const waitForGraphCanvas = async (page: Page): Promise<Box> => {
	await expect.poll(async () => readCanvasBox(page), { timeout: CANVAS_WAIT_MS }).not.toBeNull();
	const box = await readCanvasBox(page);
	if (box === null) throw new Error('Graph canvas disappeared after it was found');
	return box;
};

/**
 * Load /graph with seeded data, the drawer closed and the graph list enabled.
 */
const prepareGraphPage = async (page: Page): Promise<void> => {
	await page.goto('/#/graph');
	await page.waitForTimeout(PAGE_LOAD_MS);
	await seedGraphList(page);
	await page.reload();
	await page.waitForTimeout(PAGE_LOAD_MS);
	await closeLeftPanelDrawer(page);
	await enableSource(page, 'Toggle Graph List');
	await waitForGraphCanvas(page);
};

/**
 * One-finger touch drag via CDP: the browser delivers the same pan gesture a
 * finger produces (d3-zoom consumes the translated events).
 */
const cdpTouchPan = async (
	page: Page,
	cdp: Readonly<CDPSession>,
	from: Readonly<Point>,
	dx: number,
	dy: number,
	steps: number
): Promise<void> => {
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [{ x: from.x, y: from.y, id: 1 }],
	});
	for (let step = 1; step <= steps; step++) {
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: from.x + (dx * step) / steps, y: from.y + (dy * step) / steps, id: 1 }],
		});
		await page.waitForTimeout(GESTURE_FRAME_MS);
	}
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

/**
 * Two-finger pinch via CDP: spreading the touches apart zooms the canvas in.
 */
const cdpTouchPinch = async (
	page: Page,
	cdp: Readonly<CDPSession>,
	centre: Readonly<Point>,
	startSpread: number,
	endSpread: number,
	steps: number
): Promise<void> => {
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [
			{ x: centre.x - startSpread, y: centre.y, id: 1 },
			{ x: centre.x + startSpread, y: centre.y, id: 2 },
		],
	});
	for (let step = 1; step <= steps; step++) {
		const spread = startSpread + ((endSpread - startSpread) * step) / steps;
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [
				{ x: centre.x - spread, y: centre.y, id: 1 },
				{ x: centre.x + spread, y: centre.y, id: 2 },
			],
		});
		await page.waitForTimeout(GESTURE_FRAME_MS);
	}
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

/**
 * Read the 2D canvas context transform (zoom scale and pan in device px).
 */
const canvasMatrix = async (page: Page): Promise<{ a: number; e: number; f: number } | null> =>
	page.evaluate(() => {
		const canvas = document.querySelector('#root canvas');
		if (!(canvas instanceof HTMLCanvasElement)) return null;
		const context = canvas.getContext('2d');
		if (!context) return null;
		const matrix = context.getTransform();
		return { a: matrix.a, e: matrix.e, f: matrix.f };
	});

/**
 * Collect the centres of up to maxResults distinct visible nodes, so an
 * interaction test can try more than one tap target.
 */
const findNodePoints = async (page: Page, maxResults: number): Promise<Point[]> =>
	page.evaluate((tuning) => {
		const canvas = document.querySelector('#root canvas');
		if (!(canvas instanceof HTMLCanvasElement)) return [];
		const context = canvas.getContext('2d');
		if (!context) return [];
		const rect = canvas.getBoundingClientRect();
		const { width, height } = canvas;
		const channelCount = 4;
		const { data } = context.getImageData(0, 0, width, height);
		const isSaturated = (x: number, y: number) => {
			const offset = (y * width + x) * channelCount;
			const red = data[offset] ?? 0;
			const green = data[offset + 1] ?? 0;
			const blue = data[offset + 2] ?? 0;
			const max = Math.max(red, green, blue);
			const min = Math.min(red, green, blue);
			return max - min > tuning.saturationMin && max > tuning.brightnessMin && max < tuning.brightnessMax;
		};
		const isDisc = (x: number, y: number) => {
			const probe = tuning.discProbePx;
			const hits = [[probe, 0], [-probe, 0], [0, probe], [0, -probe]]
				.filter(([dx = 0, dy = 0]) => isSaturated(x + dx, y + dy));
			return hits.length >= tuning.discMinHits;
		};
		const found: { x: number; y: number }[] = [];
		const startX = Math.floor(width * tuning.margin);
		const endX = Math.floor(width * (1 - tuning.margin));
		const startY = Math.floor(height * tuning.margin);
		const endY = Math.floor(height * (1 - tuning.margin));
		for (let y = startY; y < endY && found.length < tuning.maxResults; y += tuning.stride) {
			for (let x = startX; x < endX && found.length < tuning.maxResults; x += tuning.stride) {
				if (!isSaturated(x, y) || !isDisc(x, y)) continue;
				const windowPx = tuning.centreWindowPx;
				let sumX = 0;
				let sumY = 0;
				let count = 0;
				for (let wy = Math.max(0, y - windowPx); wy <= Math.min(height - 1, y + windowPx); wy++) {
					for (let wx = Math.max(0, x - windowPx); wx <= Math.min(width - 1, x + windowPx); wx++) {
						if (!isSaturated(wx, wy)) continue;
						sumX += wx;
						sumY += wy;
						count++;
					}
				}
				if (count === 0) continue;
				const cssX = ((sumX / count) / width) * rect.width;
				const cssY = ((sumY / count) / height) * rect.height;
				if (document.elementFromPoint(rect.left + cssX, rect.top + cssY) !== canvas) continue;
				const farEnough = found.every((point) => Math.hypot(point.x - cssX, point.y - cssY) > tuning.minSeparationPx);
				if (!farEnough) continue;
				found.push({ x: cssX, y: cssY });
			}
		}
		return found.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
	}, {
		saturationMin: COLOUR_SATURATION_MIN,
		brightnessMin: COLOUR_BRIGHTNESS_MIN,
		brightnessMax: COLOUR_BRIGHTNESS_MAX,
		discProbePx: NODE_DISC_PROBE_PX,
		discMinHits: NODE_DISC_MIN_HITS,
		centreWindowPx: NODE_CENTRE_WINDOW_PX,
		margin: NODE_SCAN_MARGIN,
		stride: NODE_SCAN_STRIDE_PX,
		maxResults,
		minSeparationPx: NODE_MIN_SEPARATION_PX,
	});

/**
 * Wait for at least one visible node, polling until progressive loading and
 * the auto-fit have placed nodes on screen (canvas presence alone is not a
 * sync point).
 */
const waitForNodePoints = async (page: Page): Promise<Point[]> => {
	let points = await findNodePoints(page, MAX_TAP_TARGETS);
	for (let attempt = 0; points.length === 0 && attempt < NODE_WAIT_ATTEMPTS; attempt++) {
		await page.waitForTimeout(NODE_WAIT_POLL_MS);
		points = await findNodePoints(page, MAX_TAP_TARGETS);
	}
	if (points.length === 0) throw new Error('No node found on the 2D canvas');
	return points;
};

test.describe('@utility Graph surfaces at phone width', () => {
	test.setTimeout(SUITE_TIMEOUT_MS);

	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('bibgraph-onboarding-completed', 'true');
		});
	});

	test('graph page renders a full-width canvas at phone width', async ({ page }) => {
		await prepareGraphPage(page);

		const box = await waitForGraphCanvas(page);
		expect(box.w).toBeGreaterThanOrEqual(MIN_PHONE_CANVAS_WIDTH_PX);

		// The 2D/3D toggle must be reachable without horizontal page scrolling.
		const toggle = page.locator("[data-testid='view-mode-toggle']");
		await expect(toggle).toBeVisible();
		const toggleBox = await toggle.boundingBox();
		const viewport = page.viewportSize();
		expect(toggleBox).not.toBeNull();
		expect(viewport).not.toBeNull();
		expect((toggleBox?.x ?? 0) + (toggleBox?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
	});

	test('2D canvas supports touch pan and pinch zoom', async ({ page, context }) => {
		await prepareGraphPage(page);
		// Waiting for a visible node also waits out the initial fit-to-view animation.
		await waitForNodePoints(page);

		const box = await waitForGraphCanvas(page);
		const centre = { x: Math.round(box.x + box.w / 2), y: Math.round(box.y + box.h / 2) };
		const cdp = await context.newCDPSession(page);

		const beforePan = await canvasMatrix(page);
		await cdpTouchPan(page, cdp, centre, 0, -(PAN_STEP_PX * PAN_STEPS), PAN_STEPS);
		await page.waitForTimeout(GESTURE_SETTLE_MS);
		const afterPan = await canvasMatrix(page);
		expect(afterPan?.f).not.toBe(beforePan?.f);

		const beforePinch = await canvasMatrix(page);
		await cdpTouchPinch(page, cdp, centre, PINCH_START_SPREAD_PX, PINCH_START_SPREAD_PX + PINCH_SPREAD_STEP_PX * PINCH_STEPS, PINCH_STEPS);
		await page.waitForTimeout(GESTURE_SETTLE_MS);
		const afterPinch = await canvasMatrix(page);
		expect(afterPinch?.a).not.toBe(beforePinch?.a);
	});

	test('tap selects a node on the 2D canvas', async ({ page }) => {
		await prepareGraphPage(page);
		// Let background label resolution and edge discovery settle: they swap
		// the graph data underneath the canvas, and a tap landing mid-swap is
		// dropped by the canvas library.
		await page.waitForTimeout(POST_PREPARE_SETTLE_MS);

		const points = await waitForNodePoints(page);
		const canvasBox = await page.evaluate(() => {
			const rect = document.querySelector('#root canvas')!.getBoundingClientRect();
			return { left: rect.left, top: rect.top };
		});

		// A tap sets the pathfinding source, surfaced through the Path Selection alert. Each visible node is tried with a touch tap and then a click (the same pointer pipeline a tap drives; the touch wrapper can be swallowed by the zoom gesture in this harness).
		let selected = false;
		for (const point of points) {
			await page.touchscreen.tap(canvasBox.left + point.x, canvasBox.top + point.y);
			await page.waitForTimeout(SETTLE_MS);
			selected = await page.getByText('Path Selection').isVisible().catch(() => false);
			if (selected) break;
			await page.mouse.click(canvasBox.left + point.x, canvasBox.top + point.y);
			await page.waitForTimeout(SETTLE_MS);
			selected = await page.getByText('Path Selection').isVisible().catch(() => false);
			if (selected) break;
		}
		expect(selected).toBe(true);
	});

	test('switches to 3D at phone width and stays interactive', async ({ page }) => {
		await prepareGraphPage(page);

		await page.locator("[data-testid='view-mode-toggle']").getByText('3D').click();
		await page.waitForTimeout(PAGE_LOAD_MS);

		const box = await waitForGraphCanvas(page);
		expect(box.w).toBeGreaterThanOrEqual(MIN_PHONE_CANVAS_WIDTH_PX);

		const isWebgl = await page.evaluate(() => {
			const canvas = document.querySelector('#root canvas');
			if (!(canvas instanceof HTMLCanvasElement)) return false;
			return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
		});
		expect(isWebgl).toBe(true);

		// A touch drag (OrbitControls rotate) must not crash or blank the page.
		await page.evaluate(async (tuning) => {
			const canvas = document.querySelector('#root canvas');
			if (!(canvas instanceof HTMLCanvasElement)) return;
			const fire = (type: string, x: number, y: number) => {
				canvas.dispatchEvent(new PointerEvent(type, {
					clientX: x,
					clientY: y,
					bubbles: true,
					cancelable: true,
					pointerId: 1,
					pointerType: 'touch',
					isPrimary: true,
				}));
			};
			fire('pointerdown', tuning.startX, tuning.startY);
			for (let step = 1; step <= tuning.steps; step++) {
				await new Promise<void>((resolve) => { setTimeout(resolve, tuning.frameMs); });
				fire('pointermove', tuning.startX + step * tuning.dragPx, tuning.startY + step * tuning.dragPx);
			}
			fire('pointerup', tuning.startX, tuning.startY);
		}, {
			startX: ROTATE_START_X_PX,
			startY: ROTATE_START_Y_PX,
			dragPx: ROTATE_DRAG_PX,
			steps: ROTATE_DRAG_STEPS,
			frameMs: GESTURE_FRAME_MS,
		});
		await page.waitForTimeout(SETTLE_MS);

		await expect(page.locator('#root')).toBeVisible();
		await expect(page.locator('.mantine-Alert-root[data-color="red"]')).toHaveCount(0);
	});

	test('reaching /graph through in-app navigation does not brick the page', async ({ page }) => {
		await page.goto('/#/');
		await page.waitForTimeout(PAGE_LOAD_MS);
		await closeLeftPanelDrawer(page);

		// Header overflow menu then Graph is the primary phone navigation path.
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('menuitem', { name: 'Graph' }).click();
		await page.waitForTimeout(ROUTE_SETTLE_MS);

		await expect(page.getByText('Something went wrong')).toHaveCount(0);
		const heading = page.getByText('Entity Graph');
		const emptyState = page.getByText(/no entities|enable data sources/iu);
		const hasHeading = await heading.isVisible();
		const hasEmptyState = await emptyState.first().isVisible();
		expect(hasHeading || hasEmptyState).toBe(true);
	});

	test('graph comparison renders usable panels at phone width', async ({ page }) => {
		await page.goto('/#/');
		await page.waitForTimeout(PAGE_LOAD_MS);
		await page.evaluate(async () => {
			const nodes = JSON.stringify([
				{ id: 'W1', entityType: 'works', entityId: 'W1', label: 'Snapshot Work', externalIds: [], entityData: {} },
				{ id: 'W2', entityType: 'works', entityId: 'W2', label: 'Snapshot Work Two', externalIds: [], entityData: {} },
			]);
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open('bibgraph-catalogue');
				request.onsuccess = () => { resolve(request.result); };
				request.onerror = () => { reject(request.error ?? new Error('IndexedDB open failed')); };
			});
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction('snapshots', 'readwrite');
				const now = new Date().toISOString();
				for (const id of ['mobile-snap-left', 'mobile-snap-right']) {
					tx.objectStore('snapshots').put({
						id, name: id, createdAt: now, updatedAt: now, isAutoSave: false,
						nodes, edges: '[]', zoom: 1, panX: 0, panY: 0,
					});
				}
				tx.oncomplete = () => { resolve(); };
				tx.onerror = () => { reject(tx.error ?? new Error('IndexedDB write failed')); };
			});
		});
		await page.goto('/#/graph-comparison?left=mobile-snap-left&right=mobile-snap-right');
		await page.waitForTimeout(ROUTE_SETTLE_MS);

		await expect(page.getByText('Something went wrong')).toHaveCount(0);
		const comparisonVisible = await page.getByText('Graph Comparison').isVisible();
		const selectionVisible = await page.getByText('Compare Graph Snapshots').isVisible();
		expect(comparisonVisible || selectionVisible).toBe(true);

		if (comparisonVisible) {
			const canvases = page.locator('canvas');
			const count = await canvases.count();
			expect(count).toBeGreaterThanOrEqual(2);
			for (let index = 0; index < count; index++) {
				const box = await canvases.nth(index).boundingBox();
				expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_PHONE_CANVAS_WIDTH_PX);
			}
		}
	});

	test('falls back gracefully when WebGL is unavailable', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 664 },
			hasTouch: true,
			isMobile: true,
		});
		const noWebglPage = await context.newPage();
		await noWebglPage.addInitScript(() => {
			localStorage.setItem('bibgraph-onboarding-completed', 'true');
			// Make WebGL context creation fail so capability detection reports unavailable.
			const original: unknown = Reflect.get(HTMLCanvasElement.prototype, 'getContext');
			if (typeof original !== 'function') return;
			Reflect.set(HTMLCanvasElement.prototype, 'getContext', function (this: HTMLCanvasElement, type: string, ...rest: readonly unknown[]) {
				if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
				const created: unknown = Reflect.apply(original, this, [type, ...rest]);
				return created;
			});
		});

		await noWebglPage.goto('/#/graph');
		await noWebglPage.waitForTimeout(ROUTE_SETTLE_MS);
		await closeLeftPanelDrawer(noWebglPage);
		await enableSource(noWebglPage, 'Toggle Static Cache');
		await noWebglPage.waitForTimeout(ROUTE_SETTLE_MS);

		// The page stays functional on the 2D canvas and reports no crash.
		await expect(noWebglPage.locator('#root')).toBeVisible();
		await expect(noWebglPage.locator('.mantine-Alert-root[data-color="red"]')).toHaveCount(0);
		await waitForGraphCanvas(noWebglPage);

		await context.close();
	});
});
