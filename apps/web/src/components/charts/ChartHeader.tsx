/**
 * Chart Header Component
 *
 * Displays the title and optional description for chart components.
 * Adapts styling for mobile and desktop viewports.
 */

interface ChartHeaderProps {
  /** Chart title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Whether the viewport is mobile-sized */
  isMobile: boolean;
}

/**
 * Header component with title and description for charts
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.isMobile
 */
export const ChartHeader = ({ title, description, isMobile }: ChartHeaderProps) => (
  <div style={{ marginBottom: isMobile ? "16px" : "24px" }}>
    <h3
      style={{
        fontSize: isMobile ? "16px" : "18px",
        fontWeight: "600",
        color: "var(--mantine-color-text)",
        margin: "0 0 8px 0",
      }}
    >
      {title}
    </h3>
    {description && (
      <p
        style={{
          fontSize: isMobile ? "14px" : "16px",
          color: "var(--mantine-color-dimmed)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    )}
  </div>
);
