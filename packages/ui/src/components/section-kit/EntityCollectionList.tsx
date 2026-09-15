import { Box, Center, Chip, Group, Loader,ScrollArea, Stack, Text, TextInput } from "@mantine/core"
import { IconSearch, IconX } from "@tabler/icons-react"
import type { ReactNode } from "react"
import { useEffect,useMemo, useState } from "react";

// Stable default values to prevent infinite render loops `never[]` (rather than `string[]`) is assignable to `(keyof T)[]` for any T, since an empty array trivially satisfies any element type.
const EMPTY_SEARCH_KEYS: never[] = [];
const EMPTY_FILTERS: FilterChip[] = [];
const EMPTY_ACTIVE_FILTERS: string[] = [];

export interface FilterChip {
	label: string
	value: string
	color?: string
}

export interface EntityCollectionListProps<T = Record<string, unknown>> {
	items: T[]
	renderItem: (item: T, index: number) => ReactNode
	getItemKey?: (item: T, index: number) => string | number
	searchPlaceholder?: string
	searchKeys?: (keyof T)[]
	filters?: FilterChip[]
	activeFilters?: string[]
	onFiltersChange?: (filters: readonly string[]) => void
	emptyState?: {
		title: string
		description?: string
		icon?: ReactNode
	}
	loading?: boolean
	height?: number | string
	className?: string
	"data-testid"?: string
}

// Simple debounce hook
const useDebounce = <T,>({ value, delay }: { value: T; delay: number }): T => {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		return () => {
			clearTimeout(handler)
		}
	}, [value, delay])

	return debouncedValue
};

/**
 * A collection list component with search, filtering, and empty states.
 * Handles ScrollArea, search functionality, filter chips, and customizable empty states.
 * @example
 * ```tsx
 * <EntityCollectionList
 *   items={authors}
 *   renderItem={(author) => <AuthorCard {...author} />}
 *   getItemKey={(author) => author.id}
 *   searchKeys={['display_name', 'orcid']}
 *   filters={[
 *     { label: 'Verified', value: 'verified', color: 'green' },
 *     { label: 'Unverified', value: 'unverified', color: 'red' }
 *   ]}
 *   activeFilters={['verified']}
 *   onFiltersChange={setActiveFilters}
 *   emptyState={{
 *     title: "No authors found",
 *     description: "Try adjusting your search or filters"
 *   }}
 * />
 * ```
 */
export const EntityCollectionList = <T,>({
	items,
	renderItem,
	getItemKey,
	searchPlaceholder = "Search...",
	searchKeys = EMPTY_SEARCH_KEYS,
	filters = EMPTY_FILTERS,
	activeFilters = EMPTY_ACTIVE_FILTERS,
	onFiltersChange,
	emptyState,
	loading = false,
	height = 400,
	className,
	...restProps
}: EntityCollectionListProps<T>) => {
	const [searchQuery, setSearchQuery] = useState("")
	const debouncedSearchQuery = useDebounce({ value: searchQuery, delay: 300 })

	// Filter items based on search and active filters
	const filteredItems = useMemo(() => {
		let filtered = items

		// Apply search filter
		if (debouncedSearchQuery && searchKeys.length > 0) {
			const query = debouncedSearchQuery.toLowerCase()
			filtered = filtered.filter((item) =>
				searchKeys.some((key) => {
					const value = item[key]
					return String(value).toLowerCase().includes(query)
				})
			)
		}

		// Apply chip filters (custom logic would be implemented here based on item properties)
		// This is a placeholder - actual filter logic would depend on how filters map to item properties
		if (activeFilters.length > 0) {
			// Example: assume items have a 'status' property that matches filter values
			filtered = filtered.filter((item) =>
				activeFilters.some((filter) => {
					if (typeof item !== "object" || item === null || !("status" in item)) {
						return false
					}
					return item.status === filter
				})
			)
		}

		return filtered
	}, [items, debouncedSearchQuery, searchKeys, activeFilters])

	const handleFilterToggle = (filterValue: string) => {
		if (!onFiltersChange) {
			return
		}

		const newFilters = activeFilters.includes(filterValue)
			? activeFilters.filter((f) => f !== filterValue)
			: [...activeFilters, filterValue]

		onFiltersChange(newFilters)
	}

	const clearSearch = () => {
		setSearchQuery("")
	}

	const renderEmptyState = () => {
		if (!emptyState) {
			return (
				<Center style={{ height: 200 }}>
					<Stack align="center" gap="xs">
						<Text size="sm" c="dimmed">
							No items to display
						</Text>
					</Stack>
				</Center>
			)
		}

		return (
			<Center style={{ height: 200 }}>
				<Stack align="center" gap="xs">
					{emptyState.icon}
					<Text size="sm" fw={500}>
						{emptyState.title}
					</Text>
					{emptyState.description !== undefined && (
						<Text size="xs" c="dimmed">
							{emptyState.description}
						</Text>
					)}
				</Stack>
			</Center>
		)
	}

	return (
		<Stack gap="md" className={className} {...restProps}>
			{/* Search and Filters */}
			<Stack gap="sm">
				{/* Search Input */}
				<TextInput
					placeholder={searchPlaceholder}
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.currentTarget.value)
					}}
					leftSection={<IconSearch size={16} />}
					rightSection={
						searchQuery ? <IconX size={16} style={{ cursor: "pointer" }} onClick={clearSearch} /> : null
					}
					size="sm"
				/>

				{/* Filter Chips */}
				{filters.length > 0 && (
					<Group gap="xs">
						{filters.map((filter) => (
							<Chip
								key={filter.value}
								checked={activeFilters.includes(filter.value)}
								onClick={() => {
									handleFilterToggle(filter.value)
								}}
								color={filter.color}
								size="sm"
								variant={activeFilters.includes(filter.value) ? "filled" : "outline"}
							>
								{filter.label}
							</Chip>
						))}
					</Group>
				)}
			</Stack>

			{/* Content Area */}
			<Box style={{ position: "relative" }}>
				{loading ? (
					<Center style={{ height }}>
						<Loader size="md" />
					</Center>
				) : (
					<ScrollArea style={{ height }}>
						{filteredItems.length > 0 ? (
							<Stack gap="sm">
								{filteredItems.map((item, index) => {
									const key = getItemKey ? getItemKey(item, index) : index;
									return <Box key={key}>{renderItem(item, index)}</Box>;
								})}
							</Stack>
						) : (
							renderEmptyState()
						)}
					</ScrollArea>
				)}
			</Box>
		</Stack>
	)
};