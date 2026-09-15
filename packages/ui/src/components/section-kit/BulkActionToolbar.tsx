import { ActionIcon, Button, Checkbox, Group, Menu,Text, Tooltip } from "@mantine/core"
import {
	IconEye,
	IconEyeOff,
	IconFocusCentered,
	IconGraph,
	IconNetwork,
	IconSelect,
	IconZoomIn,
	IconZoomOut,
} from "@tabler/icons-react"
import type { ReactNode } from "react"

export interface BulkActionToolbarProps {
	// Selection state
	totalItems: number
	selectedItems: string[]
	onSelectAll: () => void
	onClearSelection: () => void

	// Visibility toggles
	showVisible?: boolean
	showHidden?: boolean
	onToggleVisible?: () => void
	onToggleHidden?: () => void

	// Graph operations
	onFocusSelection?: () => void
	onZoomToSelection?: () => void
	onCreateSubgraph?: () => void
	onExpandSelection?: () => void

	// Additional actions
	additionalActions?: ReactNode

	// Styling
	className?: string
	"data-testid"?: string
}

/**
 * A toolbar component for bulk actions including selection, visibility toggles, and graph operations.
 * Provides controls for managing selected items and performing graph-related operations.
 * @example
 * ```tsx
 * <BulkActionToolbar
 *   totalItems={100}
 *   selectedItems={['item1', 'item2']}
 *   onSelectAll={() => selectAllItems()}
 *   onClearSelection={() => clearSelection()}
 *   showVisible={true}
 *   showHidden={false}
 *   onToggleVisible={() => toggleVisible()}
 *   onToggleHidden={() => toggleHidden()}
 *   onFocusSelection={() => focusOnSelected()}
 *   onZoomToSelection={() => zoomToSelected()}
 *   onCreateSubgraph={() => createSubgraph()}
 * />
 * ```
 */
export const BulkActionToolbar = ({
	totalItems,
	selectedItems,
	onSelectAll,
	onClearSelection,
	showVisible = true,
	showHidden = true,
	onToggleVisible,
	onToggleHidden,
	onFocusSelection,
	onZoomToSelection,
	onCreateSubgraph,
	onExpandSelection,
	additionalActions,
	className,
	...restProps
}: BulkActionToolbarProps) => {
	const selectedCount = selectedItems.length
	const isAllSelected = selectedCount === totalItems && totalItems > 0
	const isIndeterminate = selectedCount > 0 && selectedCount < totalItems

	const hasGraphOperations =
		onFocusSelection ?? onZoomToSelection ?? onCreateSubgraph ?? onExpandSelection
	const hasVisibilityToggles = onToggleVisible ?? onToggleHidden

	return (
		<Group justify="space-between" wrap="nowrap" className={className} {...restProps}>
			{/* Left side - Selection controls */}
			<Group gap="sm">
				<Checkbox
					checked={isAllSelected}
					indeterminate={isIndeterminate}
					onChange={isAllSelected ? onClearSelection : onSelectAll}
					label={
						<Text size="sm" fw={500}>
							{selectedCount === 0
								? `Select all (${String(totalItems)})`
								: `${String(selectedCount)} of ${String(totalItems)} selected`}
						</Text>
					}
				/>

				{selectedCount > 0 && (
					<Button
						variant="subtle"
						size="xs"
						onClick={onClearSelection}
						leftSection={<IconSelect size={14} />}
					>
						Clear
					</Button>
				)}
			</Group>

			{/* Right side - Actions */}
			<Group gap="xs">
				{/* Visibility toggles */}
				{hasVisibilityToggles && (
					<>
						{onToggleVisible && (
							<Tooltip label={showVisible ? "Hide visible items" : "Show visible items"}>
								<ActionIcon
									variant={showVisible ? "filled" : "subtle"}
									color={showVisible ? "blue" : "gray"}
									onClick={onToggleVisible}
									size="sm"
								>
									<IconEye size={16} />
								</ActionIcon>
							</Tooltip>
						)}

						{onToggleHidden && (
							<Tooltip label={showHidden ? "Hide hidden items" : "Show hidden items"}>
								<ActionIcon
									variant={showHidden ? "filled" : "subtle"}
									color={showHidden ? "blue" : "gray"}
									onClick={onToggleHidden}
									size="sm"
								>
									<IconEyeOff size={16} />
								</ActionIcon>
							</Tooltip>
						)}
					</>
				)}

				{/* Graph operations */}
				{hasGraphOperations && selectedCount > 0 && (
					<>
						{onFocusSelection && (
							<Tooltip label="Focus on selected items">
								<ActionIcon variant="subtle" onClick={onFocusSelection} size="sm">
									<IconFocusCentered size={16} />
								</ActionIcon>
							</Tooltip>
						)}

						{onZoomToSelection && (
							<Tooltip label="Zoom to selected items">
								<ActionIcon variant="subtle" onClick={onZoomToSelection} size="sm">
									<IconZoomIn size={16} />
								</ActionIcon>
							</Tooltip>
						)}

						{(onCreateSubgraph ?? onExpandSelection) && (
							<Menu shadow="md" width={200}>
								<Menu.Target>
									<ActionIcon variant="subtle" size="sm">
										<IconGraph size={16} />
									</ActionIcon>
								</Menu.Target>

								<Menu.Dropdown>
									{onCreateSubgraph && (
										<Menu.Item leftSection={<IconNetwork size={14} />} onClick={onCreateSubgraph}>
											Create subgraph
										</Menu.Item>
									)}

									{onExpandSelection && (
										<Menu.Item leftSection={<IconZoomOut size={14} />} onClick={onExpandSelection}>
											Expand selection
										</Menu.Item>
									)}
								</Menu.Dropdown>
							</Menu>
						)}
					</>
				)}

				{/* Additional actions */}
				{additionalActions}
			</Group>
		</Group>
	)
};