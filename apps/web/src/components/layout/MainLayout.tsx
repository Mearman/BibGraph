/**
 * Main layout component - RESTORED with infinite loop safeguards
 * Carefully re-enabled components to prevent React 19 infinite loops
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
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconLayoutSidebar,
  IconLayoutSidebarRight,
  IconMenu,
  IconPin,
  IconPinned,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { KeyboardShortcutsButton, KeyboardShortcutsHelp } from "@/components/modals/KeyboardShortcutsHelp";
import { ICON_SIZE } from "@/config/style-constants";
import { useGlobalHotkeys } from "@/hooks/use-hotkeys";
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
import { LeftRibbon } from "./LeftRibbon";
import { RightRibbon } from "./RightRibbon";
import { RightSidebarContent } from "./RightSidebarContent";
// import { ThemeDropdown } from "./ThemeDropdown";
// import { ThemeSettings } from "@/components/ThemeSettings";

// Static build info - computed once at module load
const buildInfo = getBuildInfo();
const releaseUrl = getReleaseUrl({
  repositoryUrl: buildInfo.repositoryUrl,
  version: buildInfo.version,
});

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Initialize accessibility features on mount
  useEffect(() => {
    injectAccessibilityStyles();

    // Add skip links to the document
    const skipLinks = createSkipLinks();
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // Announce app load for screen readers
    announceToScreenReader('BibGraph application loaded', 'polite');

    return () => {
      if (document.body.contains(skipLinks)) {
        skipLinks.remove();
      }
    };
  }, []);

  // Keyboard shortcuts state
  const [shortcutsHelpOpened, setShortcutsHelpOpened] = useState(false);

  // Set up global keyboard shortcuts
  useGlobalHotkeys({
    enabled: true,
  });

  // Custom shortcuts for layout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+? for keyboard shortcuts help (override from useGlobalHotkeys)
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsHelpOpened(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Layout store for sidebar state management
  const layoutStore = useLayoutStore();

  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarPinned,
    rightSidebarPinned,
    toggleLeftSidebar,
    toggleRightSidebar,
    pinLeftSidebar,
    pinRightSidebar,
  } = layoutStore;

  // Width state for dragging (using React state for immediate visual feedback)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  // Mobile menu state
  
  // Mobile search state
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);

  
  // Drag handling for sidebar resizing
  const handleDragStart = useCallback(
    ({ side, e }: { side: "left" | "right"; e: React.MouseEvent }) => {
      e.preventDefault();
      setIsDragging(side);
      dragStartRef.current = {
        x: e.clientX,
        width: side === "left" ? leftSidebarWidth : rightSidebarWidth,
      };
    },
    [leftSidebarWidth, rightSidebarWidth],
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const newWidth = Math.max(
        200,
        Math.min(
          600,
          dragStartRef.current.width +
            (isDragging === "left" ? deltaX : -deltaX),
        ),
      );

      if (isDragging === "left") {
        setLeftSidebarWidth(newWidth);
      } else {
        setRightSidebarWidth(newWidth);
      }
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
    dragStartRef.current = null;
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
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
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <AppShell
      header={{ height: { base: 50, sm: 60 } }}
      navbar={{
        width: leftSidebarOpen ? { base: 280, sm: leftSidebarWidth + 60 } : 60,
        breakpoint: "sm",
        collapsed: { mobile: true, desktop: !leftSidebarOpen },
      }}
      aside={{
        width: rightSidebarOpen ? { base: 280, sm: rightSidebarWidth + 60 } : 60,
        breakpoint: "sm",
        collapsed: { mobile: true, desktop: !rightSidebarOpen },
      }}
      padding={{ base: 0, sm: 'xs', md: 'sm' }}
    >
      {/* Header */}
      <AppShell.Header>
        <Group justify="space-between" h="100%" px={{ base: 'xs', sm: 'md' }}>
          {/* Left side - Always show logo on mobile, hide version badge */}
          <Group gap="xs" style={{ minWidth: 0, flexShrink: 0 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
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
            {/* Version badge only on larger screens */}
            <Anchor
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
              visibleFrom="sm"
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

          {/* Center - Desktop search only */}
          <Box visibleFrom="sm" style={{ flex: 1, maxWidth: 400, margin: '0 auto' }}>
            <HeaderSearchInput />
          </Box>

          {/* Right side - Controls with mobile optimization */}
          <Group gap="xs" style={{ flexShrink: 0 }}>
            {/* Mobile search - full width when expanded */}
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
                  zIndex: 1000,
                  padding: '0 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ActionIcon
                  onClick={() => setMobileSearchExpanded(false)}
                  variant="subtle"
                  size="lg"
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
                onClick={() => setMobileSearchExpanded(true)}
                variant="subtle"
                size="lg"
                aria-label="Open search"
                hiddenFrom="sm"
              >
                <IconSearch size={ICON_SIZE.LG} />
              </ActionIcon>
            )}

            {/* Desktop navigation - hidden on smaller screens */}
            <Group gap={rem(4)} visibleFrom="lg">
              <Button
                component={Link}
                to="/"
                variant="subtle"
                size="xs"
              >
                Home
              </Button>
              <Button
                component={Link}
                to="/about"
                variant="subtle"
                size="xs"
              >
                About
              </Button>
            </Group>

            {/* Sidebar controls - simplified on mobile */}
            <Group gap="xs" visibleFrom="sm">
              <ActionIcon
                onClick={toggleLeftSidebar}
                variant="subtle"
                size="lg"
                aria-label="Toggle left sidebar"
                color={leftSidebarOpen ? "blue" : "gray"}
              >
                <IconLayoutSidebar size={ICON_SIZE.LG} />
              </ActionIcon>

              <ActionIcon
                onClick={toggleRightSidebar}
                variant="subtle"
                size="lg"
                aria-label="Toggle right sidebar"
                color={rightSidebarOpen ? "blue" : "gray"}
              >
                <IconLayoutSidebarRight size={ICON_SIZE.LG} />
              </ActionIcon>
            </Group>

            {/* Mobile-only menu button */}
            <Box hiddenFrom="sm">
              <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  aria-label="Menu"
                >
                  <IconMenu size={ICON_SIZE.LG} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconLayoutSidebar size={ICON_SIZE.MD} />}
                  onClick={toggleLeftSidebar}
                >
                  {leftSidebarOpen ? 'Hide' : 'Show'} Left Panel
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconLayoutSidebarRight size={ICON_SIZE.MD} />}
                  onClick={toggleRightSidebar}
                >
                  {rightSidebarOpen ? 'Hide' : 'Show'} Right Panel
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                  onClick={() => setMobileSearchExpanded(true)}
                >
                  Search
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  Home
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/about"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  About
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  component={Link}
                  to="/history"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  History
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/bookmarks"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  Bookmarks
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/catalogue"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  Catalogue
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/settings"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  Settings
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/algorithms"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  Algorithms
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to="/graph"
                  leftSection={<IconSearch size={ICON_SIZE.MD} />}
                >
                  Graph
                </Menu.Item>
              </Menu.Dropdown>
              </Menu>
            </Box>

            {/* Desktop navigation - additional buttons */}
            <Group gap={rem(4)} visibleFrom="xl">
              <Button
                component={Link}
                to="/history"
                variant="subtle"
                size="xs"
              >
                History
              </Button>
              <Button
                component={Link}
                to="/bookmarks"
                variant="subtle"
                size="xs"
              >
                Bookmarks
              </Button>
              <Button
                component={Link}
                to="/catalogue"
                variant="subtle"
                size="xs"
              >
                Catalogue
              </Button>
            </Group>

            {/* Theme selector and help - visible on all screen sizes */}
            <ColorSchemeSelector />
            <KeyboardShortcutsButton
              onClick={() => setShortcutsHelpOpened(true)}
            />
          </Group>
        </Group>
      </AppShell.Header>

      {/* Left Sidebar */}
      <AppShell.Navbar p={0}>
        <div
          className={sprinkles({ display: 'flex', height: 'full', position: 'relative' })}
          style={{ overflow: "hidden" }}
        >
          {/* Always visible left ribbon */}
          <LeftRibbon />

          {/* Expandable sidebar content */}
          {leftSidebarOpen && (
            <>
              <Box
                flex={1}
                p={{ base: 'xs', sm: 'sm' }}
                data-testid="left-sidebar-content"
                className={sprinkles({ flexDirection: 'column', height: 'full' })}
                style={{ overflow: "hidden" }}
              >
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Left Panel
                  </Text>
                  <Group gap="xs">
                    <ActionIcon
                      onClick={() => {
                        pinLeftSidebar(!leftSidebarPinned);
                      }}
                      variant="subtle"
                      size="sm"
                      aria-label={
                        leftSidebarPinned
                          ? "Unpin left sidebar"
                          : "Pin left sidebar"
                      }
                      color={leftSidebarPinned ? "blue" : "gray"}
                    >
                      {leftSidebarPinned ? (
                        <IconPinned size={ICON_SIZE.SM} />
                      ) : (
                        <IconPin size={ICON_SIZE.SM} />
                      )}
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Upper half: Bookmarks */}
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    marginBottom: "1rem",
                  }}
                >
                  <BookmarksSidebar />
                </Box>

                {/* Lower half: History */}
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                  }}
                >
                  <HistorySidebar />
                </Box>
              </Box>
              {/* Left drag handle - desktop only */}
              <Box
                role="slider"
                aria-label="Resize left sidebar"
                aria-orientation="vertical"
                aria-valuenow={leftSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                visibleFrom="md"
                w={rem(4)}
                h="100%"
                bg={isDragging === "left" ? "blue" : "transparent"}
                style={{ position: "absolute", right: 0, top: 0, zIndex: 10 }}
                className={sprinkles({ cursor: 'resize' })}
                bd={`1px solid var(--mantine-color-gray-3)`}
                onMouseDown={(e) => {
                  handleDragStart({ side: "left", e });
                }}
                onKeyDown={(e) => {
                  // Handle keyboard resize with arrow keys
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setLeftSidebarWidth((prev) => Math.max(200, prev - 20));
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setLeftSidebarWidth((prev) => Math.min(600, prev + 20));
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = "var(--mantine-color-gray-3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              />
            </>
          )}
        </div>
      </AppShell.Navbar>

      {/* Right Sidebar */}
      <AppShell.Aside p={0}>
        <div
          style={{
            display: "flex",
            height: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Expandable sidebar content */}
          {rightSidebarOpen && (
            <>
              {/* Right drag handle - desktop only */}
              <Box
                role="slider"
                aria-label="Resize right sidebar"
                aria-orientation="vertical"
                aria-valuenow={rightSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                visibleFrom="md"
                w={rem(4)}
                h="100%"
                bg={isDragging === "right" ? "blue" : "transparent"}
                style={{ position: "absolute", left: 0, top: 0, zIndex: 10 }}
                className={sprinkles({ cursor: 'resize' })}
                bd={`1px solid var(--mantine-color-gray-3)`}
                onMouseDown={(e) => {
                  handleDragStart({ side: "right", e });
                }}
                onKeyDown={(e) => {
                  // Handle keyboard resize with arrow keys
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setRightSidebarWidth((prev) => Math.min(600, prev + 20));
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setRightSidebarWidth((prev) => Math.max(200, prev - 20));
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = "var(--mantine-color-gray-3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              />
              <Box
                flex={1}
                p={{ base: 'xs', sm: 'sm' }}
                style={{ marginLeft: rem(4) }}
                data-testid="right-sidebar-content"
              >
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Graph Analysis
                  </Text>
                  <Group gap="xs">
                    <ActionIcon
                      onClick={() => {
                        pinRightSidebar(!rightSidebarPinned);
                      }}
                      variant="subtle"
                      size="sm"
                      aria-label={
                        rightSidebarPinned
                          ? "Unpin right sidebar"
                          : "Pin right sidebar"
                      }
                      color={rightSidebarPinned ? "blue" : "gray"}
                    >
                      {rightSidebarPinned ? (
                        <IconPinned size={ICON_SIZE.SM} />
                      ) : (
                        <IconPin size={ICON_SIZE.SM} />
                      )}
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Graph Algorithms Panel */}
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                  }}
                >
                  <RightSidebarContent />
                </Box>
              </Box>
            </>
          )}

          {/* Always visible right ribbon */}
          <RightRibbon />
        </div>
      </AppShell.Aside>

      {/* Main Content Area */}
      <AppShell.Main
        data-testid="main-content"
        className={sprinkles({ flexDirection: 'column', overflow: 'auto' })}
      >
        {children ?? (
          <Stack align="center" justify="center" h="100%" gap="md" c="dimmed">
            <Title order={2}>BibGraph</Title>
            <Text>Sidebars restored - Navigate to view content</Text>
          </Stack>
        )}
      </AppShell.Main>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        opened={shortcutsHelpOpened}
        onClose={() => setShortcutsHelpOpened(false)}
      />

      </AppShell>
  );
};
