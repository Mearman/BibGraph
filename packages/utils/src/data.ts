/**
 * Generic data manipulation utilities
 * These utilities are domain-agnostic and can be used across packages
 */

// Native JavaScript implementations replacing lodash-es

/**
 * Debounce function calls
 */
const debounce = <T extends unknown[]>(func: (...arguments_: T) => void, wait: number): (...arguments_: T) => void => {
	let timeout: NodeJS.Timeout | undefined
	return (...arguments_: T) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => { func(...arguments_); }, wait)
	}
};

/**
 * Remove duplicate items from an array by a specific key
 */
const uniqBy = <T>(array: readonly T[], key: keyof T | ((item: T) => unknown)): T[] => {
	const seen = new Set()
	return array.filter(item => {
		const k = typeof key === 'function' ? key(item) : item[key]
		if (seen.has(k)) return false
		seen.add(k)
		return true
	})
};

/**
 * Sort items by a property
 */
const sortBy = <T>(array: readonly T[], key: keyof T | ((item: T) => unknown)): T[] => [...array].sort((a, b) => {
		const aValue = typeof key === 'function' ? key(a) : a[key]
		const bValue = typeof key === 'function' ? key(b) : b[key]

		// Handle unknown types with proper comparison
		if (aValue == null && bValue == null) return 0
		if (aValue == null) return -1
		if (bValue == null) return 1

		if (typeof aValue === 'number' && typeof bValue === 'number') {
			return aValue - bValue
		}

		const aString = typeof aValue === 'string' ? aValue : JSON.stringify(aValue)
		const bString = typeof bValue === 'string' ? bValue : JSON.stringify(bValue)

		if (aString < bString) return -1
		if (aString > bString) return 1
		return 0
	});

/**
 * Group items by a property
 */
const groupBy = <T>(array: readonly T[], key: keyof T | ((item: T) => unknown)): Record<string, T[]> => {
	const groups = new Map<string, T[]>()
	for (const item of array) {
		const k = typeof key === 'function' ? key(item) : item[key]
		const groupKey = String(k)
		const existing = groups.get(groupKey)
		if (existing === undefined) {
			groups.set(groupKey, [item])
		} else {
			existing.push(item)
		}
	}
	return Object.fromEntries(groups)
};

/**
 * Create a new object without specified keys
 */
const omit = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> => {
	const result = { ...obj }
	for (const key of keys) Reflect.deleteProperty(result, key)
	return result
};

/**
 * Type guard confirming every requested key was assigned onto a partial accumulator, letting {@link pick} return a real `Pick<T, K>` without a type assertion
 */
const isCompletePick = <T extends Record<string, unknown>, K extends keyof T>(
	partial: Readonly<Partial<Record<K, unknown>>>,
	keys: readonly K[]
): partial is Pick<T, K> => keys.every((key) => key in partial);

/**
 * Create a new object with only specified keys
 */
const pick = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> => {
	const result: Partial<Record<K, unknown>> = {}
	for (const key of keys) {
		result[key] = obj[key]
	}
	if (!isCompletePick<T, K>(result, keys)) {
		throw new Error("pick: failed to assign every requested key")
	}
	return result
};

/**
 * Check if value is empty
 */
const isEmpty = (value: unknown): boolean => {
	if (value == null) return true
	if (Array.isArray(value) || typeof value === 'string') return value.length === 0
	if (typeof value === 'object') return Object.keys(value).length === 0
	return false
};

/**
 * Check if value is an array
 */
const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

/**
 * Check if value is a string
 */
const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Debounced search function for user input
 */
const DEBOUNCED_SEARCH_DELAY_MS = 300
export const debouncedSearch = debounce((searchFunction: (query: string) => void, query: string) => {
	searchFunction(query)
}, DEBOUNCED_SEARCH_DELAY_MS)

/**
 * Remove duplicate items from an array by a specific key
 */
export const removeDuplicatesBy = <T>({ array, key }: { array: T[]; key: keyof T }): T[] => uniqBy(array, key);

/**
 * Sort items by a numeric property (descending by default)
 */
