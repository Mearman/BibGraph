import {
  ActionIcon,
  Affix,
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
  Transition
} from "@mantine/core";
import {
  IconBookmarks,
  IconChevronLeft,
  IconChevronRight,
  IconHistory,
  IconHome,
  IconMenu2,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

interface MobileNavigationProperties {
  onSidebarToggle: (side: "left" | "right") => void;
  onMobileSearchOpen: () => void;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  bookmarkCount?: number;
  historyCount?: number;
}

interface SwipeGesture {
  startX: number;
  startY: number;
  startTime: number;
  direction: "left" | "right" | null;
}

// Swipe-gesture tuning constants
const SWIPE_MAX_VERTICAL_DEVIATION_PX = 50;
const SWIPE_DIRECTION_THRESHOLD_PX = 20;
const SWIPE_MIN_HORIZONTAL_DISTANCE_PX = 50;
const SWIPE_MIN_VELOCITY_PX_PER_MS = 0.3;
const EDGE_ZONE_WIDTH_PX = 100;
const SWIPE_HINT_SHOW_DELAY_MS = 2000;
const SWIPE_HINT_HIDE_DELAY_MS = 5000;
const SWIPE_INDICATOR_DIMMED_OPACITY = 0.3;
const MAX_DISPLAYED_BADGE_COUNT = 99;
const DRAWER_WIDTH_PX = 280;

export const MobileNavigation = ({
  onSidebarToggle,
  onMobileSearchOpen,
  leftSidebarOpen,
  rightSidebarOpen,
  bookmarkCount = 0,
  historyCount = 0,
}: MobileNavigationProperties) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [swipeGesture, setSwipeGesture] = useState<SwipeGesture | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe detection for sidebar control
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeGesture({
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      direction: null,
    });
  }, []);

  // Shared swipe-move logic, driven by whichever real pointer/clientX+Y the caller has - touch and pointer events carry these coordinates natively, so neither needs to be coerced into the other's event shape.
  const processSwipeMove = useCallback((clientX: number, clientY: number) => {
    if (!swipeGesture) return;

    const deltaX = clientX - swipeGesture.startX;
    const deltaY = Math.abs(clientY - swipeGesture.startY);

    // Only consider horizontal swipes
    if (deltaY > SWIPE_MAX_VERTICAL_DEVIATION_PX) return;

    // Determine swipe direction
    if (Math.abs(deltaX) > SWIPE_DIRECTION_THRESHOLD_PX) {
      const direction = deltaX > 0 ? "right" : "left";
      setSwipeGesture(previous => previous ? { ...previous, direction } : null);
    }
  }, [swipeGesture]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    processSwipeMove(touch.clientX, touch.clientY);
  }, [processSwipeMove]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    processSwipeMove(e.clientX, e.clientY);
  }, [processSwipeMove]);

  const processSwipeEnd = useCallback((clientX: number) => {
    if (!swipeGesture) return;

    const deltaX = clientX - swipeGesture.startX;
    const deltaTime = Date.now() - swipeGesture.startTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Swipe must be fast enough and long enough
    if (Math.abs(deltaX) > SWIPE_MIN_HORIZONTAL_DISTANCE_PX && velocity > SWIPE_MIN_VELOCITY_PX_PER_MS) {
      const direction = deltaX > 0 ? "right" : "left";

      if (direction === "right" && !leftSidebarOpen) {
        // Swipe right to open left sidebar
        onSidebarToggle("left");
      } else if (direction === "left" && leftSidebarOpen) {
        // Swipe left to close left sidebar
        onSidebarToggle("left");
      } else if (direction === "left" && !rightSidebarOpen) {
        // Swipe left from right edge to open right sidebar
        const windowWidth = window.innerWidth;
        if (swipeGesture.startX > windowWidth - EDGE_ZONE_WIDTH_PX) {
          onSidebarToggle("right");
        }
      } else if (direction === "right" && rightSidebarOpen && // Swipe right to close right sidebar
        swipeGesture.startX < EDGE_ZONE_WIDTH_PX) {
          onSidebarToggle("right");
        }
    }

    setSwipeGesture(null);
  }, [swipeGesture, leftSidebarOpen, rightSidebarOpen, onSidebarToggle]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    processSwipeEnd(touch.clientX);
  }, [processSwipeEnd]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    processSwipeEnd(e.clientX);
  }, [processSwipeEnd]);

  // Show swipe hints on mobile
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowSwipeHint(true);
    }, SWIPE_HINT_SHOW_DELAY_MS);
    const hideTimer = setTimeout(() => {
      setShowSwipeHint(false);
    }, SWIPE_HINT_SHOW_DELAY_MS + SWIPE_HINT_HIDE_DELAY_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Handle sidebar swipe indicators
  const getSwipeIndicator = useCallback((side: "left" | "right") => {
    const isOpen = side === "left" ? leftSidebarOpen : rightSidebarOpen;
    return {
      opacity: swipeGesture?.direction === side || isOpen ? 1 : SWIPE_INDICATOR_DIMMED_OPACITY,
      transform: swipeGesture?.direction === side
        ? "translateX(4px)"
        : "translateX(0)",
      transition: "all 0.3s ease",
    };
  }, [swipeGesture, leftSidebarOpen, rightSidebarOpen]);

  const navigationItems = [
    {
      icon: IconHome,
      label: "Home",
      to: "/",
      badge: null,
    },
    {
      icon: IconSearch,
      label: "Search",
      to: "#",
      badge: null,
      onClick: onMobileSearchOpen,
    },
    {
      icon: IconBookmarks,
      label: "Bookmarks",
      to: "/catalogue",
      badge: bookmarkCount > 0 ? bookmarkCount : null,
    },
    {
      icon: IconHistory,
      label: "History",
      to: "/history",
      badge: historyCount > 0 ? historyCount : null,
    },
  ];

  return (
    <>
      {/* Touch gesture detection area */}
      <Box
        ref={containerRef}
        pos="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        style={{ zIndex: 9998 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Left swipe indicator */}
      <Box
        pos="fixed"
        top="50%"
        left={0}
        style={{
          ...getSwipeIndicator("left"),
          transform: `translateY(-50%) ${getSwipeIndicator("left").transform}`,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <ActionIcon
          size="lg"
          variant="light"
          color="blue"
          radius="0"
          style={{
            height: "60px",
            width: "20px",
            borderRadius: "0 8px 8px 0",
          }}
        >
          <IconChevronRight />
        </ActionIcon>
      </Box>

      {/* Right swipe indicator */}
      <Box
        pos="fixed"
        top="50%"
        right={0}
        style={{
          ...getSwipeIndicator("right"),
          transform: `translateY(-50%) ${getSwipeIndicator("right").transform}`,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <ActionIcon
          size="lg"
          variant="light"
          color="blue"
          radius="0"
          style={{
            height: "60px",
            width: "20px",
            borderRadius: "8px 0 0 8px",
          }}
        >
          <IconChevronLeft />
        </ActionIcon>
      </Box>

      {/* Swipe hint overlay */}
      <Transition
        mounted={showSwipeHint}
        transition="fade"
        duration={500}
        timingFunction="ease"
      >
        {(style) => (
          <Box
            pos="fixed"
            top="50%"
            left="50%"
            style={{
              ...style,
              transform: "translate(-50%, -50%)",
              zIndex: 10000,
            }}
          >
            <Box bg="dark" p="md" style={{ borderRadius: "12px" }}>
              <Stack gap="xs" align="center">
                <Text size="sm" c="white" fw={500}>
                  Swipe Gestures
                </Text>
                <Text size="xs" c="gray.4">
                  Swipe right for sidebar • Swipe left to close
                </Text>
              </Stack>
            </Box>
          </Box>
        )}
      </Transition>

      {/* Bottom Navigation Bar */}
      <Affix position={{ bottom: 20, left: 20, right: 20 }}>
        <Box bg="white" style={{ borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Group gap="xs" p="xs">
            {navigationItems.map((item) => {
              const leftSection = (
                <Box pos="relative">
                  <item.icon size={20} />
                  {item.badge !== null && (
                    <Badge
                      size="xs"
                      color="red"
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                      }}
                    >
                      {item.badge > MAX_DISPLAYED_BADGE_COUNT ? "99+" : item.badge}
                    </Badge>
                  )}
                </Box>
              );
              const label = (
                <Text size="xs" fw={500}>
                  {item.label}
                </Text>
              );

              if (item.onClick !== undefined) {
                return (
                  <Button
                    key={item.label}
                    variant="subtle"
                    size="lg"
                    p="md"
                    style={{ flex: 1 }}
                    onClick={item.onClick}
                    leftSection={leftSection}
                  >
                    {label}
                  </Button>
                );
              }
              return (
                <Button
                  key={item.label}
                  component={Link}
                  to={item.to}
                  variant="subtle"
                  size="lg"
                  p="md"
                  style={{ flex: 1 }}
                  leftSection={leftSection}
                >
                  {label}
                </Button>
              );
            })}
          </Group>
        </Box>
      </Affix>

      {/* Mobile Menu Button (alternative for accessibility) */}
      <Affix position={{ top: 20, left: 20 }}>
        <Button
          variant="light"
          size="sm"
          leftSection={<IconMenu2 size={16} />}
          onClick={() => { setIsDrawerOpen(!isDrawerOpen); }}
        >
          Menu
        </Button>
      </Affix>

      {/* Mobile Drawer Menu */}
      <Transition
        mounted={isDrawerOpen}
        transition="slide-right"
        duration={300}
        timingFunction="ease"
      >
        {(style) => (
          <Box
            pos="fixed"
            top={0}
            left={0}
            bottom={0}
            bg="white"
            style={{ ...style, width: DRAWER_WIDTH_PX, zIndex: 10001 }}
            p="md"
          >
            <Stack gap="lg">
              <Group justify="space-between" align="center">
                <Text size="lg" fw={600}>
                  Navigation
                </Text>
                <ActionIcon
                  variant="subtle"
                  onClick={() => { setIsDrawerOpen(false); }}
                >
                  <IconX size={20} />
                </ActionIcon>
              </Group>

              <Stack gap="sm">
                {navigationItems.map((item) => {
                  const handleItemClick = () => {
                    item.onClick?.();
                    setIsDrawerOpen(false);
                  };
                  const rightSection = item.badge !== null && (
                    <Badge size="sm" color="red">
                      {item.badge > MAX_DISPLAYED_BADGE_COUNT ? "99+" : item.badge}
                    </Badge>
                  );

                  if (item.onClick !== undefined) {
                    return (
                      <Button
                        key={item.label}
                        variant="subtle"
                        fullWidth
                        size="md"
                        p="sm"
                        onClick={handleItemClick}
                        leftSection={<item.icon size={18} />}
                        rightSection={rightSection}
                      >
                        {item.label}
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={item.label}
                      component={Link}
                      to={item.to}
                      variant="subtle"
                      fullWidth
                      size="md"
                      p="sm"
                      onClick={handleItemClick}
                      leftSection={<item.icon size={18} />}
                      rightSection={rightSection}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Stack>

              <Box mt="auto" pt="md">
                <Text size="xs" c="dimmed" ta="center">
                  Tip: Use swipe gestures for quick navigation
                </Text>
              </Box>
            </Stack>
          </Box>
        )}
      </Transition>
    </>
  );
};