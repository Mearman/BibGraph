/**
 * Mobile gesture detection hook
 * Provides swipe detection and touch-based interactions for mobile devices
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SwipeConfig {
  threshold?: number; // Minimum distance for swipe (px)
  restraint?: number; // Maximum perpendicular movement (px)
  allowedTime?: number; // Maximum time for swipe (ms)
}

export interface SwipeDirection {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

const SWIPE_RESET_DELAY_MS = 100;

/**
 * Reads the legacy, non-standard `msMaxTouchPoints` property some older browsers expose on `navigator`, returning 0 when it's absent or not a number
 */
const readMsMaxTouchPoints = (candidate: unknown): number => {
  if (typeof candidate !== 'object' || candidate === null || !('msMaxTouchPoints' in candidate)) {
    return 0;
  }
  return typeof candidate.msMaxTouchPoints === 'number' ? candidate.msMaxTouchPoints : 0;
};

export const useMobileGestures = (config: Readonly<SwipeConfig> = {}) => {
  const {
    threshold = 50,
    restraint = 100,
    allowedTime = 300
  } = config;

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>({
    up: false,
    down: false,
    left: false,
    right: false
  });

  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);

  // Detect touch device on mount
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window ||
                   (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) ||
                   readMsMaxTouchPoints(navigator) > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;

    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Reset previous swipe direction
    setSwipeDirection({
      up: false,
      down: false,
      left: false,
      right: false
    });
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.changedTouches.length === 0) return;

    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Calculate swipe
    const elapsed = touchEnd.current.time - touchStart.current.time;
    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;

    // Check if valid swipe
    if (elapsed <= allowedTime) {
      const newSwipeDirection: SwipeDirection = {
        up: Math.abs(deltaY) >= threshold && Math.abs(deltaX) <= restraint && deltaY < 0,
        down: Math.abs(deltaY) >= threshold && Math.abs(deltaX) <= restraint && deltaY > 0,
        left: Math.abs(deltaX) >= threshold && Math.abs(deltaY) <= restraint && deltaX < 0,
        right: Math.abs(deltaX) >= threshold && Math.abs(deltaY) <= restraint && deltaX > 0
      };

      setSwipeDirection(newSwipeDirection);

      // Reset after animation
      setTimeout(() => {
        setSwipeDirection({
          up: false,
          down: false,
          left: false,
          right: false
        });
      }, SWIPE_RESET_DELAY_MS);
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [threshold, restraint, allowedTime]);

  // Add event listeners
  useEffect(() => {
    if (!isTouchDevice) return undefined;

    const element = document.documentElement;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isTouchDevice, handleTouchStart, handleTouchEnd]);

  return {
    isTouchDevice,
    swipeDirection,
    hasSwiped: Object.values(swipeDirection).some(Boolean),
    // Convenience methods
    swipedUp: swipeDirection.up,
    swipedDown: swipeDirection.down,
    swipedLeft: swipeDirection.left,
    swipedRight: swipeDirection.right
  };
};

/**
 * Hook for touch-friendly sidebar controls
 * Enhances mobile sidebar interaction with touch gestures
 */
export const useTouchSidebar = (onOpen: () => void, onClose: () => void, isOpen: boolean) => {
  const { isTouchDevice, swipedRight, swipedLeft } = useMobileGestures({
    threshold: 30,
    restraint: 50
  });

  // Handle swipe gestures for sidebar
  useEffect(() => {
    if (!isTouchDevice) return;

    if (!isOpen && swipedRight) {
      onOpen();
    } else if (isOpen && swipedLeft) {
      onClose();
    }
  }, [isTouchDevice, swipedRight, swipedLeft, isOpen, onOpen, onClose]);

  return {
    isTouchDevice,
    // Enhanced touch attributes for mobile
    touchProps: isTouchDevice ? {
      style: {
        touchAction: 'pan-y', // Allow vertical scrolling but handle horizontal swipes
        WebkitUserSelect: 'none', // Prevent text selection during swipe
        userSelect: 'none'
      }
    } : {}
  };
};

/**
 * Hook for mobile-optimized long press detection
 */
export const useLongPress = (onLongPress: () => void, delay = 500) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeoutReference = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsLongPressing(false);
    timeoutReference.current = setTimeout(() => {
      setIsLongPressing(true);
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timeoutReference.current) {
      clearTimeout(timeoutReference.current);
      timeoutReference.current = null;
    }
    setIsLongPressing(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }
    };
  }, []);

  return {
    isLongPressing,
    props: {
      onMouseDown: start,
      onMouseUp: clear,
      onMouseLeave: clear,
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchCancel: clear
    }
  };
};