/// <reference types="vite/client" />
import {
	ActionIcon,
	Alert,
	Button,
	Card,
	Code,
	Container,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Text,
	Title,
	Tooltip,
} from "@mantine/core"
import { notifications } from "@mantine/notifications"
import {
	IconAlertTriangle,
	IconBug,
	IconCheck,
	IconCopy,
	IconExternalLink,
	IconRefresh,
} from "@tabler/icons-react"
import type { ErrorInfo, ReactNode } from "react"
import * as React from "react";
import { Component } from "react";

/**
 * Radix used when converting the random error identifier to a compact base-36 string.
 */
const ERROR_ID_RADIX = 36
/**
 * Drops the "0." prefix `Math.random().toString(36)` always produces, keeping only the fractional digits as the error identifier.
 */
const ERROR_ID_SLICE_START = 7
/**
 * How long the "Copied!" tooltip state is shown after debug data is copied to the clipboard.
 */
const COPIED_STATE_RESET_DELAY_MS = 2000

export interface ErrorBoundaryProps {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: Readonly<ErrorInfo>) => void
	onReset?: () => void
	onClearCache?: () => Promise<void>
	reportUrl?: string
	showDebugInfo?: boolean
	className?: string
	"data-testid"?: string
}

interface State {
	hasError: boolean
	error: Error | undefined
	errorInfo: ErrorInfo | undefined
	errorId: string | undefined
	debugInfo: DebugInfo | undefined
	copied: boolean
	clearingCache: boolean
}

interface DebugInfo {
	timestamp: string
	userAgent: string
	url: string
	errorStack: string | undefined
	componentStack: string | undefined
	errorBoundary: string
	additionalContext: {
		reactVersion: string
		isDev: boolean
	}
}

