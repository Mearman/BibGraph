/**
 * Generic logger implementation for BibGraph packages
 * This is a generic logger that doesn't depend on any domain-specific types
 */

// Logger types - kept generic for reuse across packages
export type LogLevel = "debug" | "info" | "warn" | "error"

// Generic categories - packages can extend this as needed
export type LogCategory = string // Allow extension by packages

export interface LogEntry {
	id: string
	timestamp: Date
	level: LogLevel
	category: LogCategory
	message: string
	data?: unknown
	component?: string
	stack?: string
}

// Logger configuration
interface LoggerConfig {
	maxLogs: number
	enableConsoleOutput: boolean
	enableDebugLogs: boolean
}

const RANDOM_ID_RADIX = 36
const RANDOM_ID_SLICE_START = 7

// Generic Logger class
export class GenericLogger {
	private logs: LogEntry[] = []
	private listeners: ((logs: readonly LogEntry[]) => void)[] = []
	private config: LoggerConfig = {
		maxLogs: 1000,
		enableConsoleOutput: true,
		enableDebugLogs: true,
	}

	log(level: LogLevel, category: LogCategory, message: string, data?: unknown, component?: string) {
		// Skip debug logs if disabled
		if (level === "debug" && !this.config.enableDebugLogs) {
			return
		}

		const entry: LogEntry = {
			id: Math.random().toString(RANDOM_ID_RADIX).slice(RANDOM_ID_SLICE_START),
			timestamp: new Date(),
			level,
			category,
			message,
			data,
		}

		if (component !== undefined) {
			entry.component = component
		}

		if (level === "error") {
			const { stack } = new Error()
			if (stack !== undefined) {
				entry.stack = stack
			}
		}

		this.logs.unshift(entry)

		// Keep only recent logs
		if (this.logs.length > this.config.maxLogs) {
			this.logs = this.logs.slice(0, this.config.maxLogs)
		}

		// Notify listeners
		for (const listener of this.listeners) {
			listener([...this.logs])
		}

		// Also log to console if enabled
		if (this.config.enableConsoleOutput) {
			const logMessage = `[${category}] ${message}`
			const logData = data ?? ""

			switch (level) {
			case "debug": {
				console.debug(logMessage, logData)
			
			break;
			}
			case "info": {
				console.info(logMessage, logData)
			
			break;
			}
			case "warn": {
				console.warn(logMessage, logData)

			break;
			}
			case "error": {
				console.error(logMessage, logData)

			break;
			}
			}
		}
	}

	debug(category: LogCategory, message: string, data?: unknown, component?: string) {
		this.log("debug", category, message, data, component)
	}

	info(category: LogCategory, message: string, data?: unknown, component?: string) {
		this.log("info", category, message, data, component)
	}

	warn(category: LogCategory, message: string, data?: unknown, component?: string) {
		this.log("warn", category, message, data, component)
	}

	error(category: LogCategory, message: string, data?: unknown, component?: string) {
		this.log("error", category, message, data, component)
	}

	subscribe(listener: (logs: readonly LogEntry[]) => void) {
		this.listeners.push(listener)
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener)
		}
	}

	getLogs() {
		return [...this.logs]
	}

	clear() {
		this.logs = []
		for (const listener of this.listeners) {
			listener([])
		}
	}

	updateConfig(newConfig: Readonly<Partial<LoggerConfig>>) {
		this.config = { ...this.config, ...newConfig }
	}

	exportLogs() {
		const data = JSON.stringify(this.logs, null, 2)
		const blob = new Blob([data], { type: "application/json" })
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = `logs-${new Date().toISOString().split("T", 1)[0]}.json`
		document.body.append(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	}

	configure(config: Readonly<Partial<LoggerConfig>>) {
		this.config = { ...this.config, ...config }
	}

	getConfig() {
		return { ...this.config }
	}
}

// Helper function to safely convert unknown error to Error object
const toError = (error: unknown): Error => {
	if (error instanceof Error) return error

	// Capture stack trace to find actual caller
	console.error("toError called with non-Error:", error, "Stack:", new Error().stack)

	// Convert string errors to Error objects preserving the message
	if (typeof error === "string") {
		return new Error(error)
	}

	// Simple fallback without any complex operations
	return new Error("Unknown error occurred")
}

const HTTP_ERROR_STATUS_THRESHOLD = 400
const HTTP_WARN_STATUS_THRESHOLD = 300

// Convenience functions for common logging patterns
export const createApiLogger = (logger: GenericLogger) => ({
	logRequest: (url: string, method: string, status?: number, responseTime?: number) => {
		const level = status !== undefined && status >= HTTP_ERROR_STATUS_THRESHOLD
			? "error"
			: status !== undefined && status >= HTTP_WARN_STATUS_THRESHOLD
				? "warn"
				: "debug"
		logger.log(level, "api", `${method} ${url}${status !== undefined ? ` - ${String(status)}` : ""}`, {
			url,
			method,
			status,
			responseTime,
		})
	},
})

export const createCacheLogger = (logger: GenericLogger) => ({
	logHit: (key: string, source: "memory" | "indexeddb" | "localstorage") => {
		logger.debug("cache", `Cache hit: ${key} from ${source}`, { key, source, hit: true })
	},
	logMiss: (key: string) => {
		logger.debug("cache", `Cache miss: ${key}`, { key, hit: false })
	},
})

