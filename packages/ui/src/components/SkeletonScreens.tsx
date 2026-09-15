import { Group, Skeleton, Stack } from "@mantine/core";
import React from "react";

interface EntityListSkeletonProperties {
  count?: number;
}

export const EntityListSkeleton = ({ count = 5 }: EntityListSkeletonProperties) => (
  <Stack gap="md">
    {Array.from({ length: count }).map((_, index) => (
      <Group key={index} gap="md" p="md" style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: "8px" }}>
        <Skeleton height={40} width={40} radius="md" />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Skeleton height={16} width="40%" radius="sm" />
          <Skeleton height={12} width="60%" radius="sm" />
        </Stack>
        <Skeleton height={24} width={80} radius="sm" />
      </Group>
    ))}
  </Stack>
);

interface TableSkeletonProperties {
  rows?: number;
  columns?: number;
}

const PERCENTAGE_TOTAL = 100;

export const PackageTableSkeleton = ({ rows = 10, columns = 4 }: TableSkeletonProperties) => (
  <Stack gap="xs">
    {/* Header */}
    <Group gap="sm" p="xs">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} height={20} width={`${String(PERCENTAGE_TOTAL / columns)}%`} radius="sm" />
      ))}
    </Group>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Group key={rowIndex} gap="sm" p="xs">
        {Array.from({ length: columns }).map((_row, colIndex) => (
          <Skeleton
            key={colIndex}
            height={16}
            width={colIndex === 0 ? "30%" : colIndex === columns - 1 ? "15%" : "20%"}
            radius="sm"
          />
        ))}
      </Group>
    ))}
  </Stack>
);

interface CardGridSkeletonProperties {
  cards?: number;
  aspectRatio?: string;
}

export const CardGridSkeleton = ({ cards = 6, aspectRatio = "16/9" }: CardGridSkeletonProperties) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1rem",
  }}>
    {Array.from({ length: cards }).map((_, index) => (
      <div key={index} style={{ aspectRatio }}>
        <Stack gap="sm" h="100%">
          <Skeleton height="60%" radius="md" />
          <Stack gap="xs">
            <Skeleton height={16} width="70%" radius="sm" />
            <Skeleton height={12} width="100%" radius="sm" />
            <Skeleton height={12} width="80%" radius="sm" />
          </Stack>
        </Stack>
      </div>
    ))}
  </div>
);

interface DetailPageSkeletonProperties {
  showSidebar?: boolean;
}

export const DetailPageSkeleton = ({ showSidebar = true }: DetailPageSkeletonProperties) => (
  <div style={{ display: "flex", gap: "2rem", height: "100%" }}>
    {/* Main Content */}
    <Stack gap="lg" style={{ flex: 1 }}>
      {/* Header */}
      <Group gap="md" align="flex-start">
        <Skeleton height={80} width={80} radius="md" />
        <Stack gap="sm" style={{ flex: 1 }}>
          <Skeleton height={32} width="60%" radius="sm" />
          <Skeleton height={16} width="40%" radius="sm" />
          <Skeleton height={16} width="30%" radius="sm" />
        </Stack>
      </Group>

      {/* Tabs */}
      <Group gap="md">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} height={36} width={100} radius="sm" />
        ))}
      </Group>

      {/* Content */}
      <Stack gap="md">
        <Skeleton height={24} width="30%" radius="sm" />
        <Skeleton height={12} width="100%" radius="sm" />
        <Skeleton height={12} width="95%" radius="sm" />
        <Skeleton height={12} width="85%" radius="sm" />
      </Stack>

      {/* Table */}
      <PackageTableSkeleton rows={8} columns={3} />
    </Stack>

    {/* Sidebar */}
    {showSidebar && (
      <Stack gap="md" w={300}>
        <Skeleton height={36} radius="sm" />
        <Stack gap="sm">
          {Array.from({ length: 5 }).map((_, index) => (
            <Group key={index} gap="sm">
              <Skeleton height={20} width={20} radius="sm" />
              <Skeleton height={16} width="70%" radius="sm" />
            </Group>
          ))}
        </Stack>
      </Stack>
    )}
  </div>
);

interface SearchResultsSkeletonProperties {
  showFilters?: boolean;
}

export const SearchResultsSkeleton = ({ showFilters = true }: SearchResultsSkeletonProperties) => (
  <div style={{ display: "flex", gap: "2rem" }}>
    {/* Filters Sidebar */}
    {showFilters && (
      <Stack gap="md" w={250}>
        <Skeleton height={24} width="40%" radius="sm" />
        <Stack gap="sm">
          {Array.from({ length: 6 }).map((_, index) => (
            <Stack key={index} gap="xs">
              <Skeleton height={16} width="50%" radius="sm" />
              <Group gap="xs">
                <Skeleton height={14} width={14} radius="xs" />
                <Skeleton height={14} width="60%" radius="xs" />
              </Group>
            </Stack>
          ))}
        </Stack>
      </Stack>
    )}

    {/* Results */}
    <Stack gap="lg" style={{ flex: 1 }}>
      {/* Results Header */}
      <Group justify="space-between">
        <Skeleton height={20} width="30%" radius="sm" />
        <Group gap="sm">
          <Skeleton height={32} width={120} radius="sm" />
          <Skeleton height={32} width={32} radius="sm" />
        </Group>
      </Group>

      {/* Results List */}
      <EntityListSkeleton count={8} />
    </Stack>
  </div>
);

// Export a default skeleton for general use
export const DefaultSkeleton = () => (
  <Stack gap="md">
    <Skeleton height={32} width="40%" radius="sm" />
    <Skeleton height={16} width="100%" radius="sm" />
    <Skeleton height={16} width="95%" radius="sm" />
    <Skeleton height={16} width="85%" radius="sm" />
  </Stack>
);