/**
 * Focus Manager Component - Advanced focus management and keyboard navigation
 *
 * Provides focus trapping, skip links, focus indicators, and enhanced
 * keyboard navigation support for accessibility compliance.
 */

import {
  Box,
  Text
} from "@mantine/core";
import { useCallback,useEffect, useRef, useState } from "react";

// Type guard narrowing an event target / `document.activeElement` (typed `EventTarget` / `Element` unions) to `HTMLElement`.
const isHTMLElement = (value: unknown): value is HTMLElement => value instanceof HTMLElement;

const ANNOUNCEMENT_CLEANUP_DELAY_MS = 1000;

// Inject focus manager CSS styles
const injectFocusManagerStyles = () => {
  if (!document.querySelector('#focus-manager-styles')) {
    const style = document.createElement('style');
    style.id = 'focus-manager-styles';
    style.textContent = `
      @keyframes focusRingAnimation {
        0% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
          transform: scale(0.95);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2);
          transform: scale(1.02);
        }
        100% {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
          transform: scale(1);
        }
      }

      .focus-indicator {
        position: relative;
      }

      .focus-indicator:focus-visible {
        outline: none;
      }

      .focus-indicator.animated:focus-visible {
        animation: focusRingAnimation 0.3s ease-out;
      }

      .focus-indicator:focus-visible::after {
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: var(--mantine-radius-sm, 4px);
        border: 2px solid var(--mantine-color-blue-6, #228be6);
        pointer-events: none;
        z-index: 1;
      }

      .focus-indicator:not(:focus-visible)::after {
        content: none;
      }

      .focus-trap {
        outline: none;
      }

      .focus-trap:focus-within {
        outline: 2px solid var(--mantine-color-blue-6, #228be6);
        outline-offset: 2px;
        border-radius: var(--mantine-radius-sm, 4px);
      }

      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--mantine-color-blue-6, #228be6);
        color: var(--mantine-color-white, #ffffff);
        padding: 8px 16px;
        text-decoration: none;
        border-radius: var(--mantine-radius-sm, 4px);
        z-index: 10000;
        font-weight: 500;
        transition: top 0.2s ease-out, background-color 0.2s ease-out;
      }

      .skip-link:focus {
        top: 6px;
        transform: translateY(0);
      }

      .skip-link:hover {
        background: var(--mantine-color-blue-7, #1c7ed6);
        transform: translateY(0);
        top: 6px;
      }

      .skip-link.top-right {
        left: auto;
        right: 6px;
      }

      .skip-link.top-center {
        left: 50%;
        transform: translateX(-50%);
      }

      .skip-link.top-center:focus {
        transform: translateX(-50%) translateY(0);
      }
    `;
    document.head.append(style);
  }
};

// Focus trap props
interface FocusTrapProperties {
  children: React.ReactNode;
  enabled?: boolean;
  onEscape?: () => void;
}

/**
 * Focus Trap Component
 *
 * Traps focus within a container for modals, dialogs, and other focused UI patterns
 */
export const FocusTrap = ({ children, enabled = true, onEscape }: FocusTrapProperties) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Inject styles on component mount
  useEffect(() => {
    injectFocusManagerStyles();
  }, []);

  useEffect(() => {
    if (!enabled || !containerRef.current) return undefined;

    const container = containerRef.current;
    const activeElement = document.activeElement;
    previousFocusRef.current = isHTMLElement(activeElement) ? activeElement : null;

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');

      return [...container.querySelectorAll<HTMLElement>(selector)];
    };

    // Focus the first focusable element
    const initialFocusableElements = getFocusableElements();
    if (initialFocusableElements.length > 0) {
      initialFocusableElements[0].focus();
    }

    // Handle keyboard navigation within the trap
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

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
      } else if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    container.addEventListener('keydown', handleKeydown);

    return () => {
      container.removeEventListener('keydown', handleKeydown);
      // Restore previous focus
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, onEscape]);

  return (
    <div
      ref={containerRef}
      className="focus-trap"
    >
      {children}
    </div>
  );
};

// Skip link props
interface SkipLinkProperties {
  target: string;
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'top-center';
}

/**
 * Skip Link Component
 *
 * Provides skip navigation links for keyboard users
 */
export const SkipLink = ({ target, children, position = 'top-left' }: SkipLinkProperties) => {
  // Inject styles on component mount
  useEffect(() => {
    injectFocusManagerStyles();
  }, []);

  const getPositionClass = () => {
    switch (position) {
      case 'top-left':
        return '';
      case 'top-right':
        return 'top-right';
      case 'top-center':
        return 'top-center';
      default:
        return position satisfies never;
    }
  };

  return (
    <Box
      component="a"
      href={target}
      className={`skip-link ${getPositionClass()}`}
    >
      {children}
    </Box>
  );
};

// Focus indicator props
interface FocusIndicatorProperties {
  children: React.ReactNode;
  animated?: boolean;
  _color?: string;
  _size?: 'sm' | 'md' | 'lg';
}

/**
 * Focus Indicator Component
 *
 * Enhances focus visibility for better keyboard navigation
 */
