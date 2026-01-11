import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Box,
  Group,
  Pagination,
  ScrollArea,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconColumns, IconColumns3 ,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useEffect,useRef, useState } from "react";

import { DataTableSkeleton } from "@/components/ui";
import { useResponsiveDesign } from "@/hooks/use-sprinkles";
import { sprinkles } from "@/styles/sprinkles";

interface BaseTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  // Virtualization options
  enableVirtualization?: boolean;
  estimateSize?: number;
  maxHeight?: number;
}

export const BaseTable = <T,>({
  data,
  columns,
  isLoading = false,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Search...",
  onRowClick,
  enableVirtualization = false,
  estimateSize = 50,
  maxHeight = 600,
}: BaseTableProps<T>) => {
  const { isMobile } = useResponsiveDesign();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: isMobile() ? 5 : pageSize, // Smaller page size on mobile
  });
  const [compactView, setCompactView] = useState(isMobile());

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = enableVirtualization && data.length > 100;

  // Use virtualization when enabled and dataset is large
  const effectivePageSize = shouldVirtualize ? data.length : pageSize;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: shouldVirtualize
      ? undefined
      : getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: {
        ...pagination,
        pageSize: effectivePageSize,
      },
    },
    enableSorting: true,
    enableColumnFilters: true,
    enableGlobalFilter: searchable,
  });

  // Get rows for virtualization
  const { rows } = table.getRowModel();

  // Setup virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // Log performance metrics
  useEffect(() => {
    if (shouldVirtualize) {
      const virtualItems = rowVirtualizer.getVirtualItems();
      logger.debug("table-virtualization", "Virtualized table active", {
        totalRows: rows.length,
        visibleRange: virtualItems.length,
        estimateSize,
        maxHeight,
      });
    }
  }, [shouldVirtualize, rows.length, estimateSize, maxHeight, rowVirtualizer]);

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Helper function to render search controls
  const renderSearchControls = () => {
    if (!searchable) return null;

    return (
      <Group
        mb="md"
        justify="space-between"
        gap={isMobile() ? "xs" : "md"}
        wrap={isMobile() ? "wrap" : "nowrap"}
      >
        <TextInput
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className={sprinkles({
            minWidth: isMobile() ? '200px' : '300px',
            flex: isMobile() ? '1' : 'auto'
          })}
          size={isMobile() ? "sm" : "md"}
        />

        <Group gap="sm" wrap="nowrap">
          {!isMobile() && (
            <Select
              label="Page size"
              value={pagination.pageSize.toString()}
              onChange={(value) => {
                const newSize = Number(value) || 10;
                setPagination((prev) => ({
                  ...prev,
                  pageSize: newSize,
                  pageIndex: 0,
                }));
              }}
              data={[
                { value: "5", label: "5" },
                { value: "10", label: "10" },
                { value: "25", label: "25" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
              w={100}
              size="sm"
            />
          )}

          <Tooltip
            label={compactView ? "Expand columns" : "Compact columns"}
            position="bottom"
          >
            <ActionIcon
              variant={compactView ? "filled" : "light"}
              onClick={() => setCompactView(!compactView)}
              size={isMobile() ? "lg" : "md"}
              color={compactView ? "blue" : "gray"}
              aria-label={compactView ? "Expand columns" : "Compact columns"}
            >
              {compactView ? <IconColumns3 size={16} /> : <IconColumns size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    );
  };

  // Helper function to render table header
  const renderTableHeader = () => (
    <Table.Thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <Table.Tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <Table.Th
              key={header.id}
              className={sprinkles({
                cursor: header.column.getCanSort() ? 'pointer' : 'default',
                userSelect: 'none'
              })}
              onClick={header.column.getToggleSortingHandler()}
            >
              <Group gap="xs" justify="space-between">
                <Text fw={600}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </Text>
                {header.column.getIsSorted() &&
                  (header.column.getIsSorted() === "asc" ? (
                    <IconSortAscending size={14} />
                  ) : (
                    <IconSortDescending size={14} />
                  ))}
              </Group>
            </Table.Th>
          ))}
        </Table.Tr>
      ))}
    </Table.Thead>
  );

  // Helper function to render loading state
  const renderLoadingState = (colSpan: number) => (
    <DataTableSkeleton columns={colSpan} rows={5} />
  );

  // Helper function to render empty state
  const renderEmptyState = (colSpan: number) => (
    <Table.Tr>
      <Table.Td
        colSpan={colSpan}
        className={sprinkles({ textAlign: 'center', padding: '24px' })}
      >
        <Text c="dimmed">No data available</Text>
      </Table.Td>
    </Table.Tr>
  );

  // Helper function to get minimum width for cell
  const getMinWidthForCell = (cellIndex: number): string => {
    switch (cellIndex) {
      case 0:
        return "80px";
      case 2:
        return "120px";
      case 3:
        return "100px";
      case 4:
        return "120px";
      default:
        return "auto";
    }
  };

  // Helper function to render virtual row
  const renderVirtualRow = (virtualRow: VirtualItem) => {
    const row = rows[virtualRow.index];
    const hasOnRowClick = !!onRowClick;

    // Use descriptive aria-label for row selection
    const ariaLabel = hasOnRowClick ? "Select this table row" : undefined;

    return (
      <button
        key={row.id}
        type="button"
        aria-label={ariaLabel}
        className={sprinkles({
          border: 'none',
          background: 'none',
          textAlign: 'left',
          width: 'full',
          font: 'inherit',
          color: 'inherit',
          position: 'absolute',
          top: '0',
          left: '0',
          display: 'flex',
          alignItems: 'center',
          paddingX8px: true,
          borderBottomGray3: true,
          backgroundColor: virtualRow.index % 2 === 0 ? 'gray0' : 'transparent',
          cursor: hasOnRowClick ? 'pointer' : 'default'
        })}
        style={{
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={hasOnRowClick ? () => handleRowClick(row.original) : undefined}
        onKeyDown={hasOnRowClick ? handleRowKeyDown(row.original) : undefined}
        onKeyUp={hasOnRowClick ? handleRowKeyUp : undefined}
        disabled={!hasOnRowClick}
      >
        {row.getVisibleCells().map((cell, cellIndex) => (
          <div
            key={cell.id}
            className={sprinkles({
              flex: cellIndex === 1 ? '1' : 'auto',
              borderRightGray3: cellIndex < row.getVisibleCells().length - 1,
              paddingX8px: true,
              minWidth: getMinWidthForCell(cellIndex) === '80px' ? '80px' :
                        getMinWidthForCell(cellIndex) === '120px' ? '120px' :
                        getMinWidthForCell(cellIndex) === '100px' ? '100px' : 'auto'
            })}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
      </button>
    );
  };

  // Helper functions for row event handlers
  const handleRowKeyDown = (rowData: T) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(rowData);
    }
  };

  const handleRowKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  // Helper function to render virtualized table
  const renderVirtualizedTable = () => (
    <div>
      <Table withTableBorder withColumnBorders>
        {renderTableHeader()}
      </Table>

      <ScrollArea
        ref={parentRef}
        className={sprinkles({ overflow: 'auto' })}
        style={{
          height: `${maxHeight}px`,
          border: '1px solid var(--mantine-color-gray-3)',
          borderTop: 'none'
        }}
      >
        {isLoading ? (
          <Table withTableBorder>
            <Table.Tbody>
              <DataTableSkeleton columns={columns.length} rows={10} />
            </Table.Tbody>
          </Table>
        ) : (rows.length === 0 ? (
          <div className={sprinkles({ padding: '24px', textAlign: 'center' })}>
            <Text c="dimmed">No data available</Text>
          </div>
        ) : (
          <div
            className={sprinkles({ width: 'full', position: 'relative' })}
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map(renderVirtualRow)}
          </div>
        ))}
      </ScrollArea>
    </div>
  );

  // Helper function to render regular table
  const renderRegularTable = () => {
    const tableContent = (
      <Table
        striped={!isMobile()}
        highlightOnHover
        withTableBorder
        withColumnBorders={isMobile()}
        stickyHeader
        style={{
          minHeight: isLoading ? 400 : "auto",
          width: isMobile() && compactView ? 'max-content' : '100%'
        }}
        className={sprinkles({
          minHeight: '400px',
          fontSize: isMobile() ? 'sm' : 'md'
        })}
      >
          {renderTableHeader()}

          <Table.Tbody>
            {isLoading
              ? renderLoadingState(columns.length)
              : (table.getRowModel().rows.length === 0
                ? renderEmptyState(columns.length)
                : table.getRowModel().rows.map((row) => {
                    // Use descriptive aria-label for row selection
                    const ariaLabel = onRowClick
                      ? "Select this table row"
                      : undefined;

                    return (
                      <Table.Tr
                        key={row.id}
                        role={onRowClick ? "button" : undefined}
                        aria-label={ariaLabel}
                        tabIndex={onRowClick ? 0 : undefined}
                        className={sprinkles({
                          cursor: onRowClick ? 'pointer' : 'default',
                          fontSize: isMobile() ? 'sm' : 'md'
                        })}
                        onClick={
                          onRowClick
                            ? () => handleRowClick(row.original)
                            : undefined
                        }
                        onKeyDown={
                          onRowClick
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleRowClick(row.original);
                                }
                              }
                            : undefined
                        }
                        onKeyUp={
                          onRowClick
                            ? (e) => {
                                if (e.key === "Escape") {
                                  (e.target as HTMLElement).blur();
                                }
                              }
                            : undefined
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <Table.Td
                            key={cell.id}
                            style={{
                              minWidth: isMobile() && compactView ? '120px' : 'auto'
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    );
                  }))}
          </Table.Tbody>
        </Table>
    );

    // Wrap in ScrollArea for mobile devices
    if (isMobile()) {
      return (
        <ScrollArea
          type="auto"
          scrollbarSize={8}
          className={sprinkles({ borderGray3: true, borderRadius: 'md' })}
          styles={{
            viewport: {
              minHeight: '400px'
            }
          }}
        >
          {tableContent}
        </ScrollArea>
      );
    }

    return tableContent;
  };

  // Helper function to render pagination info
  const renderPaginationInfo = () => {
    if (isLoading || rows.length === 0) return null;

    return (
      <Group
        justify="space-between"
        mt="md"
        gap={isMobile() ? "xs" : "md"}
        wrap={isMobile() ? "wrap" : "nowrap"}
        align="center"
      >
        <Text
          size={isMobile() ? "xs" : "sm"}
          c="dimmed"
          style={{ flex: isMobile() ? '1' : 'auto' }}
        >
          {shouldVirtualize ? (
            <>
              {isMobile() ? (
                `${rowVirtualizer.getVirtualItems().length} / ${rows.length} (virtual)`
              ) : (
                `Showing ${rowVirtualizer.getVirtualItems().length} of ${rows.length} entries (virtualized)`
              )}
            </>
          ) : (
            <>
              {isMobile() ? (
                `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-${Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length,
                )} / ${table.getFilteredRowModel().rows.length}`
              ) : (
                <>
                  Showing{" "}
                  {table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length,
                  )}{" "}
                  of {table.getFilteredRowModel().rows.length} entries
                </>
              )}
            </>
          )}
        </Text>

        {!shouldVirtualize && (
          <Pagination
            value={table.getState().pagination.pageIndex + 1}
            onChange={(page) => table.setPageIndex(page - 1)}
            total={table.getPageCount()}
            size={isMobile() ? "xs" : "sm"}
            withEdges={!isMobile()}
            boundaries={isMobile() ? 1 : 2}
            siblings={isMobile() ? 0 : 1}
          />
        )}
      </Group>
    );
  };

  return (
    <Box data-testid="table">
      {renderSearchControls()}
      {shouldVirtualize ? renderVirtualizedTable() : renderRegularTable()}
      {renderPaginationInfo()}
    </Box>
  );
};
