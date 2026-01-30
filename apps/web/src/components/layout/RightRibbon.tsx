import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLayoutSidebarRight } from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

/**
 * Placeholder component for the removed RightRibbon functionality
 */
export const RightRibbon = () => <Tooltip label="Right Ribbon (temporarily disabled)">
      <ActionIcon
        variant="subtle"
        size="lg"
        c="dimmed"
        disabled
        aria-label="Right Ribbon (temporarily disabled)"
      >
        <IconLayoutSidebarRight size={ICON_SIZE.LG} />
      </ActionIcon>
    </Tooltip>;