export const FocusIndicator = ({ children, animated = true, _color, _size = 'md' }: FocusIndicatorProperties) => {
  // Inject styles on component mount
  useEffect(() => {
    injectFocusManagerStyles();
  }, []);

  const getClassName = () => {
    let className = 'focus-indicator';
    if (animated) {
      className += ' animated';
    }
    return className;
  };

  return (
    <Box
      className={getClassName()}
    >
      {children}
    </Box>
  );
};

// Keyboard navigation hint props
interface KeyboardNavigationHintProperties {
  shortcuts: {
    key: string;
    description: string;
    action?: () => void;
  }[];
  show?: boolean;
}

/**
 * Keyboard Navigation Hint Component
 *
 * Displays available keyboard shortcuts and navigation hints
 */
export const KeyboardNavigationHint = ({ shortcuts, show = false }: KeyboardNavigationHintProperties) => {
  if (!show) return null;

  return (
    <Box
      p="sm"
      mb="md"
      style={{
        background: 'var(--mantine-color-gray-0, #f8f9fa)',
        border: '1px solid var(--mantine-color-gray-2, #dee2e6)',
        borderRadius: 'var(--mantine-radius-sm, 4px)',
        fontSize: 'var(--mantine-font-size-sm, 14px)',
      }}
    >
      <Box mb="xs" fw={500}>Keyboard Navigation:</Box>
      <Box>
        {shortcuts.map((shortcut, index) => (
          <Box
            key={index}
            mb={index < shortcuts.length - 1 ? 'xs' : 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--mantine-spacing-sm, 8px)',
            }}
          >
            <Box
              component="kbd"
              px="xs"
              py={2}
              style={{
                background: 'var(--mantine-color-gray-1, #f1f3f5)',
                border: '1px solid var(--mantine-color-gray-3, #ced4da)',
                borderRadius: 'var(--mantine-radius-xs, 2px)',
                fontSize: 'var(--mantine-font-size-xs, 12px)',
                fontFamily: 'monospace',
                minWidth: '20px',
                textAlign: 'center',
              }}
            >
              {shortcut.key}
            </Box>
            <Text size="sm">{shortcut.description}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Focus management hook
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

  const focusElement = useCallback((element: HTMLElement | null) => {
    if (!element) {
    	return;
    }

    element.focus();
    setFocusedElement(element);
  }, []);

  const focusNext = useCallback(() => {
    const focusableElements = [...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];

    const activeElement = document.activeElement;
    const currentIndex = isHTMLElement(activeElement) ? focusableElements.indexOf(activeElement) : -1;
    const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
    focusElement(focusableElements[nextIndex]);
  }, [focusElement]);

  const focusPrevious = useCallback(() => {
    const focusableElements = [...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];

    const activeElement = document.activeElement;
    const currentIndex = isHTMLElement(activeElement) ? focusableElements.indexOf(activeElement) : -1;
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    focusElement(focusableElements[previousIndex]);
  }, [focusElement]);

  const focusFirst = useCallback(() => {
    const firstFocusable = document.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusElement(firstFocusable);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    const focusableElements = [...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];
    focusElement(focusableElements[focusableElements.length - 1]);
  }, [focusElement]);

  // Track focused element
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (isHTMLElement(e.target)) {
        setFocusedElement(e.target);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => { document.removeEventListener('focusin', handleFocusIn); };
  }, []);

  return {
    focusedElement,
    focusElement,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast
  };
};

// Live region for screen reader announcements
interface LiveRegionProperties {
  politeness?: 'polite' | 'assertive' | 'off';
  children?: React.ReactNode;
}

export const LiveRegion = ({ politeness = 'polite', children }: LiveRegionProperties) => {
  const liveRegionStyles = {
    position: 'absolute' as const,
    left: '-10000px',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  };

  return (
    <Box
      aria-live={politeness}
      aria-atomic="true"
      component="div"
      style={liveRegionStyles}
    >
      {children}
    </Box>
  );
};

// Custom hook for announcing to screen readers
export const useScreenReaderAnnouncer = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    announcement.textContent = message;
    document.body.append(announcement);

    // Remove after announcement to prevent screen reader build-up
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        announcement.remove();
      }
    }, ANNOUNCEMENT_CLEANUP_DELAY_MS);
  }, []);

  return { announce };
};

// Focus boundary component for creating keyboard navigation zones
interface FocusBoundaryProperties {
  children: React.ReactNode;
  onEnter?: () => void;
  onExit?: () => void;
  boundaryClass?: string;
}

export const FocusBoundary = ({ children, onEnter, onExit, boundaryClass = 'focus-boundary' }: FocusBoundaryProperties) => {
  const [isActive, setIsActive] = useState(false);
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (!isHTMLElement(e.target)) return;
      const target = e.target;
      const boundary = boundaryRef.current;

      if (boundary?.contains(target) === true) {
        if (!isActive) {
          setIsActive(true);
          onEnter?.();
        }
      } else if (isActive && boundary?.contains(target) !== true) {
        setIsActive(false);
        onExit?.();
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => { document.removeEventListener('focusin', handleFocusIn); };
  }, [isActive, onEnter, onExit]);

  return (
    <div
      ref={boundaryRef}
      className={`${boundaryClass} ${isActive ? 'active' : ''}`}
      data-focus-boundary-active={isActive}
    >
      {children}
    </div>
  );
};