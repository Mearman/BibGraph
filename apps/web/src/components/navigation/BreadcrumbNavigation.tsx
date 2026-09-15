/**
 * Enhanced Breadcrumb Navigation
 * Provides contextual navigation with keyboard support and accessibility
 */

import type { EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import { EntityDetectionService } from "@bibgraph/utils";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Breadcrumbs,
  Group,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconChevronRight,
  IconCopy,
  IconHome,
  IconSearch,
  IconShare,
} from "@tabler/icons-react";
import { Link,useLocation } from "@tanstack/react-router";
import React, { useCallback,useMemo } from "react";

import { NOTIFICATION_DURATION } from "@/config/notification-constants";
import { ICON_SIZE } from "@/config/style-constants";

const BREADCRUMB_FONT_WEIGHT_ACTIVE = 600;
const BREADCRUMB_FONT_WEIGHT_INACTIVE = 400;

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeEntityType?: EntityType;
  tooltip?: string;
}

export const BreadcrumbNavigation = () => {
  const location = useLocation();

  // Build breadcrumb items based on current route
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];
    const parts = location.pathname.replace(/^\//, "").split("/");

    // Always start with Home
    items.push({
      label: "Home",
      href: "/",
      icon: <IconHome size={ICON_SIZE.SM} />,
      tooltip: "Return to search homepage",
    });

    if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
      return items;
    }

    // Build navigation hierarchy
    let currentPath = "";

    let index = 0;
  while (index < parts.length) {
    const part = parts[index];
    if (!part) {
      index++;
      continue;
    }

    currentPath += `/${part}`;

    // Handle entity pages
    if (index === 0 && ["works", "authors", "institutions", "concepts", "sources", "venues"].includes(part)) {
      items.push({
        label: part.charAt(0).toUpperCase() + part.slice(1),
        href: `/${part}`,
        icon: <IconSearch size={ICON_SIZE.SM} />,
        tooltip: `Search ${part}`,
      });

      // If there's an entity ID in the next part, add entity breadcrumb
      if (parts[index + 1]) {
        const entityId = decodeURIComponent(parts[index + 1]);
        const detection = EntityDetectionService.detectEntity(entityId);

        if (detection?.entityType) {
          items.push({
            label: entityId,
            href: currentPath,
            badge: ENTITY_METADATA[detection.entityType].idPrefix,
            badgeEntityType: detection.entityType,
            tooltip: `${ENTITY_METADATA[detection.entityType].displayName}: ${detection.normalizedId}`,
          });
          index += 2; // Skip the next part since we processed it as entity ID
          continue;
        }
      }
    } else {
      // Handle other cases for non-entity pages
      if (["about", "settings", "bookmarks", "catalogue"].includes(part)) {
        items.push({
          label: part.charAt(0).toUpperCase() + part.slice(1),
          href: currentPath,
          tooltip: `Navigate to ${part}`,
        });
      }
      // Handle algorithm/graph pages
      else if (part === "graph" || part === "algorithms") {
        items.push({
          label: part.charAt(0).toUpperCase() + part.slice(1),
          href: currentPath,
          icon: part === "graph" ? undefined : <IconSearch size={ICON_SIZE.SM} />,
          tooltip: `View ${part}`,
        });
      }
    }
    index++;
  }

    return items;
  }, [location.pathname]);

  // Copy current URL to clipboard
  const handleCopyUrl = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        notifications.show({
          title: "URL Copied",
          message: "Current page URL copied to clipboard",
          color: "green",
          autoClose: NOTIFICATION_DURATION.MEDIUM_MS,
        });
        return undefined;
      })
      .catch(() => {
        notifications.show({
          title: "Copy Failed",
          message: "Failed to copy URL to clipboard",
          color: "red",
          autoClose: NOTIFICATION_DURATION.MEDIUM_MS,
        });
        return undefined;
      });
  }, []);

  // Share current page
  const handleShare = useCallback(() => {
    if ("share" in navigator) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch(() => {
        handleCopyUrl();
      });
    } else {
      handleCopyUrl();
    }
  }, [handleCopyUrl]);

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs on home page
  }

  return (
    <Box component="nav" aria-label="Breadcrumb navigation" py="xs" px="md">
      <Group justify="space-between" align="center">
        <Breadcrumbs
          separator={<IconChevronRight size={ICON_SIZE.XS} color="var(--mantine-color-gray-5)" />}
          styles={{
            root: {
              flex: 1,
            },
            breadcrumb: {
              '&:hover': {
                backgroundColor: 'var(--mantine-color-gray-0)',
              },
            },
          }}
        >
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;

            return (
              <Anchor
                key={index}
                component={isLast ? undefined : Link}
                to={item.href}
                size="sm"
                fw={isLast ? BREADCRUMB_FONT_WEIGHT_ACTIVE : BREADCRUMB_FONT_WEIGHT_INACTIVE}
                c={isLast ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-7)"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: isLast ? "default" : "pointer",
                  textDecoration: "none",
                }}
                title={item.tooltip}
              >
                {item.icon}
                <Text span>{item.label}</Text>
                {item.badge !== undefined && item.badge !== "" && item.badge !== 0 && (
                  <Badge
                    size="xs"
                    variant="light"
                    color={item.badgeEntityType ? ENTITY_METADATA[item.badgeEntityType].color : "blue"}
                    radius="sm"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Anchor>
            );
          })}
        </Breadcrumbs>

        <Group gap="xs">
          <Tooltip label="Copy URL" withinPortal>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleCopyUrl}
              aria-label="Copy current page URL"
            >
              <IconCopy size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Share page" withinPortal>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleShare}
              aria-label="Share current page"
            >
              <IconShare size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  );
};