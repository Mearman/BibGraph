/**
 * Generic in-memory cache implementation
 * Provides LRU eviction and TTL support
 */

import type { GenericLogger } from "../logger.js"

interface CacheEntry<T> {
	value: T
	timestamp: number
	accessCount: number
	lastAccessed: number
	ttl?: number
}

export interface CacheStats {
	size: number
	maxSize: number
	hits: number
	misses: number
	evictions: number
	hitRate: number
}

export interface MemoryCacheConfig {
	maxSize: number
	defaultTtl?: number // milliseconds
	enableStats: boolean
}

/**
 * Generic in-memory cache with LRU eviction and TTL support
 */
export class MemoryCache<T> {
	private readonly cache = new Map<string, CacheEntry<T>>()
	private accessOrder: string[] = []
	private readonly config: MemoryCacheConfig
	private readonly stats = {
		hits: 0,
		misses: 0,
		evictions: 0,
	}

	constructor(
		config: Readonly<Partial<MemoryCacheConfig>> = {},
		private readonly logger?: GenericLogger
	) {
		this.config = {
			maxSize: 1000,
			enableStats: true,
			...config,
		}
	}

	/**
	 * Get a value from the cache
	 */
	get(key: string): T | undefined {
		const entry = this.cache.get(key)

		if (!entry) {
			if (this.config.enableStats) {
				this.stats.misses++
			}
			this.logger?.debug("cache", "Cache miss", { key })
			return undefined
		}

		// Check if entry has expired
		if (this.isExpired(entry)) {
			this.cache.delete(key)
			this.removeFromAccessOrder(key)
			if (this.config.enableStats) {
				this.stats.misses++
			}
			this.logger?.debug("cache", "Cache miss (expired)", {
				key,
				age: Date.now() - entry.timestamp,
			})
			return undefined
		}

		// Update access information
		entry.lastAccessed = Date.now()
		entry.accessCount++

		// Move to end of access order (most recently used)
		this.updateAccessOrder(key)

		if (this.config.enableStats) {
			this.stats.hits++
		}

		this.logger?.debug("cache", "Cache hit", {
			key,
			accessCount: entry.accessCount,
		})
		return entry.value
	}

	/**
	 * Set a value in the cache
	 */
	set({ key, value, ttl }: { key: string; value: T; ttl?: number }): void {
		const now = Date.now()
		const entry: CacheEntry<T> = {
			value,
			timestamp: now,
			lastAccessed: now,
			accessCount: 1,
		}

		if (ttl !== undefined) {
			entry.ttl = ttl
		} else if (this.config.defaultTtl !== undefined) {
			entry.ttl = this.config.defaultTtl
		}

		// If key already exists, update it
		if (this.cache.has(key)) {
			this.cache.set(key, entry)
			this.updateAccessOrder(key)
			this.logger?.debug("cache", "Cache updated", {
				key,
				size: this.cache.size,
			})
			return
		}

		// Check if we need to evict before adding
		if (this.cache.size >= this.config.maxSize) {
			this.evictLeastRecentlyUsed()
		}

		this.cache.set(key, entry)
		this.accessOrder.push(key)

		this.logger?.debug("cache", "Cache set", {
			key,
			size: this.cache.size,
			ttl: entry.ttl,
		})
	}

	/**
	 * Delete a value from the cache
	 */
	delete(key: string): boolean {
		const isExisted = this.cache.delete(key)
		if (isExisted) {
			this.removeFromAccessOrder(key)
			this.logger?.debug("cache", "Cache deleted", {
				key,
				size: this.cache.size,
			})
		}
		return isExisted
	}

	/**
	 * Check if a key exists in the cache (without updating access)
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key)
		return entry !== undefined && !this.isExpired(entry)
	}

	/**
	 * Clear all entries from the cache
	 */
	clear(): void {
		const { size } = this.cache
		this.cache.clear()
		this.accessOrder = []
		this.logger?.debug("cache", "Cache cleared", { previousSize: size })
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		const total = this.stats.hits + this.stats.misses
		return {
			size: this.cache.size,
			maxSize: this.config.maxSize,
			hits: this.stats.hits,
			misses: this.stats.misses,
			evictions: this.stats.evictions,
			hitRate: total > 0 ? this.stats.hits / total : 0,
		}
	}

	/**
	 * Get all cache keys
	 */
	keys(): string[] {
		return [...this.cache.keys()]
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size
	}

	/**
	 * Cleanup expired entries
	 */
	cleanup(): number {
		const before = this.cache.size
		const expiredKeys: string[] = []

		for (const [key, entry] of this.cache) {
			if (this.isExpired(entry)) {
				expiredKeys.push(key)
			}
		}

		for (const key of expiredKeys) {
			this.cache.delete(key)
			this.removeFromAccessOrder(key)
		}

		const removed = before - this.cache.size
		if (removed > 0) {
			this.logger?.debug("cache", "Cleanup completed", {
				removed,
				remaining: this.cache.size,
			})
		}

		return removed
	}

	/**
	 * Get entries matching a pattern
	 */
	getByPattern(pattern: string): Map<string, T> {
		const result = new Map<string, T>()
		const isWildcard = pattern.endsWith("*")
		const prefix = isWildcard ? pattern.slice(0, -1) : pattern

		for (const [key, entry] of this.cache) {
			if (this.isExpired(entry)) continue

			const isMatches = isWildcard ? key.startsWith(prefix) : key === pattern
			if (isMatches) {
				result.set(key, entry.value)
			}
		}

		return result
	}

	/**
	 * Delete entries matching a pattern
	 */
	deleteByPattern(pattern: string): number {
		const isWildcard = pattern.endsWith("*")
		const prefix = isWildcard ? pattern.slice(0, -1) : pattern
		const keysToDelete: string[] = []

		for (const key of this.cache.keys()) {
			const isMatches = isWildcard ? key.startsWith(prefix) : key === pattern
			if (isMatches) {
				keysToDelete.push(key)
			}
		}

		for (const key of keysToDelete) {
			this.delete(key)
		}

		if (keysToDelete.length > 0) {
			this.logger?.debug("cache", "Pattern deletion completed", {
				pattern,
				deleted: keysToDelete.length,
			})
		}

		return keysToDelete.length
	}

	private isExpired(entry: CacheEntry<T>): boolean {
		if (entry.ttl === undefined) return false
		return Date.now() - entry.timestamp > entry.ttl
	}

	private evictLeastRecentlyUsed(): void {
		if (this.accessOrder.length === 0) return

		const lruKey = this.accessOrder[0]
		this.cache.delete(lruKey)
		this.accessOrder.shift()

		if (this.config.enableStats) {
			this.stats.evictions++
		}

		this.logger?.debug("cache", "LRU eviction", {
			evictedKey: lruKey,
			size: this.cache.size,
		})
	}

	private updateAccessOrder(key: string): void {
		this.removeFromAccessOrder(key)
		this.accessOrder.push(key)
	}

	private removeFromAccessOrder(key: string): void {
		const index = this.accessOrder.indexOf(key)
		if (index !== -1) {
			this.accessOrder.splice(index, 1)
		}
	}
}
