/**
 * Overflow-menu entry that triggers the browser install prompt.
 *
 * Rendered only while the browser holds a deferred beforeinstallprompt event and the app is not already installed (see use-install-prompt.ts); iOS Safari never fires that event, so nothing renders there and installation relies on the manifest alone.
 */

import { logger } from "@bibgraph/utils";
import { Menu } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export const INSTALL_MENU_ITEM_LABEL = "Install App";

export const InstallMenuItem = () => {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [isPrompting, setIsPrompting] = useState(false);

  if (!canInstall) {
    return null;
  }

  const handleInstall = async () => {
    setIsPrompting(true);
    try {
      const outcome = await promptInstall();
      logger.debug("pwa", "Install prompt finished", { outcome });
    } finally {
      setIsPrompting(false);
    }
  };

  return (
    <Menu.Item
      leftSection={<IconDownload size={ICON_SIZE.MD} />}
      onClick={() => {
        void handleInstall();
      }}
      disabled={isPrompting}
      data-testid="install-app-menu-item"
    >
      {INSTALL_MENU_ITEM_LABEL}
    </Menu.Item>
  );
};
