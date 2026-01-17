/**
 * Chart Empty State Component
 *
 * Displays a placeholder when no data is available for chart visualization.
 * Accessible and adapts to the specified height.
 */

interface ChartEmptyStateProps {
  /** Minimum height of the empty state container */
  height: number;
  /** Message to display (default: "No comparison results available for visualization") */
  message?: string;
  /** Accessible label for the container */
  ariaLabel?: string;
}

/**
 * Empty state component for charts when no data is available
 * @param root0
 * @param root0.height
 * @param root0.message
 * @param root0.ariaLabel
 */
export const ChartEmptyState = ({
  height,
  message = "No comparison results available for visualization",
  ariaLabel = "No data available",
}: ChartEmptyStateProps) => (
    <div
      style={{
        backgroundColor: "var(--mantine-color-gray-1)",
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "8px",
        padding: "24px",
        textAlign: "center",
        minHeight: height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <p style={{ color: "var(--mantine-color-dimmed)", margin: 0 }}>
        {message}
      </p>
    </div>
);
