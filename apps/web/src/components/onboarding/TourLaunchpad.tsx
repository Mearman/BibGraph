/**
 * Tour launchpad: the corner affordance that offers the feature tour. The tour never opens by itself; this button is how a newcomer (or anyone wanting a refresher) starts it, so the first visit meets a working app rather than a modal wall. Presentational: opening the tour is the caller's.
 */

import { Box, Button } from "@mantine/core";
import { IconCompass } from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

/**
 * Sits above the page content but below modals and notifications, and clear of the scroll bars.
 */
const LAUNCHPAD_Z_INDEX = 199;

export interface TourLaunchpadProps {
  readonly onOpen: () => void;
}

export const TourLaunchpad = ({ onOpen }: TourLaunchpadProps): React.ReactElement => (
  <Box
    pos="fixed"
    bottom="1rem"
    right="1rem"
    style={{ zIndex: LAUNCHPAD_Z_INDEX }}
    data-testid="tour-launchpad"
  >
    <Button size="xs" variant="light" leftSection={<IconCompass size={ICON_SIZE.SM} aria-hidden />} onClick={onOpen}>
      Take the tour
    </Button>
  </Box>
);