/**
 * A robust error boundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 * @example
 * ```tsx
 * <ErrorBoundary
 *   onError={(error, errorInfo) => console.error('Error caught:', error)}
 *   reportUrl="https://github.com/your-repo/issues"
 *   showDebugInfo={import.meta.env.MODE === 'development'}
 * >
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
	private copyTimeout: ReturnType<typeof setTimeout> | undefined = undefined

	constructor(properties: ErrorBoundaryProps) {
		super(properties)
		this.state = {
			hasError: false,
			error: undefined,
			errorInfo: undefined,
			errorId: undefined,
			debugInfo: undefined,
			copied: false,
			clearingCache: false,
		}
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		// Update state so the next render will show the fallback UI
		return {
			hasError: true,
			error,
		}
	}

	componentDidCatch(error: Error, errorInfo: Readonly<ErrorInfo>): void {
		const errorId = Math.random().toString(ERROR_ID_RADIX).slice(ERROR_ID_SLICE_START)

		// Generate debug info
		const debugInfo: DebugInfo = {
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			url: window.location.href,
			errorStack: error.stack ?? undefined,
			componentStack: errorInfo.componentStack ?? undefined,
			errorBoundary: "ErrorBoundary",
			additionalContext: {
				reactVersion: React.version || "unknown",
				isDev: import.meta.env.MODE === "development",
			},
		}

		this.setState({
			errorInfo,
			errorId,
			debugInfo,
		})

		// Call external error handler
		this.props.onError?.(error, errorInfo)
	}

	private readonly handleReload = (): void => {
		window.location.reload()
	}

	private readonly handleReset = (): void => {
		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
			errorId: undefined,
			debugInfo: undefined,
			copied: false,
			clearingCache: false,
		})

		this.props.onReset?.()
	}

	private readonly handleClearCache = async (): Promise<void> => {
		if (!this.props.onClearCache) {
			notifications.show({
				title: "Cache Clear Not Available",
				message: "Cache clearing functionality is not implemented",
				color: "orange",
			})
			return
		}

		this.setState({ clearingCache: true })
		try {
			await this.props.onClearCache()
			notifications.show({
				title: "Cache Cleared",
				message: "All cached data has been cleared. Please reload the page.",
				color: "green",
			})
		} catch {
			notifications.show({
				title: "Cache Clear Failed",
				message: "Failed to clear cache. Please try reloading the page.",
				color: "red",
			})
		} finally {
			this.setState({ clearingCache: false })
		}
	}

	private readonly generateDebugData = (): string => {
		const { error, errorInfo, errorId, debugInfo } = this.state

		const debugData = {
			errorId,
			timestamp: debugInfo?.timestamp,
			error: {
				name: error?.name,
				message: error?.message,
				stack: error?.stack,
			},
			errorInfo: {
				componentStack: errorInfo?.componentStack,
			},
			environment: debugInfo?.additionalContext,
			browser: {
				userAgent: debugInfo?.userAgent,
				url: debugInfo?.url,
			},
		}

		return JSON.stringify(debugData, null, 2)
	}

	private readonly handleCopyDebugData = async (): Promise<void> => {
		try {
			const debugData = this.generateDebugData()
			await navigator.clipboard.writeText(debugData)

			this.setState({ copied: true })

			notifications.show({
				title: "Debug data copied",
				message: "Error information has been copied to your clipboard",
				color: "green",
				icon: <IconCheck size={16} />,
			})

			// Reset copied state after 2 seconds
			if (this.copyTimeout) {
				clearTimeout(this.copyTimeout)
			}

			this.copyTimeout = setTimeout(() => {
				this.setState({ copied: false })
			}, COPIED_STATE_RESET_DELAY_MS)
		} catch {
			notifications.show({
				title: "Copy failed",
				message: "Could not copy to clipboard. Please copy manually from the debug section below.",
				color: "red",
				icon: <IconAlertTriangle size={16} />,
			})
		}
	}

	componentWillUnmount(): void {
		if (this.copyTimeout) {
			clearTimeout(this.copyTimeout)
		}
	}

	render(): ReactNode {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback !== undefined) {
				return this.props.fallback
			}

			const { error, errorId, copied, clearingCache } = this.state
			const { reportUrl, showDebugInfo = false, onClearCache } = this.props

			return (
				<Container
					size="md"
					py="xl"
					className={this.props.className ?? ""}
					data-testid={this.props["data-testid"]}
				>
					<Stack gap="lg">
						{/* Header */}
						<Alert
							icon={<IconAlertTriangle size={24} />}
							title="Application Error"
							color="red"
							variant="light"
						>
							<Text size="sm">
								Something went wrong and the application encountered an unexpected error. This error has
								been logged for investigation.
							</Text>
						</Alert>

						{/* Error Details Card */}
						<Card withBorder shadow="sm">
							<Stack gap="md">
								<Group justify="space-between" align="flex-start">
									<div>
										<Title order={3} c="red">
											{error?.name ?? "Unknown Error"}
										</Title>
										<Text size="sm" c="dimmed" mt={4}>
											Error ID: {errorId}
										</Text>
									</div>
									<Group gap="xs">
										<Tooltip label={copied ? "Copied!" : "Copy debug data"}>
											<ActionIcon
												variant="light"
												color={copied ? "green" : "blue"}
												onClick={() => void this.handleCopyDebugData()}
												size="lg"
											>
												{copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
											</ActionIcon>
										</Tooltip>
									</Group>
								</Group>

								<Text c="red.7" fw={500}>
									{error?.message ?? "An unexpected error occurred"}
								</Text>

								{/* Action Buttons */}
								<Group>
									<Button
										leftSection={<IconRefresh size={16} />}
										onClick={this.handleReload}
										variant="filled"
									>
										Reload Page
									</Button>
									<Button leftSection={<IconBug size={16} />} onClick={this.handleReset} variant="light">
										Try Again
									</Button>
									{onClearCache && (
										<Button
											leftSection={<IconRefresh size={16} />}
											onClick={() => void this.handleClearCache()}
											variant="light"
											color="orange"
											loading={clearingCache}
										>
											Clear Cache
										</Button>
									)}
									{reportUrl !== undefined && reportUrl !== "" && (
										<Button
											leftSection={<IconExternalLink size={16} />}
											component="a"
											href={reportUrl}
											target="_blank"
											variant="outline"
										>
											Report Issue
										</Button>
									)}
								</Group>
							</Stack>
						</Card>

						{/* Debug Information */}
						{showDebugInfo && (
							<Card withBorder shadow="sm">
								<Stack gap="md">
									<Group align="center">
										<IconBug size={20} />
										<Title order={4}>Debug Information</Title>
									</Group>

									<Text size="sm" c="dimmed">
										This debug information is shown because debug mode is enabled. Click the copy button above
										to copy all debug data to clipboard.
									</Text>

									<Divider />

									{error?.stack !== undefined && error.stack !== "" && (
										<div>
											<Text fw={500} size="sm" mb="xs">
												Error Stack:
											</Text>
											<ScrollArea.Autosize mah={200}>
												<Code block color="red">
													{error.stack}
												</Code>
											</ScrollArea.Autosize>
										</div>
									)}

									{this.state.errorInfo?.componentStack !== undefined && this.state.errorInfo.componentStack !== "" && (
										<div>
											<Text fw={500} size="sm" mb="xs">
												Component Stack:
											</Text>
											<ScrollArea.Autosize mah={150}>
												<Code block color="orange">
													{this.state.errorInfo.componentStack}
												</Code>
											</ScrollArea.Autosize>
										</div>
									)}

									<details>
										<summary style={{ cursor: "pointer", fontWeight: 500 }}>
											<Text size="sm" component="span">
												Full Debug Data (JSON)
											</Text>
										</summary>
										<ScrollArea.Autosize mah={300} mt="xs">
											<Code block>{this.generateDebugData()}</Code>
										</ScrollArea.Autosize>
									</details>
								</Stack>
							</Card>
						)}

						{/* User Guidance */}
						<Alert icon={<IconBug size={16} />} title="What you can do:" variant="light">
							<Stack gap="xs">
								<Text size="sm">
									• <strong>Reload the page</strong> - This often resolves temporary issues
								</Text>
								<Text size="sm">
									• <strong>Try again</strong> - Reset the error state and continue using the app
								</Text>
								{onClearCache && (
									<Text size="sm">
										• <strong>Clear cache</strong> - Remove cached data that might be causing issues
									</Text>
								)}
								{reportUrl !== undefined && reportUrl !== "" && (
									<Text size="sm">
										• <strong>Report the issue</strong> - Help us improve by reporting this error
									</Text>
								)}
								{showDebugInfo && (
									<Text size="sm">
										• <strong>Copy debug data</strong> - Share technical details when reporting issues
									</Text>
								)}
							</Stack>
						</Alert>
					</Stack>
				</Container>
			)
		}

		return this.props.children
	}
}