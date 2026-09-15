import "@testing-library/jest-dom/vitest"

import { vi } from "vitest"

// Fix lru-cache ES module compatibility issue
let originalLruCache: unknown = null

try {
  originalLruCache = await import('lru-cache')
} catch {
  console.warn('lru-cache module not available during setup')
}

// Create a compatible LRUCache class that works in both CommonJS and ES module contexts
class CompatibleLRUCache<K = unknown, V = unknown> {
  private readonly cache = new Map<K, V>()
  private readonly maxSize: number

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    return this.cache.get(key)
  }

  set(key: K, value: V): this {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
    return this
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

// Type guard for lru-cache module structure
interface LruCacheModule {
  LRUCache?: typeof CompatibleLRUCache;
  default?: typeof CompatibleLRUCache;
}

const isLruCacheModule = (value: unknown): value is LruCacheModule => typeof value === 'object' && value !== null;

// Patch the lru-cache module globally before any tests run
if (isLruCacheModule(originalLruCache)) {
  originalLruCache.LRUCache ??= originalLruCache.default
  originalLruCache.LRUCache ??= CompatibleLRUCache
} else {
  vi.mock('lru-cache', () => ({
    LRUCache: CompatibleLRUCache,
    default: CompatibleLRUCache
  }))
}

// Mock problematic CSS-related packages that cause lru-cache issues
vi.mock('@asamuzakjp/css-color', () => ({
  Color: class MockColor {
    constructor(hex: string) {
      this.hex = hex || '#000000'
    }
    hex = '#000000'
    rgb() { return { r: 0, g: 0, b: 0 } }
    hsl() { return { h: 0, s: 0, l: 0 } }
    toString() { return this.hex }
  },
}))

vi.mock('@asamuzakjp/dom-selector', () => ({
  DOMSelector: class MockDOMSelector {
    select() { return [] }
    selectOne() { return null }
  },
}))

vi.mock('cssstyle', () => ({
  parse: () => ({}),
  stringify: () => '',
}))

// Mock IntersectionObserver for tests
class MockIntersectionObserver implements IntersectionObserver {
	root: Element | Document | null = null
	rootMargin = ""
	scrollMargin = ""
	thresholds: readonly number[] = []
	observe(_target: Element) {
		// Test double: intentionally a no-op, no real intersection tracking in tests.
	}
	disconnect() {
		// Test double: intentionally a no-op, nothing to tear down.
	}
	unobserve(_target: Element) {
		// Test double: intentionally a no-op, no real intersection tracking in tests.
	}
	takeRecords() {
		return []
	}
}
global.IntersectionObserver = MockIntersectionObserver

// Mock ResizeObserver for tests
class MockResizeObserver implements ResizeObserver {
	observe(_target: Element) {
		// Test double: intentionally a no-op, no real resize tracking in tests.
	}
	unobserve(_target: Element) {
		// Test double: intentionally a no-op, no real resize tracking in tests.
	}
	disconnect() {
		// Test double: intentionally a no-op, nothing to tear down.
	}
}
global.ResizeObserver = MockResizeObserver

// Mock window.matchMedia for Mantine components
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
})

// Mock clipboard API
Object.defineProperty(navigator, "clipboard", {
	value: {
		writeText: vi.fn(async () => {
			// Test double: resolves immediately, no real clipboard write in tests.
		}),
		readText: vi.fn().mockResolvedValue(""),
	},
})
