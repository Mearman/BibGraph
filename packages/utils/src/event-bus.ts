/**
 * Event System Types and Utilities
 * Exports for the unified event bus system
 */
import { logger } from "./logger.js"

// Event types enum
export enum GraphEventType {
	ANY_NODE_ADDED = "GRAPH_ANY_NODE_ADDED",
	BULK_NODES_ADDED = "GRAPH_BULK_NODES_ADDED",
	ANY_NODE_REMOVED = "GRAPH_ANY_NODE_REMOVED",
	ANY_EDGE_ADDED = "GRAPH_ANY_EDGE_ADDED",
	BULK_EDGES_ADDED = "GRAPH_BULK_EDGES_ADDED",
	FORCE_LAYOUT_RESTART = "GRAPH_FORCE_LAYOUT_RESTART",
	GRAPH_CLEARED = "GRAPH_CLEARED",
}

export enum EntityEventType {
	ENTITY_REMOVED = "ENTITY_REMOVED",
	ENTITY_EXPANDED = "ENTITY_EXPANDED",
}

export enum WorkerEventType {
	TASK_STARTED = "WORKER_TASK_STARTED",
	TASK_COMPLETED = "WORKER_TASK_COMPLETED",
	TASK_FAILED = "WORKER_TASK_FAILED",
	TASK_PROGRESS = "WORKER_TASK_PROGRESS",
	FORCE_SIMULATION_PROGRESS = "WORKER_FORCE_SIMULATION_PROGRESS",
	FORCE_SIMULATION_COMPLETE = "WORKER_FORCE_SIMULATION_COMPLETE",
	FORCE_SIMULATION_ERROR = "WORKER_FORCE_SIMULATION_ERROR",
	DATA_FETCH_PROGRESS = "data-fetch-progress",
	DATA_FETCH_COMPLETE = "data-fetch-complete",
	DATA_FETCH_ERROR = "data-fetch-error",
	WORKER_READY = "WORKER_READY",
	WORKER_ERROR = "WORKER_ERROR",
}

// Event interfaces
export interface Event {
	type: string
	payload?: unknown
	timestamp?: number
}

export type EventHandler = (event: Event) => void

// EventBus interface
export interface EventBus {
	on: (eventType: string, handler: EventHandler) => string
	off: (eventType: string, handler: EventHandler) => void
	emit: (event: Event) => void
	close: () => void
	isBroadcasting: () => boolean
}

// Task system types
export enum TaskStatus {
	PENDING = "pending",
	RUNNING = "running",
	COMPLETED = "completed",
	FAILED = "failed",
	CANCELLED = "cancelled",
}

export interface TaskDescriptor {
	id: string
	type: string
	payload: unknown
	priority?: number
	timeout?: number
}

export interface TaskResult {
	id: string
	duration: number
	executedBy: "main" | "worker"
	result?: unknown
	error?: string
}

// EventBus implementations
export interface EventBusOptions {
	channelName?: string
	maxListeners?: number
}

// Local EventBus - in-memory only
class LocalEventBus implements EventBus {
	private readonly listeners = new Map<string, EventHandler[]>()
	private readonly listenerIds = new Map<EventHandler, string>()
	private nextId = 0

	on(eventType: string, handler: EventHandler): string {
		const id = `listener-${String(this.nextId++)}`
		this.listenerIds.set(handler, id)

		if (!this.listeners.has(eventType)) {
			this.listeners.set(eventType, [])
		}
		const handlers = this.listeners.get(eventType)
		if (handlers) {
			handlers.push(handler)
		}

		return id
	}

	off(eventType: string, handler: EventHandler): void {
		const handlers = this.listeners.get(eventType)
		if (handlers) {
			const index = handlers.indexOf(handler)
			if (index !== -1) {
				handlers.splice(index, 1)
				this.listenerIds.delete(handler)
			}
		}
	}

	emit(event: Event): void {
		const handlers = this.listeners.get(event.type)
		if (handlers) {
			const eventWithTimestamp = {
				...event,
				timestamp: event.timestamp ?? Date.now(),
			}

			for (const handler of handlers) {
				try {
					handler(eventWithTimestamp)
				} catch (error) {
					logger.error("event", `Event handler error for ${event.type}`, { error }, "LocalEventBus")
				}
			}
		}
	}

