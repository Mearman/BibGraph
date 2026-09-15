import {
	ActionIcon,
	Box,
	Checkbox,
	Group,
	Pagination,
	Popover,
	ScrollArea,
	Select,
	Skeleton,
	Stack,
	Table,
	Text,
	TextInput,
	Tooltip,
} from "@mantine/core";
import {
	IconColumns,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconTable,
} from "@tabler/icons-react";
import {
	type ColumnDef,
	columnFilteringFeature,
	type ColumnFiltersState,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	flexRender,
	globalFilteringFeature,
	type Row,
	type RowData,
	rowPaginationFeature,
	rowSortingFeature,
	type SortingState,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";

const PAGE_SIZE_OPTION_5 = 5;
const PAGE_SIZE_OPTION_10 = 10;
const PAGE_SIZE_OPTION_25 = 25;
const PAGE_SIZE_OPTION_50 = 50;
const PAGE_SIZE_OPTION_100 = 100;
const DEFAULT_PAGE_SIZE_OPTIONS = [PAGE_SIZE_OPTION_5, PAGE_SIZE_OPTION_10, PAGE_SIZE_OPTION_25, PAGE_SIZE_OPTION_50, PAGE_SIZE_OPTION_100];

/**
The feature set every DataTable registers: sorting, filtering, pagination, column visibility.
 */
export const dataTableFeatures = tableFeatures({
	rowPaginationFeature,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	columnFilteringFeature,
	globalFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	columnVisibilityFeature,
});

/**
Column definition type matching the DataTable feature set.
 */
export type DataTableColumnDef<T extends RowData> = ColumnDef<typeof dataTableFeatures, T>;

/**
Row type matching the DataTable feature set.
 */
export type DataTableRow<T extends RowData> = Row<typeof dataTableFeatures, T>;
const EMPTY_SORTING: SortingState = [];
const VIRTUALIZATION_MIN_ROWS = 100;
const OVERSCAN_ROWS = 10;
const LOADING_SKELETON_ROWS = 8;
const VIRTUAL_SKELETON_HEIGHT_INSET = 12;

export interface DataTableProps<T extends RowData> {
	data: T[];
	columns: DataTableColumnDef<T>[];
	isLoading?: boolean;
	searchable?: boolean;
	searchPlaceholder?: string;
	onRowClick?: (row: T) => void;
	/**
	Page size selector values shown in the toolbar; pagination can be disabled entirely.
	 */
	enablePagination?: boolean;
	pageSize?: number;
	pageSizeOptions?: number[];
	/**
	Column visibility menu -- the mantine-react-table feature this replicates.
	 */
	enableColumnVisibility?: boolean;
	/**
	Row virtualisation for large datasets, active above the virtualizationThreshold.
	 */
	enableVirtualization?: boolean;
	virtualizationThreshold?: number;
	estimateSize?: number;
	maxHeight?: number;
	/**
	Compact density toggle in the toolbar.
	 */
	enableDensityToggle?: boolean;
	emptyState?: ReactNode;
	initialSorting?: SortingState;
	/**
	Accessible name for the table region
	 */
	"aria-label"?: string;
}

/**
 * Mantine-styled data grid over the headless `@tanstack/react-table` engine: global and column filtering, sorting, pagination, a column-visibility menu, a density toggle, and row virtualisation -- the feature set of mantine-react-table without its dependency (its Mantine 7 peer range does not cover the Mantine 8 this workspace runs). Virtualised rows render as absolutely positioned flex rows rather than table rows, because transforms on <tr> elements are unreliable across browsers.
 */
export const DataTable = <T extends RowData,>({
	data,
	columns,
	isLoading = false,
	searchable = true,
	searchPlaceholder = "Search...",
	onRowClick,
	enablePagination = true,
	pageSize = 10,
	pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
	enableColumnVisibility = true,
	enableVirtualization = false,
	virtualizationThreshold = VIRTUALIZATION_MIN_ROWS,
	estimateSize = 50,
	maxHeight = 600,
	enableDensityToggle = true,
	emptyState,
	initialSorting = EMPTY_SORTING,
	"aria-label": ariaLabel,
}: DataTableProps<T>) => {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
	const [compact, setCompact] = useState(false);
	const [visibilityOpen, setVisibilityOpen] = useState(false);
	const [lastClampedPageCount, setLastClampedPageCount] = useState<number | null>(null);

	const viewportRef = useRef<HTMLDivElement>(null);
	const shouldVirtualize = enableVirtualization && data.length > virtualizationThreshold;

	const table = useTable({
		data,
		columns,
		features: dataTableFeatures,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		state: {
			sorting,
			columnFilters,
			globalFilter,
			columnVisibility,
			pagination: shouldVirtualize ? { pageIndex: 0, pageSize: Math.max(data.length, 1) } : pagination,
		},
		enableSorting: true,
		enableColumnFilters: true,
		enableGlobalFilter: searchable,
	});

	const { rows } = table.getRowModel();

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => viewportRef.current,
		estimateSize: () => estimateSize,
		overscan: OVERSCAN_ROWS,
		enabled: shouldVirtualize,
	});

	// Keep the page index inside bounds when the filtered row count shrinks. Adjusted directly during render (React's supported pattern for this) rather than in an effect, so the table never paints a stale, out-of-bounds page on the way to a corrective re-render.
	const currentPageCount = table.getPageCount();
	if (
		enablePagination &&
		currentPageCount > 0 &&
		currentPageCount !== lastClampedPageCount &&
		pagination.pageIndex >= currentPageCount
	) {
		setLastClampedPageCount(currentPageCount);
		setPagination((previous) => ({ ...previous, pageIndex: currentPageCount - 1 }));
	}

	const hideableColumns = enableColumnVisibility
		? table.getAllLeafColumns().filter((column) => column.getCanHide())
		: [];

	const columnCount = table.getVisibleLeafColumns().length;

	const renderToolbar = () => {
		if (!searchable && hideableColumns.length === 0 && !enableDensityToggle && !enablePagination) {
			return null;
		}
		return (
			<Group mb="md" justify="space-between" gap="md" wrap="wrap">
				{searchable ? (
					<TextInput
						placeholder={searchPlaceholder}
						leftSection={<IconSearch size={16} />}
						value={globalFilter}
						onChange={(event) => { setGlobalFilter(event.currentTarget.value); }}
						style={{ minWidth: 240 }}
					/>
				) : (
					<Box />
				)}
				<Group gap="sm" wrap="nowrap">
					{enablePagination ? (
						<Select
							label="Page size"
							value={pagination.pageSize.toString()}
							onChange={(value) => {
								const newSize = Number(value) || pageSize;
								setPagination({ pageIndex: 0, pageSize: newSize });
							}}
							data={pageSizeOptions.map((size) => ({ value: size.toString(), label: size.toString() }))}
							w={110}
							size="sm"
						/>
					) : null}
					{enableDensityToggle ? (
						<Tooltip label={compact ? "Comfortable density" : "Compact density"} position="bottom">
							<ActionIcon
								variant={compact ? "filled" : "light"}
								onClick={() => { setCompact((previous) => !previous); }}
								aria-label={compact ? "Switch to comfortable density" : "Switch to compact density"}
							>
								<IconTable size={16} />
							</ActionIcon>
						</Tooltip>
					) : null}
					{hideableColumns.length > 0 ? (
						<Popover opened={visibilityOpen} onChange={setVisibilityOpen} position="bottom-end" withinPortal>
							<Popover.Target>
								<Tooltip label="Toggle columns" position="bottom">
									<ActionIcon
										variant={visibilityOpen ? "filled" : "light"}
										onClick={() => { setVisibilityOpen((previous) => !previous); }}
										aria-label="Toggle column visibility"
									>
										<IconColumns size={16} />
									</ActionIcon>
								</Tooltip>
							</Popover.Target>
							<Popover.Dropdown>
								<Stack gap="xs">
									<Text size="sm" fw={500}>Columns</Text>
									{hideableColumns.map((column) => (
										<Checkbox
											key={column.id}
											label={typeof column.columnDef.header === "string"
												? column.columnDef.header
												: column.id}
											checked={column.getIsVisible()}
											onChange={(event) => { column.toggleVisibility(event.currentTarget.checked); }}
										/>
									))}
								</Stack>
							</Popover.Dropdown>
						</Popover>
					) : null}
				</Group>
			</Group>
		);
	};

	const renderHeader = () => (
		<Table.Thead>
			{table.getHeaderGroups().map((headerGroup) => (
				<Table.Tr key={headerGroup.id}>
					{headerGroup.headers.map((header) => {
						const sorted = header.column.getIsSorted();
						return (
							<Table.Th
								key={header.id}
								onClick={header.column.getToggleSortingHandler()}
								style={{ cursor: header.column.getCanSort() ? "pointer" : "default", userSelect: "none" }}
							>
								<Group gap="xs" justify="space-between" wrap="nowrap">
									<Text inherit>
										{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
									</Text>
									{sorted === "asc" ? <IconSortAscending size={14} /> : null}
									{sorted === "desc" ? <IconSortDescending size={14} /> : null}
								</Group>
							</Table.Th>
						);
					})}
				</Table.Tr>
			))}
		</Table.Thead>
	);

	const renderRow = (row: (typeof rows)[number]) => (
		<Table.Tr
			key={row.id}
			role={onRowClick ? "button" : undefined}
			aria-label={onRowClick ? "Select this table row" : undefined}
			tabIndex={onRowClick ? 0 : undefined}
			style={{ cursor: onRowClick ? "pointer" : "default" }}
			onClick={onRowClick ? () => { onRowClick(row.original); } : undefined}
			onKeyDown={onRowClick
				? (event) => {
					if (!(event.key === "Enter" || event.key === " ")) {
						return;
					}

					event.preventDefault();
					onRowClick(row.original);
				}
				: undefined}
		>
			{row.getVisibleCells().map((cell) => (
				<Table.Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Td>
			))}
		</Table.Tr>
	);

	const renderBody = () => {
		if (isLoading) {
			return (
				<Table.Tbody>
					{Array.from({ length: LOADING_SKELETON_ROWS }, (_, index) => (
						<Table.Tr key={`skeleton-${String(index)}`}>
							{Array.from({ length: columnCount }, (__, cellIndex) => (
								<Table.Td key={`skeleton-${String(index)}-${String(cellIndex)}`}>
									<Skeleton height={16} radius="sm" />
								</Table.Td>
							))}
						</Table.Tr>
					))}
				</Table.Tbody>
			);
		}
		if (rows.length === 0) {
			return (
				<Table.Tbody>
					<Table.Tr>
						<Table.Td colSpan={columnCount}>
							{emptyState ?? <Text c="dimmed" ta="center" py="md">No results</Text>}
						</Table.Td>
					</Table.Tr>
				</Table.Tbody>
			);
		}
		return <Table.Tbody>{rows.map((row) => renderRow(row))}</Table.Tbody>;
	};

	const renderVirtualRow = (virtualRow: Readonly<VirtualItem>) => {
		const row = rows[virtualRow.index];
		const rowStyle: CSSProperties = {
			position: "absolute",
			top: 0,
			left: 0,
			width: "100%",
			height: `${String(virtualRow.size)}px`,
			transform: `translateY(${String(virtualRow.start)}px)`,
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "0 8px",
			borderBottom: "1px solid var(--mantine-color-default-border)",
			backgroundColor: virtualRow.index % 2 === 0 ? "var(--mantine-color-body)" : "transparent",
			cursor: onRowClick ? "pointer" : "default",
		};
		const cells = row.getVisibleCells().map((cell) => (
			<Box
				key={cell.id}
				component={onRowClick ? "button" : "div"}
				type={onRowClick ? "button" : undefined}
				onClick={onRowClick ? () => { onRowClick(row.original); } : undefined}
				style={{ flex: 1, textAlign: "left", font: "inherit", color: "inherit", background: "none", border: "none" }}
			>
				{flexRender(cell.column.columnDef.cell, cell.getContext())}
			</Box>
		));
		return onRowClick ? (
			<Box key={row.id} component="button" type="button" aria-label="Select this table row" style={rowStyle}>
				{cells}
			</Box>
		) : (
			<Box key={row.id} style={rowStyle}>{cells}</Box>
		);
	};

	const renderVirtualBody = () => (
		<Box style={{ position: "relative", width: "100%", height: rowVirtualizer.getTotalSize() }}>
			{rowVirtualizer.getVirtualItems().map(renderVirtualRow)}
		</Box>
	);

	const pageCount = enablePagination && !shouldVirtualize ? table.getPageCount() : 0;

	const tableContent = shouldVirtualize ? (
		<Box>
			<Table striped highlightOnHover={Boolean(onRowClick)} stickyHeader verticalSpacing={compact ? "xs" : "sm"}>
				{renderHeader()}
			</Table>
			{isLoading ? (
				<Stack gap="xs" p="md">
					{Array.from({ length: LOADING_SKELETON_ROWS }, (_, index) => (
						<Skeleton key={`skeleton-${String(index)}`} height={estimateSize - VIRTUAL_SKELETON_HEIGHT_INSET} radius="sm" />
					))}
				</Stack>
			) : rows.length === 0 ? (
				<Box p="lg" style={{ textAlign: "center" }}>
					{emptyState ?? <Text c="dimmed">No results</Text>}
				</Box>
			) : (
				renderVirtualBody()
			)}
		</Box>
	) : (
		<Table striped highlightOnHover={Boolean(onRowClick)} stickyHeader verticalSpacing={compact ? "xs" : "sm"}>
			{renderHeader()}
			{renderBody()}
		</Table>
	);

	return (
		<Box aria-label={ariaLabel}>
			{renderToolbar()}
			<ScrollArea
				viewportRef={viewportRef}
				scrollbarSize={6}
				style={shouldVirtualize ? { maxHeight, overflow: "auto" } : undefined}
			>
				{tableContent}
			</ScrollArea>
			{pageCount > 1 ? (
				<Group justify="center" mt="md">
					<Pagination
						total={pageCount}
						value={pagination.pageIndex + 1}
						onChange={(page) => { setPagination((previous) => ({ ...previous, pageIndex: page - 1 })); }}
					/>
				</Group>
			) : null}
		</Box>
	);
};
