/**
 * Main layout component: app shell header, collapsible navbar and main region. The header is a single non-wrapping row at every viewport width; below the sm breakpoint the navbar renders as a drawer driven by the layout store.
 */

import { getBuildInfo, getReleaseUrl } from "@bibgraph/utils";
import {
  ActionIcon,
  Anchor,
  AppShell,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  rem,
  Text,
} from "@mantine/core";
import {
  IconBookmarks,
  IconChartDots,
  IconHistory,
  IconHome,
  IconInfoCircle,
  IconKeyboard,
  IconLayoutSidebar,
  IconList,
  IconMenu,
  IconPin,
  IconPinned,
  IconSearch,
  IconSettings,
  IconWriting,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { KeyboardShortcutsButton, KeyboardShortcutsHelp } from "@/components/modals/KeyboardShortcutsHelp";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { OnboardingTutorial, TourLaunchpad } from "@/components/onboarding";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
import { InstallMenuItem } from "@/components/ui/InstallMenuItem";
import { OfflineBanner } from "@/components/ui/NetworkStatus";
import { UndoRedoControls } from "@/components/undo-redo/UndoRedoControls";
import { ICON_SIZE } from "@/config/style-constants";
import { useGlobalHotkeys } from "@/hooks/use-hotkeys";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useLayoutStore } from "@/stores/layout-store";
import { sprinkles } from "@/styles/sprinkles";
import {
  announceToScreenReader,
  createSkipLinks,
  injectAccessibilityStyles,
} from "@/utils/accessibility";

import { BookmarksSidebar } from "./BookmarksSidebar";
import { ColorSchemeSelector } from "./ColorSchemeSelector";
import { HeaderSearchInput } from "./HeaderSearchInput";
import { HistorySidebar } from "./HistorySidebar";
import { MIN_TOUCH_TARGET_PX } from "./layout-metrics";

interface MainLayoutProperties {
  children?: React.ReactNode;
}

// Static build info - computed once at module load
const buildInfo = getBuildInfo();
const releaseUrl = getReleaseUrl({
  repositoryUrl: buildInfo.repositoryUrl,
  version: buildInfo.version,
});

// Sidebar sizing and spacing constants
const DEFAULT_SIDEBAR_WIDTH_PX = 300;
const MIN_SIDEBAR_WIDTH_PX = 200;
const MAX_SIDEBAR_WIDTH_PX = 600;
const SIDEBAR_RESIZE_STEP_PX = 20;
const SIDEBAR_RESIZE_HANDLE_PX = 4;
const HEADER_HEIGHT_BASE_PX = 56;
const HEADER_HEIGHT_SM_PX = 60;
const MOBILE_SIDEBAR_WIDTH_PX = 280;
const HEADER_SEARCH_MAX_WIDTH_PX = 420;
const SPACING_XS_PX = 4;
const MOBILE_SEARCH_OVERLAY_Z_INDEX = 1000;
const SIDEBAR_RESIZE_HANDLE_Z_INDEX = 10;
const APP_LOAD_ANNOUNCEMENT = 'BibGraph application loaded';

