import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLayoutSidebar } from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

/**
 * Placeholder component for the removed LeftRibbon functionality
 */
export const LeftRibbon = () => <Tooltip label="Left Ribbon (temporarily disabled)">
      <ActionIcon
        variant="subtle"
        size="lg"
        c="dimmed"
        disabled
        aria-label="Left Ribbon (temporarily disabled)"
      >
        <IconLayoutSidebar size={ICON_SIZE.LG} />
      </ActionIcon>
    </Tooltip>;