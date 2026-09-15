import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

const LIVE_REGION_ANNOUNCEMENT_CLEAR_DELAY_MS = 1000;

// Hook for managing ARIA live regions
export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) {
    	return;
    }

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear the announcement after a delay to allow repeated announcements
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, LIVE_REGION_ANNOUNCEMENT_CLEAR_DELAY_MS);
  }, []);

  const LiveRegionComponent = useCallback(() => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  ), []);

  return { announce, LiveRegionComponent };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (items: readonly { id: string; element?: HTMLElement | null }[], onSelect?: (id: string) => void) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'j':
        event.preventDefault();
        setActiveIndex(previous => (previous + 1) % items.length);
        break;
      case 'ArrowUp':
      case 'k':
        event.preventDefault();
        setActiveIndex(previous => (previous - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onSelect) {
          onSelect(items[activeIndex].id);
        }
        break;
    }
  }, [items, activeIndex, onSelect]);

  // Focus active element
  useEffect(() => {
    if (items[activeIndex]?.element) {
      items[activeIndex].element.focus();
    }
  }, [activeIndex, items]);

  return { activeIndex, handleKeyDown, setActiveIndex };
};

// Hook for focus trap
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return undefined;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return undefined;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Focus first element when trap is activated
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

// Hook for managing ARIA attributes
export const useAriaAttributes = () => {
  const getAriaLabel = useCallback((elementType: string, action?: string) => {
    const labels = {
      button: 'Button',
      link: 'Link',
      input: 'Input field',
      select: 'Dropdown',
      checkbox: 'Checkbox',
      radio: 'Radio button',
      modal: 'Dialog',
      menu: 'Menu',
      tab: 'Tab',
      table: 'Table',
    };

    const isLabelKey = (key: string): key is keyof typeof labels => key in labels;
    const baseLabel = isLabelKey(elementType) ? labels[elementType] : elementType;
    return action !== undefined ? `${baseLabel} ${action}` : baseLabel;
  }, []);

  const getAriaDescribedBy = useCallback((elementId: string, description?: string) => {
    if (description === undefined) return undefined;

    const descriptionId = `${elementId}-description`;
    return descriptionId;
  }, []);

  return { getAriaLabel, getAriaDescribedBy };
};

const SCREEN_READER_ANNOUNCEMENT_CLEANUP_DELAY_MS = 2000;

// Hook for screen reader announcements
export const useScreenReader = () => {
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Guard against SSR environments where document might not be available
    if (typeof document === 'undefined') {
      return;
    }

    try {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';

      document.body.append(announcement);
      announcement.textContent = message;

      // Use a longer timeout to ensure screen readers can process the announcement
      setTimeout(() => {
        try {
          if (document.body.contains(announcement)) {
            announcement.remove();
          }
        } catch {
          // Ignore errors during cleanup
        }
      }, SCREEN_READER_ANNOUNCEMENT_CLEANUP_DELAY_MS);
    } catch (error) {
      // Fail silently for accessibility features - they should never break the app
      console.warn('Failed to create screen reader announcement:', error);
    }
  }, []);

  const announceNavigation = useCallback((direction: 'forward' | 'backward', itemName?: string) => {
    const message = itemName !== undefined
      ? `Navigated ${direction} to ${itemName}`
      : `Navigated ${direction}`;
    announceToScreenReader(message, 'polite');
  }, [announceToScreenReader]);

  const announceAction = useCallback((action: string, target?: string) => {
    const message = target !== undefined ? `${action} ${target}` : action;
    announceToScreenReader(message, 'assertive');
  }, [announceToScreenReader]);

  const announceStatus = useCallback((status: string) => {
    announceToScreenReader(status, 'polite');
  }, [announceToScreenReader]);

  return {
    announceToScreenReader,
    announceNavigation,
    announceAction,
    announceStatus,
  };
};

const HIGH_CONTRAST_QUERY = '(prefers-contrast: high)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Hook for high contrast mode detection
export const useHighContrast = (): boolean => {
  const subscribe = useCallback((onChange: () => void): (() => void) => {
    const mediaQuery = window.matchMedia(HIGH_CONTRAST_QUERY);
    mediaQuery.addEventListener('change', onChange);
    return () => { mediaQuery.removeEventListener('change', onChange); };
  }, []);
  const getSnapshot = useCallback(
    (): boolean => window.matchMedia(HIGH_CONTRAST_QUERY).matches,
    []
  );
  return useSyncExternalStore(subscribe, getSnapshot);
};

// Hook for reduced motion detection
export const useReducedMotion = (): boolean => {
  const subscribe = useCallback((onChange: () => void): (() => void) => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    mediaQuery.addEventListener('change', onChange);
    return () => { mediaQuery.removeEventListener('change', onChange); };
  }, []);
  const getSnapshot = useCallback(
    (): boolean => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    []
  );
  return useSyncExternalStore(subscribe, getSnapshot);
};

// Hook for focus management
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    // Guard against SSR environments
    if (typeof document === 'undefined') return;

    const activeElement = document.activeElement;
    if (activeElement && activeElement instanceof HTMLElement) {
      previousFocusRef.current = activeElement;
    }
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      try {
        // Check if element is still connected to DOM before focusing
        if (document.contains(previousFocusRef.current)) {
          previousFocusRef.current.focus();
        }
      } catch (error) {
        // Focus can fail if element is no longer focusable or visible
        console.warn('Failed to restore focus:', error);
      }
    }
  }, []);

  const focusElement = useCallback((element: HTMLElement | null) => {
    if (!element || typeof element.focus !== 'function') return;

    try {
      // Check if element is still connected to DOM
      if (document.contains(element)) {
        element.focus();
      }
    } catch (error) {
      console.warn('Failed to focus element:', error);
    }
  }, []);

  return { saveFocus, restoreFocus, focusElement };
};

