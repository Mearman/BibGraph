import {
  ActionIcon,
  Badge,
  Group,
  Menu,
  Modal,
  Text,
} from "@mantine/core";
import {
  IconColorPicker,
  IconDeviceDesktop,
  IconMoon,
  IconPalette,
  IconSun,
} from "@tabler/icons-react";
import React, { useState } from "react";

import { ThemeSettings } from "@/components/ThemeSettings";
import { ICON_SIZE } from "@/config/style-constants";
import { useTheme } from "@/contexts/theme-context";
import type { ColorScheme,ComponentLibrary } from "@/styles/theme-contracts";

interface ThemeDropdownProperties {
  variant?: "dropdown" | "action-icon";
  size?: "sm" | "md" | "lg";
}

export const ThemeDropdown = ({ variant = "action-icon", size = "lg" }: ThemeDropdownProperties) => {
  const { config } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  const componentLibraryLabels: Record<ComponentLibrary, string> = {
    mantine: "Mantine",
    shadcn: "shadcn/ui",
    radix: "Radix UI",
  };

  const colorSchemeLabels: Record<ColorScheme, string> = {
    blue: "Blue",
    green: "Green",
    orange: "Orange",
    purple: "Purple",
    red: "Red",
    zinc: "Zinc",
    slate: "Slate",
    stone: "Stone",
    amber: "Amber",
    yellow: "Yellow",
    lime: "Lime",
    emerald: "Emerald",
    teal: "Teal",
    cyan: "Cyan",
    sky: "Sky",
    indigo: "Indigo",
    violet: "Violet",
    fuchsia: "Fuchsia",
    pink: "Pink",
    rose: "Rose"
  };

  const colorModeIcons = {
    light: <IconSun size={ICON_SIZE.SM} />,
    dark: <IconMoon size={ICON_SIZE.SM} />,
    auto: <IconDeviceDesktop size={ICON_SIZE.SM} />,
  };

  const handleOpenSettings = () => {
    setModalOpen(true);
  };

  const themeContent = (
    <Menu.Dropdown>
      <Menu.Label>
        <Group justify="space-between">
          <Text size="xs" fw={600}>
            Current Theme
          </Text>
          <Group gap={4}>
            <Badge variant="light" size="xs">
              {componentLibraryLabels[config.componentLibrary]}
            </Badge>
            <Badge variant="outline" size="xs">
              {colorSchemeLabels[config.colorScheme]}
            </Badge>
          </Group>
        </Group>
      </Menu.Label>

      <Menu.Divider />

      <Menu.Item
        leftSection={<IconColorPicker size={ICON_SIZE.MD} />}
        rightSection={
          <Group gap={4}>
            {colorModeIcons[config.colorMode]}
            <Badge variant="transparent" size="xs" c="dimmed">
              {config.colorMode}
            </Badge>
          </Group>
        }
        onClick={handleOpenSettings}
      >
        Theme Settings
      </Menu.Item>

      <Menu.Item
        leftSection={<IconPalette size={ICON_SIZE.MD} />}
        onClick={handleOpenSettings}
      >
        Customize Theme
      </Menu.Item>
    </Menu.Dropdown>
  );

  if (variant === "dropdown") {
    return (
      <>
        <Menu>
          <Menu.Target>
            <Group gap={6}>
              <IconPalette size={ICON_SIZE.MD} />
              <Text size="sm">Theme</Text>
            </Group>
          </Menu.Target>
          {themeContent}
        </Menu>

        <Modal
          opened={modalOpen}
          onClose={() => { setModalOpen(false); }}
          title="Theme Settings"
          size="lg"
        >
          <ThemeSettings onClose={() => { setModalOpen(false); }} />
        </Modal>
      </>
    );
  }

  return (
    <>
      <Menu>
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            size={size}
            aria-label="Theme settings"
          >
            <IconPalette size={ICON_SIZE.LG} />
          </ActionIcon>
        </Menu.Target>
        {themeContent}
      </Menu>

      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); }}
        title="Theme Settings"
        size="lg"
      >
        <ThemeSettings onClose={() => { setModalOpen(false); }} />
      </Modal>
    </>
  );
};