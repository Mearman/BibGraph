/**
 * Settings panel for app installation. The install affordance is persistent here rather than appearing only when the browser fires beforeinstallprompt: browsers that never fire it (iOS Safari among them) get an honest unavailable state with the manual route named.
 */

import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export const InstallPanel = () => {
  const { canInstall, isStandalone, promptInstall } = useInstallPrompt();
  const [isPrompting, setIsPrompting] = useState(false);

  const handleInstall = async () => {
    setIsPrompting(true);
    try {
      await promptInstall();
    } finally {
      setIsPrompting(false);
    }
  };

  return (
    <Stack gap="sm">
      <Group gap="sm">
        <IconDownload size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
        <Title order={3}>Install App</Title>
      </Group>

      {isStandalone ? (
        <Text size="sm" c="dimmed" data-testid="install-state-installed">
          BibGraph is already installed and running as an app.
        </Text>
      ) : canInstall ? (
        <>
          <Text size="sm" c="dimmed">
            Install BibGraph as an app for a fullscreen window and offline access to cached entities.
          </Text>
          <Button
            leftSection={<IconDownload size={ICON_SIZE.MD} />}
            onClick={() => { void handleInstall(); }}
            loading={isPrompting}
            data-testid="install-panel-button"
          >
            Install App
          </Button>
        </>
      ) : (
        <Text size="sm" c="dimmed" data-testid="install-state-unavailable">
          Install is not available in this browser. On iOS Safari use Share then
          "Add to Home Screen"; on desktop Chrome or Edge the install option appears
          in the address bar once the browser offers it.
        </Text>
      )}
    </Stack>
  );
};