export const sortByNumericProperty = <T>({
	items,
	getProperty,
	ascending = false,
}: {
	items: T[]
	getProperty: (item: T) => number | null | undefined
	ascending?: boolean
}): T[] => {
	const sorted = sortBy(items, (item) => getProperty(item) ?? 0)
	return ascending ? sorted : sorted.reverse()
};

/**
 * Sort items by a string property (ascending by default)
 */
export const sortByStringProperty = <T>(items: readonly T[], getProperty: (item: T) => string | null | undefined, ascending = true): T[] => {
	const sorted = sortBy(items, (item) => getProperty(item) ?? "")
	return ascending ? sorted : sorted.reverse()
};

/**
 * Group items by a property value
 */
export const groupByProperty = <T>(items: readonly T[], getGroupKey: (item: T) => string | number): Record<string, T[]> => groupBy(items, (item) => {
		const key = getGroupKey(item)
		return key.toString()
	});

/**
 * Extract safe properties from an object, omitting undefined/null values
 */
export const extractSafeProperties = <T extends Record<string, unknown>, K extends keyof T>({
	obj,
	keys,
}: {
	obj: T
	keys: K[]
}): Pick<T, K> => pick(obj, keys);

/**
 * Remove sensitive or unnecessary properties from objects
 */
export const sanitizeObject = <T extends Record<string, unknown>>({
	obj,
	keysToOmit,
}: {
	obj: T
	keysToOmit: (keyof T)[]
}): Omit<T, keyof T> => omit(obj, keysToOmit);

/**
 * Check if a search query is valid (not empty, not just whitespace)
 */
export const isValidSearchQuery = (query: unknown): query is string => isString(query) && query.trim().length > 0;

/**
 * Normalize search query (trim, lowercase)
 */
export const normalizeSearchQuery = (query: string): string => query.trim().toLowerCase();

/**
 * Check if an array contains valid data
 */
export const hasValidData = <T>(data: unknown): data is T[] => isArray(data) && !isEmpty(data);

/**
 * Get display name with fallback from multiple possible properties
 */
export const getDisplayName = (item: Readonly<{
		display_name?: string | null
		title?: string | null
		name?: string | null
	}>, fallback = "Untitled"): string => item.display_name ?? item.title ?? item.name ?? fallback;

/**
 * Format large numbers with K/M suffixes
 */
const ONE_MILLION = 1_000_000
const ONE_THOUSAND = 1000

export const formatLargeNumber = (num: number | null | undefined): string => {
	if (num === null || num === undefined || num === 0 || Number.isNaN(num)) return "0"

	if (num >= ONE_MILLION) {
		return `${(num / ONE_MILLION).toFixed(1)}M`
	}

	if (num >= ONE_THOUSAND) {
		return `${(num / ONE_THOUSAND).toFixed(1)}K`
	}

	return num.toString()
};

/**
 * Format percentage with specified decimal places
 */
export const formatPercentage = (value: number, decimals = 1): string => `${value.toFixed(decimals)}%`;

/**
 * Clamp a number between min and max values
 */
export const clamp = ({ value, min, max }: { value: number; min: number; max: number }): number => Math.min(Math.max(value, min), max);

/**
 * Create a range of numbers from start to end
 */
export const range = (start: number, end: number, step = 1): number[] => {
	const result: number[] = []
	for (let index = start; index < end; index += step) {
		result.push(index)
	}
	return result
};

/**
 * Chunk an array into smaller arrays of specified size
 */
export const chunk = <T>({ array, size }: { array: T[]; size: number }): T[][] => {
	const chunks: T[][] = []
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size))
	}
	return chunks
};

/**
 * Flatten a nested array by one level
 */
export const flatten = <T>(arrays: readonly T[][]): T[] => arrays.flat();

/**
 * Create a Map from an array using a key function
 */
export const arrayToMap = <T, K>({
	array,
	getKey,
}: {
	array: T[]
	getKey: (item: T) => K
}): Map<K, T> => {
	const map = new Map<K, T>()
	for (const item of array) {
		map.set(getKey(item), item)
	}
	return map
};

/**
 * Create a lookup object from an array using a key function
 */
