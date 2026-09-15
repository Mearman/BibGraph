/**
 * WebGL capability detection utilities
 *
 * Provides functions to detect WebGL/WebGL2 support and hardware capabilities for graceful degradation in 3D visualization.
 */

/**
 * WebGL capability levels
 */
export type WebGLCapability = 'webgl2' | 'webgl1' | 'none'

/**
 * WebGL detection result with detailed capability information
 */
export interface WebGLDetectionResult {
	/**
	Whether WebGL is available
	 */
	available: boolean
	/**
	Capability level
	 */
	capability: WebGLCapability
	/**
	Human-readable reason if unavailable
	 */
	reason?: string
	/**
	GPU vendor (if detectable)
	 */
	vendor?: string
	/**
	GPU renderer (if detectable)
	 */
	renderer?: string
	/**
	Max texture size
	 */
	maxTextureSize?: number
	/**
	Max vertex uniform vectors
	 */
	maxVertexUniforms?: number
	/**
	Antialiasing supported
	 */
	antialiasSupported?: boolean
}

/**
 * Cached detection result to avoid repeated canvas creation
 */
let cachedResult: WebGLDetectionResult | null = null

/**
 * Get a human-readable message for WebGL unavailability
 */
const detectWebGLUnavailableReason = (): string => {
	if (typeof window === 'undefined') {
		return 'WebGL requires a browser environment'
	}

	// Check if running in a context that blocks WebGL
	const canvas = document.createElement('canvas')

	try {
		const context = canvas.getContext('webgl2') ??
			canvas.getContext('webgl') ??
			canvas.getContext('experimental-webgl')

		if (!context) {
			// Check for common reasons
			if (navigator.userAgent.includes('HeadlessChrome')) {
				return 'WebGL is disabled in headless browser mode'
			}

			// Check for hardware acceleration
			const userAgent = navigator.userAgent.toLowerCase()
			if (userAgent.includes('swiftshader') || userAgent.includes('llvmpipe')) {
				return 'Software rendering detected - hardware acceleration may be disabled'
			}

			return 'WebGL is not supported by your browser. Try updating your browser or enabling hardware acceleration.'
		}
	} catch (e) {
		return `WebGL initialization failed: ${e instanceof Error ? e.message : 'Unknown error'}`
	}

	return 'WebGL is not available for unknown reasons'
};

/**
 * Type guard confirming a canvas rendering context is genuinely a WebGL context, needed because `getContext('experimental-webgl')` isn't a recognised overload in the DOM lib types and so resolves to the generic `RenderingContext` type
 */
const isWebGLRenderingContext = (context: unknown): context is WebGLRenderingContext =>
	typeof WebGLRenderingContext !== 'undefined' && context instanceof WebGLRenderingContext

/**
 * Detect WebGL capabilities in the current browser environment
 * @returns Detection result with capability information
 */
export const detectWebGLCapabilities = (): WebGLDetectionResult => {
	// Return cached result if available
	if (cachedResult !== null) {
		return cachedResult
	}

	// Server-side rendering check
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		cachedResult = {
			available: false,
			capability: 'none',
			reason: 'Server-side rendering detected - WebGL requires browser environment',
		}
		return cachedResult
	}

	// Create offscreen canvas for testing
	const canvas = document.createElement('canvas')

	// Try WebGL2 first (preferred)
	let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
	let capability: WebGLCapability = 'none'

	try {
		gl = canvas.getContext('webgl2')
		if (gl) {
			capability = 'webgl2'
		}
	} catch {
		// WebGL2 not available
	}

	// Fall back to WebGL1
	if (!gl) {
		try {
			const webglContext = canvas.getContext('webgl')
			if (webglContext) {
				gl = webglContext
			} else {
				const experimentalContext = canvas.getContext('experimental-webgl')
				gl = isWebGLRenderingContext(experimentalContext) ? experimentalContext : null
			}
			if (gl) {
				capability = 'webgl1'
			}
		} catch {
			// WebGL1 not available
		}
	}

	// WebGL not available
	if (!gl) {
		cachedResult = {
			available: false,
			capability: 'none',
			reason: detectWebGLUnavailableReason(),
		}
		return cachedResult
	}

	// Get hardware information
	const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
	const vendorParam: unknown = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined
	const vendor = typeof vendorParam === 'string' ? vendorParam : undefined
	const rendererParam: unknown = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined
	const renderer = typeof rendererParam === 'string' ? rendererParam : undefined

	// Get capabilities
	const maxTextureSizeParam: unknown = gl.getParameter(gl.MAX_TEXTURE_SIZE)
	const maxTextureSize = typeof maxTextureSizeParam === 'number' ? maxTextureSizeParam : undefined
	const maxVertexUniformsParam: unknown = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
	const maxVertexUniforms = typeof maxVertexUniformsParam === 'number' ? maxVertexUniformsParam : undefined

	// Check antialias support
	const isAntialiasSupported = gl.getContextAttributes()?.antialias ?? false

	// Cleanup
	const loseContext = gl.getExtension('WEBGL_lose_context')
	if (loseContext) {
		loseContext.loseContext()
	}

	cachedResult = {
		available: true,
		capability,
		vendor,
		renderer,
		maxTextureSize,
		maxVertexUniforms,
		antialiasSupported: isAntialiasSupported,
	}

	return cachedResult
};

/**
 * Simple check for WebGL availability
 */
export const isWebGLAvailable = (): boolean => detectWebGLCapabilities().available;

/**
 * Check specifically for WebGL2 availability
 */
export const isWebGL2Available = (): boolean => detectWebGLCapabilities().capability === 'webgl2';

/**
 * Reset the cached detection result (useful for testing)
 */
export const resetWebGLDetectionCache = (): void => {
	cachedResult = null
};

const HIGH_END_TEXTURE_SIZE_THRESHOLD = 16_384
const MAX_STANDARD_PIXEL_RATIO = 2
export const LOW_POWER_MAX_NODES = 500
export const HIGH_END_MAX_NODES = 2000
export const STANDARD_MAX_NODES = 1000

/**
 * Get recommended renderer settings based on WebGL capabilities
 */
export const getRecommendedRendererSettings = (result: Readonly<WebGLDetectionResult>): {
	antialias: boolean
	pixelRatio: number
	shadowMapEnabled: boolean
	maxNodes: number
} => {
	if (!result.available) {
		return {
			antialias: false,
			pixelRatio: 1,
			shadowMapEnabled: false,
			maxNodes: 0,
		}
	}

	// Check for low-powered devices
	const rendererLower = result.renderer?.toLowerCase()
	const isLowPower = rendererLower !== undefined && (
		rendererLower.includes('intel') ||
		rendererLower.includes('swiftshader') ||
		rendererLower.includes('mesa')
	)

	// Check texture size as proxy for GPU capability
	const isHighEnd = (result.maxTextureSize ?? 0) >= HIGH_END_TEXTURE_SIZE_THRESHOLD

	return {
		antialias: result.antialiasSupported ?? false,
		pixelRatio: isHighEnd ? Math.min(window.devicePixelRatio, MAX_STANDARD_PIXEL_RATIO) : 1,
		shadowMapEnabled: !isLowPower && result.capability === 'webgl2',
		maxNodes: isLowPower ? LOW_POWER_MAX_NODES : (isHighEnd ? HIGH_END_MAX_NODES : STANDARD_MAX_NODES),
	}
};