	close(): void {
		this.listeners.clear()
		this.listenerIds.clear()
	}

	isBroadcasting(): boolean {
		return false // Local bus doesn't broadcast
	}
}

/**
 * Type guard confirming a broadcast message's payload is a well-formed {@link Event}
 */
const isEvent = (value: unknown): value is Event => {
	if (typeof value !== "object" || value === null) return false
	if (!("type" in value)) return false
	return typeof value.type === "string"
}

// Cross-tab EventBus using BroadcastChannel
class CrossTabEventBus implements EventBus {
	private readonly localBus = new LocalEventBus()
	private readonly channel: BroadcastChannel

	constructor(channelName: string) {
		this.channel = new BroadcastChannel(channelName)
		this.channel.addEventListener("message", this.handleBroadcastMessage.bind(this))
	}

	private handleBroadcastMessage(event: MessageEvent): void {
		if (isEvent(event.data)) {
			this.localBus.emit(event.data)
		}
	}

	on(eventType: string, handler: EventHandler): string {
		return this.localBus.on(eventType, handler)
	}

	off(eventType: string, handler: EventHandler): void {
		this.localBus.off(eventType, handler)
	}

	emit(event: Event): void {
		// Emit locally first
		this.localBus.emit(event)

		// Then broadcast to other tabs
		try {
			this.channel.postMessage(event)
		} catch (error) {
			logger.error("event", `Failed to broadcast event ${event.type}`, { error }, "CrossTabEventBus")
		}
	}

	close(): void {
		this.channel.close()
		this.localBus.close()
	}

	isBroadcasting(): boolean {
		return true
	}
}

// Factory functions
export const createLocalEventBus = (): EventBus => new LocalEventBus();

export const createCrossTabEventBus = (channelName: string): EventBus => new CrossTabEventBus(channelName);

// Global instance
export const localEventBus = createLocalEventBus()

// Queue and coordination types
export interface TaskQueue {
	enqueue: (task: TaskDescriptor) => string
	cancel: (taskId: string) => boolean
	clear: () => void
	getTaskStatus: (taskId: string) => TaskStatus | null
	getStats: () => {
		queueLength: number
		activeTasks: number
		processing: boolean
		maxConcurrency: number
	}
}

export interface WorkerPool {
	submitTask: (taskId: string, payload: unknown, timeout?: number) => Promise<unknown>
	shutdown: () => void
	getStats: () => {
		totalWorkers: number
		idleWorkers: number
		busyWorkers: number
		errorWorkers: number
		queuedTasks: number
		totalTasksCompleted: number
		totalErrors: number
	}
}

export interface WorkerPoolOptions {
	maxWorkers?: number
	workerScript?: string
	timeout?: number
}

export interface QueuedResourceCoordinator {
	submitTask: (task: TaskDescriptor) => string
	cancelTask: (taskId: string) => boolean
	clearQueue: () => void
	getTaskStatus: (taskId: string) => TaskStatus | null
	release: () => void
	getStatus: () => {
		isLeader: boolean
		leaderId?: string
		followers: string[]
		lastHeartbeat?: number
	}
	getQueueStats: () => {
		pendingTasks: number
		activeTasks: number
		completedTasks: number
		totalTasks: number
		isLeader: boolean
		queueCapacity: number
	}
	onLeadershipChange: (
		callback: (status: ReturnType<QueuedResourceCoordinator["getStatus"]>) => void
	) => () => void
}

export interface QueueCoordinatorOptions {
	maxConcurrency?: number
	heartbeatInterval?: number
	leaderTimeout?: number
}

// Stub implementations for missing factories
export const createTaskQueue = (): TaskQueue => {
	throw new Error(
		"TaskQueue implementation not available in graph package - use from application layer"
	)
};

export const createWorkerPool = (): WorkerPool => {
	throw new Error(
		"WorkerPool implementation not available in graph package - use from application layer"
	)
};

export const createQueuedResourceCoordinator = (): QueuedResourceCoordinator => {
	throw new Error(
		"QueuedResourceCoordinator implementation not available in graph package - use from application layer"
	)
};