export const MainLayout: React.FC<MainLayoutProperties> = ({ children }) => {
  // Initialize accessibility features on mount
  useEffect(() => {
    injectAccessibilityStyles();

    // Add skip links to the document
    const skipLinks = createSkipLinks();
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // Announce app load for screen readers
    announceToScreenReader(APP_LOAD_ANNOUNCEMENT, 'polite');

    return () => {
      if (document.body.contains(skipLinks)) {
        skipLinks.remove();
      }
    };
  }, []);

  // Keyboard shortcuts state
  const [shortcutsHelpOpened, setShortcutsHelpOpened] = useState(false);

  // Tour state: the launchpad in the corner offers the tour; it never opens by itself.
  const { tourOpen, openTour, closeTour } = useOnboarding();

  // Set up global keyboard shortcuts
  useGlobalHotkeys({
    enabled: true,
  });

  // Custom shortcuts for layout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+? for keyboard shortcuts help (override from useGlobalHotkeys)
      if (!((e.ctrlKey || e.metaKey) && e.key === '/')) {
      	return;
      }

      e.preventDefault();
      setShortcutsHelpOpened(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, []);

  // Layout store for sidebar state management
  const {
    leftSidebarOpen,
    leftSidebarPinned,
    toggleLeftSidebar,
    setLeftSidebarOpen,
    pinLeftSidebar,
  } = useLayoutStore();

  // Width state for dragging (using React state for immediate visual feedback)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH_PX);
  const [isDragging, setIsDragging] = useState<"left" | null>(null);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  // Mobile search state
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);

  // Drag handling for sidebar resizing
  const handleDragStart = useCallback(
    ({ e }: { side: "left"; e: React.MouseEvent }) => {
      e.preventDefault();
      setIsDragging("left");
      dragStartRef.current = {
        x: e.clientX,
        width: leftSidebarWidth,
      };
    },
    [leftSidebarWidth],
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const newWidth = Math.max(
        MIN_SIDEBAR_WIDTH_PX,
        Math.min(
          MAX_SIDEBAR_WIDTH_PX,
          dragStartRef.current.width + deltaX,
        ),
      );

      setLeftSidebarWidth(newWidth);
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
    dragStartRef.current = null;
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <AppShell
      header={{ height: { base: HEADER_HEIGHT_BASE_PX, sm: HEADER_HEIGHT_SM_PX } }}
      navbar={{
        width: { base: MOBILE_SIDEBAR_WIDTH_PX, sm: leftSidebarWidth },
        breakpoint: "sm",
        // The same store flag drives the desktop collapse and the mobile drawer, so the menu item works on phones.
        collapsed: { mobile: !leftSidebarOpen, desktop: !leftSidebarOpen },
      }}
      padding={{ base: 0, sm: 'xs', md: 'sm' }}
    >
      {/* Header */}
      <AppShell.Header aria-label="Main header">
        <Group
          justify="space-between"
          align="center"
          wrap="nowrap"
          h="100%"
          gap="xs"
          px={{ base: 'xs', sm: 'md' }}
          style={{ overflow: 'hidden' }}
        >
          {/* Left side - logo (always visible) and version badge (wide screens only) */}
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flexShrink: 0 }}>
            <Link
              to="/"
              params={{}}
              aria-label="BibGraph home"
              style={{
                textDecoration: 'none',
                minHeight: MIN_TOUCH_TARGET_PX,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Text
                size="lg"
                fw={600}
                c="blue"
                className={sprinkles({ cursor: 'pointer' })}
                lineClamp={1}
                style={{ fontSize: 'clamp(1.125rem, 4vw, 1.5rem)' }}
              >
                BibGraph
              </Text>
            </Link>
            <Anchor
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
              visibleFrom="xl"
            >
              <Badge
                variant="light"
                size="sm"
                className={sprinkles({ cursor: 'pointer' })}
              >
                v{buildInfo.version}
              </Badge>
            </Anchor>
          </Group>

          {/* Center - search (flexes to absorb width changes so the row never wraps) */}
          <Box
            visibleFrom="sm"
            id="search"
            role="search"
            aria-label="Search"
            style={{ flex: 1, minWidth: 0, maxWidth: HEADER_SEARCH_MAX_WIDTH_PX, margin: '0 auto' }}
          >
            <HeaderSearchInput />
          </Box>

          {/* Right side controls: every group is nowrap and flexShrink 0 */}
          <Group gap="xs" wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
            {/* Sync, undo/redo and notifications: collapsed out of the narrow header, they stay reachable through the overflow menu below md */}
            <Group gap={rem(SPACING_XS_PX)} wrap="nowrap" visibleFrom="md">
              <SyncStatusIndicator />
              <UndoRedoControls />
            </Group>
            <NotificationCenter />

            {/* Primary navigation */}
            <Group gap={rem(SPACING_XS_PX)} wrap="nowrap" visibleFrom="lg">
              <Button component={Link} to="/" variant="subtle" size="xs">
                Home
              </Button>
              <Button component={Link} to="/about" variant="subtle" size="xs">
                About
              </Button>
            </Group>

            {/* Sidebar toggle */}
            <ActionIcon
              onClick={toggleLeftSidebar}
              variant="subtle"
              size={MIN_TOUCH_TARGET_PX}
              aria-label={leftSidebarOpen ? 'Hide left sidebar' : 'Show left sidebar'}
              color={leftSidebarOpen ? 'blue' : 'gray'}
              visibleFrom="sm"
            >
              <IconLayoutSidebar size={ICON_SIZE.LG} />
            </ActionIcon>

            {/* Collection navigation */}
            <Group gap={rem(SPACING_XS_PX)} wrap="nowrap" visibleFrom="xl">
              <Button component={Link} to="/reviews" variant="subtle" size="xs">
                Reviews
              </Button>
              <Button component={Link} to="/history" variant="subtle" size="xs">
                History
              </Button>
              <Button component={Link} to="/bookmarks" variant="subtle" size="xs">
                Bookmarks
              </Button>
              <Button component={Link} to="/catalogue" variant="subtle" size="xs">
                Catalogue
              </Button>
            </Group>

            <ColorSchemeSelector />
            <Box visibleFrom="sm">
              <KeyboardShortcutsButton
                onClick={() => { setShortcutsHelpOpened(true); }}
              />
            </Box>

            {/* Mobile search - full width overlay when expanded */}
            {mobileSearchExpanded ? (
              <Box
                hiddenFrom="sm"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: 'var(--mantine-color-body)',
                  zIndex: MOBILE_SEARCH_OVERLAY_Z_INDEX,
                  padding: '0 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ActionIcon
                  onClick={() => { setMobileSearchExpanded(false); }}
                  variant="subtle"
                  size={MIN_TOUCH_TARGET_PX}
                  aria-label="Close search"
                >
                  <IconX size={ICON_SIZE.LG} />
                </ActionIcon>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <HeaderSearchInput />
                </Box>
              </Box>
            ) : (
              <ActionIcon
                onClick={() => { setMobileSearchExpanded(true); }}
                variant="subtle"
                size={MIN_TOUCH_TARGET_PX}
                aria-label="Open search"
                hiddenFrom="sm"
              >
                <IconSearch size={ICON_SIZE.LG} />
              </ActionIcon>
            )}

            {/* Overflow menu: owns everything the one-row header drops below md */}
            <Menu shadow="md" width={220}>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size={MIN_TOUCH_TARGET_PX}
                  aria-label="Open menu"
                >
                  <IconMenu size={ICON_SIZE.LG} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconLayoutSidebar size={ICON_SIZE.MD} />}
                  onClick={toggleLeftSidebar}
                >
                  {leftSidebarOpen ? 'Hide Left Panel' : 'Show Left Panel'}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                  onClick={() => { setMobileSearchExpanded(true); }}
                >
                  Search
                </Menu.Item>
                <Menu.Divider />
                <Menu.Label>Navigation</Menu.Label>
                <Menu.Item component={Link} to="/" leftSection={<IconHome size={ICON_SIZE.MD} />}>
                  Home
                </Menu.Item>
                <Menu.Item component={Link} to="/about" leftSection={<IconInfoCircle size={ICON_SIZE.MD} />}>
                  About
                </Menu.Item>
                <Menu.Item component={Link} to="/reviews" leftSection={<IconWriting size={ICON_SIZE.MD} />}>
                  Reviews
                </Menu.Item>
                <Menu.Item component={Link} to="/history" leftSection={<IconHistory size={ICON_SIZE.MD} />}>
                  History
                </Menu.Item>
                <Menu.Item component={Link} to="/bookmarks" leftSection={<IconBookmarks size={ICON_SIZE.MD} />}>
                  Bookmarks
                </Menu.Item>
                <Menu.Item component={Link} to="/catalogue" leftSection={<IconList size={ICON_SIZE.MD} />}>
                  Catalogue
                </Menu.Item>
                <Menu.Item component={Link} to="/graph" leftSection={<IconChartDots size={ICON_SIZE.MD} />}>
                  Graph
                </Menu.Item>
                <Menu.Item component={Link} to="/settings" leftSection={<IconSettings size={ICON_SIZE.MD} />}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconKeyboard size={ICON_SIZE.MD} />}
                  onClick={() => { setShortcutsHelpOpened(true); }}
                >
                  Keyboard shortcuts
                </Menu.Item>
                {/* Install entry renders only where the browser offers a deferred install prompt */}
                <InstallMenuItem />
                <Menu.Label>Sync and history</Menu.Label>
                <SyncStatusIndicator />
                <UndoRedoControls />
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Left Sidebar */}
      <AppShell.Navbar id="navigation" aria-label="Primary navigation" p={0}>
        <Box
          className={sprinkles({ display: 'flex', flexDirection: 'column', height: 'full', position: 'relative' })}
          style={{ overflow: 'hidden' }}
        >
          {/* Panel header: title, mobile close (the drawer has no built-in close affordance) and pin toggle */}
          <Group justify="space-between" align="center" wrap="nowrap" mb="sm" px="xs" pt="xs">
            <Text size="xs" c="dimmed">
              Left Panel
            </Text>
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                onClick={() => { setLeftSidebarOpen(false); }}
                variant="subtle"
                size={MIN_TOUCH_TARGET_PX}
                aria-label="Close left panel"
                hiddenFrom="sm"
              >
                <IconX size={ICON_SIZE.LG} />
              </ActionIcon>
              <ActionIcon
                onClick={() => {
                  pinLeftSidebar(!leftSidebarPinned);
                }}
                variant="subtle"
                size={MIN_TOUCH_TARGET_PX}
                aria-label={
                  leftSidebarPinned
                    ? 'Unpin left sidebar'
                    : 'Pin left sidebar'
                }
                color={leftSidebarPinned ? 'blue' : 'gray'}
              >
                {leftSidebarPinned ? (
                  <IconPinned size={ICON_SIZE.MD} />
                ) : (
                  <IconPin size={ICON_SIZE.MD} />
                )}
              </ActionIcon>
            </Group>
          </Group>

          {/* Upper half: Bookmarks */}
          <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <BookmarksSidebar />
          </Box>

          {/* Lower half: History */}
          <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <HistorySidebar />
          </Box>

          {/* Drag handle - desktop only */}
          {leftSidebarOpen && (
            <Box
              role="slider"
              aria-label="Resize left sidebar"
              aria-orientation="horizontal"
              aria-valuenow={leftSidebarWidth}
              aria-valuemin={MIN_SIDEBAR_WIDTH_PX}
              aria-valuemax={MAX_SIDEBAR_WIDTH_PX}
              tabIndex={0}
              visibleFrom="md"
              w={rem(SIDEBAR_RESIZE_HANDLE_PX)}
              h="100%"
              bg={isDragging === 'left' ? 'blue' : 'transparent'}
              style={{ position: 'absolute', right: 0, top: 0, zIndex: SIDEBAR_RESIZE_HANDLE_Z_INDEX }}
              className={sprinkles({ cursor: 'resize' })}
              bd={`1px solid var(--mantine-color-default-border)`}
              onMouseDown={(e) => {
                handleDragStart({ side: 'left', e });
              }}
              onKeyDown={(e) => {
                // Handle keyboard resize with arrow keys
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setLeftSidebarWidth((previous) => Math.max(MIN_SIDEBAR_WIDTH_PX, previous - SIDEBAR_RESIZE_STEP_PX));
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setLeftSidebarWidth((previous) => Math.min(MAX_SIDEBAR_WIDTH_PX, previous + SIDEBAR_RESIZE_STEP_PX));
                }
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.background = 'var(--mantine-color-default-border)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            />
          )}
        </Box>
      </AppShell.Navbar>

      {/* Main Content Area */}
      <AppShell.Main
        id="main-content"
        tabIndex={-1}
        data-testid="main-content"
        className={sprinkles({ flexDirection: 'column', overflow: 'auto' })}
      >
        <OfflineBanner />
        {children}
      </AppShell.Main>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        opened={shortcutsHelpOpened}
        onClose={() => { setShortcutsHelpOpened(false); }}
      />

      {/* Feature tour: offered from the corner, opened on demand */}
      <TourLaunchpad onOpen={openTour} />
      <OnboardingTutorial
        opened={tourOpen}
        onClose={closeTour}
      />

    </AppShell>
  );
};
