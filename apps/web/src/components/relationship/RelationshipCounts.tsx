/**
 * RelationshipCounts component Displays summary count badges for all relationships (incoming, outgoing, total)
 * @see specs/016-entity-relationship-viz/spec.md (User Story 4)
 */

import { Badge, Group, Paper, Text } from '@mantine/core';

import { BORDER_STYLE_GRAY_3 } from '@/config/style-constants';

export interface RelationshipCountsProps {
  /**
  Total number of incoming relationships
   */
  incomingCount: number;

  /**
  Total number of outgoing relationships
   */
  outgoingCount: number;

  /**
  Optional: Show grand total badge
   */
  showGrandTotal?: boolean;
}

/**
 * Displays summary badges showing relationship counts
 * Shows total incoming, outgoing, and optionally grand total
 */
export const RelationshipCounts = ({
  incomingCount,
  outgoingCount,
  showGrandTotal = true,
}: Readonly<RelationshipCountsProps>) => {
  const grandTotal = incomingCount + outgoingCount;

  // Don't render if no relationships
  if (grandTotal === 0) {
    return null;
  }

  return (
    <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }} data-testid="relationship-counts">
      <Group gap="md">
        <Text size="sm" fw={600}>Total Relationships:</Text>

        <Badge
          variant="light"
          color="blue"
          size="lg"
          data-testid="incoming-count-badge"
        >
          {incomingCount} Incoming
        </Badge>

        <Badge
          variant="light"
          color="green"
          size="lg"
          data-testid="outgoing-count-badge"
        >
          {outgoingCount} Outgoing
        </Badge>

        {showGrandTotal && (
          <Badge
            variant="filled"
            color="gray"
            size="lg"
            data-testid="grand-total-badge"
          >
            {grandTotal} Total
          </Badge>
        )}
      </Group>
    </Paper>
  );
};
