import { logger } from "./logger.js";

export interface NavigationConfig {
	entityType: string;
	routePath: string;
	logContext?: string;
}

export interface EntityNavigator {
	handleMalformedUrl: (
		entityId: string,
		navigate: (options: { to: string; params: Record<string, string>; replace: boolean }) => void
	) => void;
}

/**
 * Navigation helper for handling entity routes and URL cleanup
 */
export const NavigationHelper = {
	createEntityNavigator: (config: Readonly<NavigationConfig>): EntityNavigator => {
		const { entityType, logContext = "EntityRoute" } = config;

		return {
			handleMalformedUrl: (
				entityId: string
			) => {
				// This is a placeholder implementation
				// In a real scenario, this would handle malformed URLs and redirect to correct ones
				logger.debug("navigation", `Checking malformed URL for ${entityType}:${entityId}`, {
					logContext,
					entityId,
					entityType,
				});

				// For now, we'll just log that we checked
				// The actual implementation would check for malformed URLs and redirect
			},
		};
	},

	createUrlRedirect: (fromPath: string, toPath: string, parameters: Readonly<Record<string, string>>): { to: string; params: Record<string, string>; replace: boolean } => ({
			to: toPath,
			params: { ...parameters },
			replace: true,
		}),
};