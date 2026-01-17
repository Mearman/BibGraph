/**
 * Chart Instructions Component
 *
 * Displays context-appropriate instructions for interacting with charts.
 * Shows different instructions for mobile (touch) and desktop (mouse/keyboard) users.
 */

interface ChartInstructionsProps {
  /** Whether the viewport is mobile-sized */
  isMobile: boolean;
  /** Instructions text for mobile users */
  mobileText: string;
  /** Instructions text for desktop users */
  desktopText: string;
}

/**
 * Instructions component showing interaction hints for charts
 * @param root0
 * @param root0.isMobile
 * @param root0.mobileText
 * @param root0.desktopText
 */
export const ChartInstructions = ({
  isMobile,
  mobileText,
  desktopText,
}: ChartInstructionsProps) => (
  <div
    style={{
      marginTop: "16px",
      fontSize: isMobile ? "11px" : "12px",
      color: "var(--mantine-color-gray-6)",
      fontStyle: "italic",
      textAlign: isMobile ? "left" : "center",
    }}
  >
    {isMobile ? mobileText : desktopText}
  </div>
);
