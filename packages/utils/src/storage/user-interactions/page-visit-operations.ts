/**
 * Page Visit Operations Helper
 *
 * Operations for recording and querying page visits, extracted from UserInteractionsService.
 * Handles visit recording, statistics, and history queries.
 */

import type { GenericLogger } from "../../logger.js"
import type { UserInteractionsDB } from "./schema.js"
import type { PageVisitRecord, StoredNormalizedRequest } from "./types.js"

const LOG_CATEGORY = "user-interactions"

/**
 * Record a page visit with normalized OpenAlex request
 * @param db
 * @param params
 * @param params.request
 * @param params.metadata
 * @param params.metadata.sessionId
 * @param params.metadata.referrer
 * @param params.metadata.duration
 * @param params.metadata.cached
 * @param params.metadata.bytesSaved
 * @param logger
 */
export const recordPageVisit = async (db: UserInteractionsDB, params: {
		request: StoredNormalizedRequest
		metadata?: {
			sessionId?: string
			referrer?: string
			duration?: number
			cached?: boolean
			bytesSaved?: number
		}
	}, logger?: GenericLogger): Promise<void> => {
	const { request, metadata } = params
	try {
		const pageVisit: PageVisitRecord = {
			request: {
				...request,
				params: typeof request.params === 'string' ? request.params : JSON.stringify(request.params),
			},
			timestamp: new Date(),
			sessionId: metadata?.sessionId,
			referrer: metadata?.referrer,
			duration: metadata?.duration,
			cached: metadata?.cached ?? false,
			bytesSaved: metadata?.bytesSaved,
		}

		await db.pageVisits.add(pageVisit)

		logger?.debug(LOG_CATEGORY, "Page visit recorded", {
			cacheKey: request.cacheKey,
			cached: pageVisit.cached,
			duration: pageVisit.duration,
		})
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to record page visit", {
			cacheKey: request.cacheKey,
			error,
		})
	}
};

/**
 * Get recent page visits across all pages
 * @param db
 * @param limit
 * @param logger
 */
export const getRecentPageVisits = async (db: UserInteractionsDB, limit: number, logger?: GenericLogger): Promise<PageVisitRecord[]> => {
	try {
		return await db.pageVisits.orderBy("timestamp").reverse().limit(limit).toArray()
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get recent page visits", {
			error,
		})
		return []
	}
};

/**
 * Page visit statistics result type
 */
export interface PageVisitStats {
	totalVisits: number
	uniqueRequests: number
	byEndpoint: Record<string, number>
	mostVisitedRequest: {
		cacheKey: string
		count: number
	} | null
	cacheHitRate: number
}

/**
 * Get page visit statistics
 * @param db
 * @param logger
 */
export const getPageVisitStats = async (db: UserInteractionsDB, logger?: GenericLogger): Promise<PageVisitStats> => {
	try {
		const visits = await db.pageVisits.toArray()

		const totalVisits = visits.length

		const requestCounts = new Map<string, number>()
		const endpointCounts: Record<string, number> = {}
		let cachedCount = 0

		visits.forEach((visit) => {
			// Count by cache key
			const count = requestCounts.get(visit.request.cacheKey) ?? 0
			requestCounts.set(visit.request.cacheKey, count + 1)

			// Count by endpoint
			const { endpoint } = visit.request
			endpointCounts[endpoint] = (endpointCounts[endpoint] ?? 0) + 1

			// Count cached visits
			if (visit.cached) {
				cachedCount++
			}
		})

		const uniqueRequests = requestCounts.size

		let mostVisitedRequest: {
			cacheKey: string
			count: number
		} | null = null
		for (const [cacheKey, count] of requestCounts) {
			if (!mostVisitedRequest || count > mostVisitedRequest.count) {
				mostVisitedRequest = { cacheKey, count }
			}
		}

		const cacheHitRate = totalVisits > 0 ? cachedCount / totalVisits : 0

		return {
			totalVisits,
			uniqueRequests,
			byEndpoint: endpointCounts,
			mostVisitedRequest,
			cacheHitRate,
		}
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get page visit stats", {
			error,
		})
		return {
			totalVisits: 0,
			uniqueRequests: 0,
			byEndpoint: {},
			mostVisitedRequest: null,
			cacheHitRate: 0,
		}
	}
};

/**
 * Get page visits by endpoint pattern
 * @param db
 * @param endpointPattern
 * @param limit
 * @param logger
 */
export const getPageVisitsByEndpoint = async (db: UserInteractionsDB, endpointPattern: string, limit: number, logger?: GenericLogger): Promise<PageVisitRecord[]> => {
	try {
		const allVisits = await db.pageVisits.orderBy("timestamp").reverse().toArray()

		return allVisits
			.filter((visit) => visit.request.endpoint.includes(endpointPattern))
			.slice(0, limit)
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get page visits by endpoint", {
			endpointPattern,
			error,
		})
		return []
	}
};

/**
 * Popular request entry type
 */
export interface PopularRequest {
	cacheKey: string
	endpoint: string
	count: number
}

/**
 * Get popular requests from page visits
 * @param db
 * @param limit
 * @param logger
 */
export const getPopularRequests = async (db: UserInteractionsDB, limit: number, logger?: GenericLogger): Promise<PopularRequest[]> => {
	try {
		const visits = await db.pageVisits.toArray()

		const requestCounts = new Map<string, PopularRequest>()

		visits.forEach((visit) => {
			const { cacheKey, endpoint } = visit.request
			const existing = requestCounts.get(cacheKey)

			if (existing) {
				existing.count++
			} else {
				requestCounts.set(cacheKey, { cacheKey, endpoint, count: 1 })
			}
		})

		return [...requestCounts.values()]
			.sort((a, b) => b.count - a.count)
			.slice(0, limit)
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get popular requests", {
			error,
		})
		return []
	}
};
