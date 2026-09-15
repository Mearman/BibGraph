/**
 * Touch Gesture Hook
 *
 * Provides advanced touch gesture support for mobile interactions with charts and graphs.
 * Includes swipe, pinch, and double-tap gestures with proper accessibility.
 */

import { useCallback, useRef, useState } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface TouchGestureState {
  touches: TouchPoint[];
  isGesturing: boolean;
  currentGesture: 'swipe' | 'pinch' | 'double-tap' | 'long-press' | null;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  pinchScale: number;
  lastTapTime: number;
  tapCount: number;
}

export interface TouchGestureHandlers {
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down', velocity: number) => void;
  onPinch?: (scale: number, centerX: number, centerY: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onTouchStart?: (touches: readonly TouchPoint[]) => void;
  onTouchMove?: (touches: readonly TouchPoint[]) => void;
  onTouchEnd?: (touches: readonly TouchPoint[]) => void;
}

export interface TouchGestureOptions {
  swipeThreshold?: number;
  pinchThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
  preventDefault?: boolean;
}

const PINCH_SCALE_PERCENTAGE_DIVISOR = 100;

export const useTouchGestures = (
  handlers: Readonly<TouchGestureHandlers> = {},
  options: Readonly<TouchGestureOptions> = {}
) => {
  const {
    swipeThreshold = 50,
    pinchThreshold = 20,
    doubleTapDelay = 300,
    longPressDelay = 500,
    preventDefault = true,
  } = options;

  const [gestureState, setGestureState] = useState<TouchGestureState>({
    touches: [],
    isGesturing: false,
    currentGesture: null,
    swipeDirection: null,
    pinchScale: 1,
    lastTapTime: 0,
    tapCount: 0,
  });

  const longPressTimerReference = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceReference = useRef<number | null>(null);

  const getTouchPoints = useCallback((touches: TouchList | React.TouchList): TouchPoint[] => {
    // Built via the length + index-generator form of Array.from (not a spreadable conversion), since React's TouchList is ArrayLike but not iterable, unlike the DOM's native TouchList
    return Array.from({ length: touches.length }, (_, index) => {
      const touch = touches[index];
      return {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };
    });
  }, []);

  const calculateDistance = useCallback((touch1: Readonly<TouchPoint>, touch2: Readonly<TouchPoint>): number => {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const calculateSwipeDirection = useCallback(
    (startPoint: Readonly<TouchPoint>, endPoint: Readonly<TouchPoint>): 'left' | 'right' | 'up' | 'down' | null => {
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < swipeThreshold) return null;

      if (absDx > absDy) {
        return dx > 0 ? 'right' : 'left';
      }
      return dy > 0 ? 'down' : 'up';
    },
    [swipeThreshold]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (preventDefault) {
        event.preventDefault();
      }

      const currentTouches = getTouchPoints(event.touches);
      setGestureState(previous => ({
        ...previous,
        touches: currentTouches,
        isGesturing: true,
      }));

      // Start long press timer for single touch
      if (currentTouches.length === 1 && handlers.onLongPress) {
        longPressTimerReference.current = setTimeout(() => {
          const touch = currentTouches[0];
          handlers.onLongPress?.(touch.x, touch.y);
          setGestureState(previous => ({
            ...previous,
            currentGesture: 'long-press',
          }));
        }, longPressDelay);
      }

      // Initialize pinch detection
      if (currentTouches.length === 2 && handlers.onPinch) {
        initialPinchDistanceReference.current = calculateDistance(currentTouches[0], currentTouches[1]);
      }

      handlers.onTouchStart?.(currentTouches);
    },
    [getTouchPoints, calculateDistance, handlers, preventDefault, longPressDelay]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (preventDefault && gestureState.isGesturing) {
        event.preventDefault();
      }

      const currentTouches = getTouchPoints(event.touches);

      setGestureState(previous => ({
        ...previous,
        touches: currentTouches,
      }));

      // Clear long press timer on move
      if (longPressTimerReference.current) {
        clearTimeout(longPressTimerReference.current);
        longPressTimerReference.current = null;
      }

      // Handle pinch gesture
      if (currentTouches.length === 2 && handlers.onPinch && initialPinchDistanceReference.current !== null) {
        const currentDistance = calculateDistance(currentTouches[0], currentTouches[1]);
        const scale = currentDistance / initialPinchDistanceReference.current;
        const centerX = (currentTouches[0].x + currentTouches[1].x) / 2;
        const centerY = (currentTouches[0].y + currentTouches[1].y) / 2;

        if (Math.abs(scale - 1) > pinchThreshold / PINCH_SCALE_PERCENTAGE_DIVISOR) {
          handlers.onPinch(scale, centerX, centerY);
          setGestureState(previous => ({
            ...previous,
            currentGesture: 'pinch',
            pinchScale: scale,
          }));
        }
      }

      handlers.onTouchMove?.(currentTouches);
    },
    [getTouchPoints, calculateDistance, gestureState.isGesturing, handlers, preventDefault, pinchThreshold]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (preventDefault && gestureState.isGesturing) {
        event.preventDefault();
      }

      const finalTouches = getTouchPoints(event.touches);
      const previousTouches = gestureState.touches;

      // Clear long press timer
      if (longPressTimerReference.current) {
        clearTimeout(longPressTimerReference.current);
        longPressTimerReference.current = null;
      }

      // Handle double tap
      if (previousTouches.length === 1 && finalTouches.length === 0 && handlers.onDoubleTap) {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - gestureState.lastTapTime;
        const tapPoint = previousTouches[0];

        if (timeSinceLastTap < doubleTapDelay) {
          const newTapCount = gestureState.tapCount + 1;

          if (newTapCount === 2) {
            handlers.onDoubleTap(tapPoint.x, tapPoint.y);
            setGestureState(previous => ({
              ...previous,
              currentGesture: 'double-tap',
              tapCount: 0,
              lastTapTime: 0,
            }));
            return;
          }
        }

        setGestureState(previous => ({
          ...previous,
          tapCount: 1,
          lastTapTime: currentTime,
        }));
      }

      // Handle swipe
      if (previousTouches.length === 1 && finalTouches.length === 0 && handlers.onSwipe) {
        const direction = calculateSwipeDirection(
          previousTouches[0],
          { x: previousTouches[0].x, y: previousTouches[0].y, timestamp: Date.now() }
        );

        if (direction) {
          const velocity = swipeThreshold / PINCH_SCALE_PERCENTAGE_DIVISOR; // Simplified velocity calculation
          handlers.onSwipe(direction, velocity);
          setGestureState(previous => ({
            ...previous,
            currentGesture: 'swipe',
            swipeDirection: direction,
          }));
        }
      }

      // Reset pinch state
      if (finalTouches.length < 2) {
        initialPinchDistanceReference.current = null;
      }

      setGestureState(previous => ({
        ...previous,
        touches: finalTouches,
        isGesturing: finalTouches.length > 0,
        currentGesture: finalTouches.length > 0 ? previous.currentGesture : null,
      }));

      handlers.onTouchEnd?.(finalTouches);
    },
    [
      getTouchPoints,
      gestureState.touches,
      gestureState.lastTapTime,
      gestureState.tapCount,
      calculateSwipeDirection,
      handlers,
      preventDefault,
      doubleTapDelay,
      swipeThreshold,
    ]
  );

  return {
    gestureState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};