/**
 * Shared types for cache tier implementations
 * Extracted to avoid circular dependencies
 */

import type { StaticDataResult } from "./static-data-provider";
import type { StaticEntityType } from "./static-data-utils";

/**
 * Interface for all cache tier implementations
 * Each tier provides get/has/set/clear operations and statistics
 */
export interface CacheTierInterface {
	get(entityType: StaticEntityType, id: string): Promise<StaticDataResult>;
	has(entityType: StaticEntityType, id: string): Promise<boolean>;
	set?(entityType: StaticEntityType, id: string, data: unknown): Promise<void>;
	clear?(): Promise<void>;
	getStats(): Promise<{
		requests: number;
		hits: number;
		averageLoadTime: number;
	}>;
}