export const arrayToLookup = <T>({
	array,
	getKey,
}: {
	array: T[]
	getKey: (item: T) => string | number
}): Record<string, T> => {
	const lookup: Record<string, T> = {}
	for (const item of array) {
		const key = getKey(item).toString()
		lookup[key] = item
	}
	return lookup
};

/**
 * Get unique values from an array
 */
export const unique = <T>(array: readonly T[]): T[] => [...new Set(array)];

/**
 * Get intersection of two arrays
 */
export const intersection = <T>({ array1, array2 }: { array1: T[]; array2: T[] }): T[] => {
	const set2 = new Set(array2)
	return array1.filter((item) => set2.has(item))
};

/**
 * Get difference between two arrays (items in first but not second)
 */
export const difference = <T>({ array1, array2 }: { array1: T[]; array2: T[] }): T[] => {
	const set2 = new Set(array2)
	return array1.filter((item) => !set2.has(item))
};

/**
 * Sample random items from an array
 */
const RANDOM_SHUFFLE_MIDPOINT = 0.5

export const sample = <T>({ array, count }: { array: T[]; count: number }): T[] => {
	if (count >= array.length) return [...array]

	const shuffled = [...array].sort(() => Math.random() - RANDOM_SHUFFLE_MIDPOINT)
	return shuffled.slice(0, count)
};

/**
 * Deep clone an object/array using structuredClone
 * Note: This only works with structuredClone-compatible data
 */
export const deepClone = <T>(obj: T): T => structuredClone(obj);

/**
 * Merge arrays and remove duplicates
 */
export const mergeUnique = <T>(...arrays: readonly T[][]): T[] => unique(flatten(arrays));

/**
 * Partition an array into two arrays based on a predicate
 */
export const partition = <T>({
	array,
	predicate,
}: {
	array: T[]
	predicate: (item: T) => boolean
}): [T[], T[]] => {
	const truthy: T[] = []
	const falsy: T[] = []

	for (const item of array) {
		if (predicate(item)) {
			truthy.push(item)
		} else {
			falsy.push(item)
		}
	}

	return [truthy, falsy]
};

/**
 * Get the maximum value in an array using a selector function
 */
export const maxBy = <T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): T | undefined => {
	if (array.length === 0) return undefined

	return array.reduce((max, current) => (selector(current) > selector(max) ? current : max), array[0])
};

/**
 * Get the minimum value in an array using a selector function
 */
export const minBy = <T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): T | undefined => {
	if (array.length === 0) return undefined

	return array.reduce((min, current) => (selector(current) < selector(min) ? current : min), array[0])
};

/**
 * Sum values in an array using a selector function
 */
export const sumBy = <T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): number => array.reduce((sum, item) => sum + selector(item), 0);

/**
 * Calculate average of values in an array using a selector function
 */
export const averageBy = <T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): number => {
	if (array.length === 0) return 0
	return sumBy({ array, selector }) / array.length
};

/**
 * Type guard narrowing an unknown value to something indexable by an arbitrary string key, mirroring the runtime behaviour of a plain object OR an array (both accept string-keyed access)
 */
const isIndexableObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * Safely access nested object properties by a dot-separated path. Returns `defaultValue` (`undefined` unless one is given) when the path does not resolve. The resolved value's real shape cannot be verified against a caller-supplied type at runtime, so this intentionally returns `unknown` rather than a generic `T` obtained via an unchecked cast.
 */
export const safeGet = ({
	obj,
	path,
	defaultValue,
}: {
	obj: unknown
	path: string
	defaultValue?: unknown
}): unknown => {
	const keys = path.split(".")
	let current = obj

	for (const key of keys) {
		if (!isIndexableObject(current)) {
			return defaultValue
		}
		current = current[key]
	}

	return current ?? defaultValue
};

/**
 * Throttle function calls
 */
export const throttle = <TArguments extends unknown[], TReturn>({
	func,
	delay,
}: {
	func: (...arguments_: TArguments) => TReturn
	delay: number
}): (...arguments_: TArguments) => TReturn | undefined => {
	let lastCall = 0
	return (...arguments_: TArguments): TReturn | undefined => {
		const now = Date.now()
		if (now - lastCall >= delay) {
			lastCall = now
			return func(...arguments_)
		}
		return undefined
	}
};