export const createStorageLogger = (logger: GenericLogger) => ({
	logOperation: (operation: "read" | "write" | "delete", key: string, size?: number) => {
		logger.debug("storage", `Storage ${operation}: ${key}${size !== undefined ? ` (${String(size)} bytes)` : ""}`, {
			operation,
			key,
			size,
		})
	},
})

export const logError = (
	logger: GenericLogger,
	message: string,
	error: unknown,
	component?: string,
	category: LogCategory = "general"
) => {
	const errorObject = toError(error)
	logger.error(
		category,
		message,
		{
			name: errorObject.name,
			message: errorObject.message,
			stack: errorObject.stack,
		},
		component
	)
}

/**
 * Extracts a human-readable message from an unhandled promise rejection reason, which arrives typed `any` from the DOM lib and cannot be trusted without narrowing
 */
const getRejectionMessage = (reason: unknown): string => {
	if (reason instanceof Error) return reason.message
	if (typeof reason === "object" && reason !== null && "message" in reason && typeof reason.message === "string") {
		return reason.message
	}
	return "Unhandled promise rejection"
}

/**
 * Extracts a name from an unhandled promise rejection reason (see {@link getRejectionMessage})
 */
const getRejectionName = (reason: unknown): string => {
	if (reason instanceof Error) return reason.name
	if (typeof reason === "object" && reason !== null && "name" in reason && typeof reason.name === "string") {
		return reason.name
	}
	return "PromiseRejection"
}

/**
 * Send error data to PostHog for analytics Privacy-compliant error tracking without sensitive data
 */
interface PostHogErrorData {
	error_type: string
	error_category: string
	component_name: string
	error_message: string
	error_name?: string
	error_filename?: string
	error_line?: number
	error_column?: number
	user_agent_group: string
	timestamp: string
}

interface PostHogClient {
	capture: (eventName: string, properties: unknown) => void
}

const isPostHogClient = (value: unknown): value is PostHogClient => {
	if (typeof value !== 'object' || value === null) return false
	if (!('capture' in value)) return false
	return typeof value.capture === 'function'
}

/**
 * Get user agent group for analytics (privacy-friendly grouping)
 */
const getUserAgentGroup = (): string => {
	if (typeof navigator === 'undefined') return 'unknown';
	const userAgent = navigator.userAgent.toLowerCase();
	if (userAgent.includes('chrome')) return 'chrome';
	if (userAgent.includes('firefox')) return 'firefox';
	if (userAgent.includes('safari')) return 'safari';
	if (userAgent.includes('edge')) return 'edge';
	return 'other';
};

/**
 * Reads the PostHog client off the global window, which has no statically-declared `posthog` property (it's injected at runtime by the PostHog snippet) -- narrows through `unknown` rather than asserting a shape onto it
 */
const getGlobalPostHogClient = (win: unknown): PostHogClient | undefined => {
	if (typeof win !== 'object' || win === null || !('posthog' in win)) {
		return undefined
	}
	const { posthog } = win
	return isPostHogClient(posthog) ? posthog : undefined
}

const sendErrorToPostHog = (errorData: Readonly<PostHogErrorData>) => {
	try {
		if (typeof window === 'undefined') return

		const posthog = getGlobalPostHogClient(window)
		if (posthog) {
			posthog.capture('error_occurred', errorData);
		}
	} catch (analyticsError) {
		// Don't let analytics errors break the error handler
		console.warn('Failed to send global error to PostHog:', analyticsError);
	}
};

// Global error handler setup - generic for any browser environment
export const setupGlobalErrorHandling = (logger: GenericLogger) => {
	// Handle unhandled promise rejections
	window.addEventListener("unhandledrejection", (event) => {
		try {
			logError(logger, "Unhandled promise rejection", event.reason, "global")

			// Send to PostHog if available
			sendErrorToPostHog({
				error_type: 'promise_rejection',
				error_category: 'javascript_error',
				component_name: 'GlobalErrorHandler',
				error_message: getRejectionMessage(event.reason),
				error_name: getRejectionName(event.reason),
				user_agent_group: getUserAgentGroup(),
				timestamp: new Date().toISOString(),
			})
		} catch {
			// Fallback to console if logging fails to prevent infinite loops
			console.error("Unhandled promise rejection (logger failed):", event.reason)
		}
	})

	// Handle JavaScript errors
	window.addEventListener("error", (event) => {
		const errorMessage = event.error instanceof Error ? event.error.message : event.message

		// Filter out benign ResizeObserver errors
		if (
			typeof errorMessage === "string" &&
			errorMessage.includes("ResizeObserver loop completed with undelivered notifications")
		) {
			// This is a benign browser warning that occurs when ResizeObserver callbacks take too long or trigger layout changes. It's not actionable and doesn't indicate a real error in the application.
			return
		}

		logError(
			logger,
			"JavaScript error",
			event.error instanceof Error ? event.error : new Error(event.message),
			event.filename
		)

		// Send to PostHog if available
		sendErrorToPostHog({
			error_type: 'javascript_error',
			error_category: 'javascript_error',
			component_name: 'GlobalErrorHandler',
			error_message: errorMessage,
			error_filename: event.filename,
			error_line: event.lineno,
			error_column: event.colno,
			user_agent_group: getUserAgentGroup(),
			timestamp: new Date().toISOString(),
		})
	})

	logger.debug("general", "Global error handling initialized", {}, "setupGlobalErrorHandling")
}

// Export a singleton logger instance for simple usage
export const logger = new GenericLogger()
