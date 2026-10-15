import {
  Card,
  Divider,
  Stack,
  Title,
} from "@mantine/core";
import { createLazyFileRoute } from "@tanstack/react-router";

import { SettingsSection } from "@/components/sections/SettingsSection";
import { InstallPanel } from "@/components/ui/InstallPanel";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { pageTitle } from "../styles/layout.css";

const SettingsPage = () => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  return (
    <Card
      shadow="xl"
      padding="xl"
      radius="lg"
      style={{
        backgroundColor: colors.background.blur,
        backdropFilter: "blur(10px)",
        maxWidth: "800px",
      }}
    >
      <Stack gap="xl">
        <Title order={1} className={pageTitle} ta="center">
          Settings
        </Title>

        <SettingsSection />

        <Divider />

        {/* Persistent install affordance: the overflow-menu entry appears only when the browser fires beforeinstallprompt */}
        <InstallPanel />
      </Stack>
    </Card>
  );
};

export const Route = createLazyFileRoute("/settings")({
  component: SettingsPage,
});

export default SettingsPage;
