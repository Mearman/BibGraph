/**
 * Loading Skeleton Components
 *
 * Provides various skeleton loading states for different UI patterns
 * with smooth animations and proper accessibility support.
 */

import { Box, Group, Stack } from '@mantine/core';

interface SkeletonProperties {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rect' | 'circle';
  animate?: boolean;
  'aria-label'?: string;
}

/**
 * Individual skeleton element
 */
export const Skeleton = ({
  width = '100%',
  height = '1em',
  variant = 'rect',
  animate = true,
  'aria-label': ariaLabel,
}: SkeletonProperties) => {
  const getStyles = () => {
    const baseStyles: React.CSSProperties = {
      background: 'var(--mantine-color-gray-1)',
      borderRadius: '4px',
      position: 'relative',
      overflow: 'hidden',
    };

    const styles: React.CSSProperties = {
      ...baseStyles,
      width: typeof width === 'number' ? `${String(width)}px` : width,
      height: typeof height === 'number' ? `${String(height)}px` : height,
    };

    switch (variant) {
      case 'text':
        return {
          ...styles,
          height: '1em',
          borderRadius: '2px',
        };
      case 'circle':
        return {
          ...styles,
          borderRadius: '50%',
        };
      case 'rect':
      default:
        return styles;
    }
  };

  const skeletonStyle = getStyles();

  // Add loading animation if animate is true
  if (animate) {
    skeletonStyle.background = 'linear-gradient(90deg, var(--mantine-color-gray-1) 25%, var(--mantine-color-gray-0) 50%, var(--mantine-color-gray-1) 75%)';
    skeletonStyle.backgroundSize = '200% 100%';
    skeletonStyle.animation = 'skeleton-loading 1.5s ease-in-out infinite';
  }

  return (
    <>
      <style>{`
        @keyframes skeleton-loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .rotate {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <Box
        style={skeletonStyle}
        role="presentation"
        aria-label={ariaLabel ?? 'Loading...'}
        aria-live="polite"
        className="Skeleton"
      />
    </>
  );
};

/**
 * Text skeleton with multiple lines
 */
interface TextSkeletonProperties {
  lines?: number;
  height?: string | number;
  width?: string | number | (string | number)[];
  className?: string;
}

export const TextSkeleton = ({
  lines = 3,
  height = '1em',
  width,
  className,
}: TextSkeletonProperties) => {
  const widths = Array.isArray(width) ? width : Array.from({ length: lines }, () => width ?? '100%');

  return (
    <Stack gap={4} className={className}>
      {widths.map((w, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={w}
          height={height}
          aria-label={`Loading line ${String(index + 1)} of ${String(lines)}`}
        />
      ))}
    </Stack>
  );
};

/**
 * Card skeleton for content cards
 */
export const CardSkeleton = () => {
  return (
    <Box
      p="md"
      style={{
        border: '1px solid var(--mantine-color-gray-2)',
        borderRadius: '8px',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Skeleton width={120} height={20} />
          <Skeleton width={60} height={20} variant="circle" />
        </Group>

        {/* Content lines */}
        <TextSkeleton lines={3} />

        {/* Footer */}
        <Group justify="space-between">
          <Skeleton width={80} height={16} />
          <Skeleton width={100} height={16} />
        </Group>
      </Stack>
    </Box>
  );
};

/**
 * List skeleton for list items
 */
export const ListSkeleton = ({ items = 5 }: { items?: number }) => {
  return (
    <Stack gap="sm">
      {Array.from({ length: items }).map((_, index) => (
        <Box
          key={index}
          p="sm"
          style={{
            border: '1px solid var(--mantine-color-gray-2)',
            borderRadius: '4px',
            backgroundColor: 'var(--mantine-color-body)',
          }}
        >
          <Group gap="sm">
            <Skeleton width={40} height={40} variant="circle" />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={14} />
            </Stack>
            <Skeleton width={80} height={24} />
          </Group>
        </Box>
      ))}
    </Stack>
  );
};

/**
 * Table skeleton for data tables
 */
export const DataTableSkeleton = ({
  rows = 5,
  columns = 4,
}: { rows?: number; columns?: number }) => {
  return (
    <Box style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th
                key={index}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                  backgroundColor: 'var(--mantine-color-gray-0)',
                }}
              >
                <Skeleton height={16} width="80%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_row, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_col, colIndex) => (
                <td
                  key={colIndex}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--mantine-color-gray-1)',
                  }}
                >
                  <Skeleton height={16} width={colIndex === 0 ? '60%' : '40%'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

/**
 * Graph skeleton for data visualizations
 */
export const GraphSkeleton = () => {
  return (
    <Box
      style={{
        height: '400px',
        backgroundColor: 'var(--mantine-color-gray-0)',
        borderRadius: '8px',
        border: '1px solid var(--mantine-color-gray-2)',
        position: 'relative',
        overflow: 'hidden',
      }}
      role="presentation"
      aria-label="Loading graph visualization"
    >
      {/* Simulated graph nodes */}
      <Box
        style={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--mantine-color-gray-1)',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          top: '60%',
          left: '70%',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--mantine-color-gray-1)',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          top: '40%',
          left: '45%',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--mantine-color-gray-1)',
        }}
      />

      {/* Simulated connections */}
      <Box
        style={{
          position: 'absolute',
          top: '25%',
          left: '22%',
          width: '30%',
          height: 2,
          background: 'var(--mantine-color-gray-1)',
          transform: 'rotate(45deg)',
          transformOrigin: 'left center',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          width: '25%',
          height: 2,
          background: 'var(--mantine-color-gray-1)',
          transform: 'rotate(-15deg)',
          transformOrigin: 'left center',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          top: '55%',
          left: '60%',
          width: '35%',
          height: 2,
          background: 'var(--mantine-color-gray-1)',
          transform: 'rotate(30deg)',
          transformOrigin: 'left center',
        }}
      />
    </Box>
  );
};

/**
 * Stats skeleton for statistics dashboard
 */
export const StatsSkeleton = ({ items = 4 }: { items?: number }) => {
  return (
    <Group grow wrap="nowrap" gap="md">
      {Array.from({ length: items }).map((_, index) => (
        <Box
          key={index}
          p="md"
          style={{
            flex: '1',
            minWidth: '200px',
            backgroundColor: 'var(--mantine-color-body)',
            border: '1px solid var(--mantine-color-gray-2)',
            borderRadius: '8px',
          }}
        >
          <Stack gap="sm">
            <Skeleton width={80} height={16} />
            <Skeleton width={120} height={32} />
            <Skeleton width={60} height={14} />
          </Stack>
        </Box>
      ))}
    </Group>
  );
};