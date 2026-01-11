/**
 * Accessibility utilities for enhanced screen reader and keyboard navigation support
 */

// Announce messages to screen readers
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
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

  // Remove after announcement
  setTimeout(() => {
    announcement.remove();
  }, 1000);
};

// Focus trap utility for modals
export const createFocusTrap = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

// Skip links generator
export const createSkipLinks = () => {
  const skipLinks = [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' },
    { href: '#search', text: 'Skip to search' },
  ];

  const skipLinksContainer = document.createElement('div');
  skipLinksContainer.setAttribute('role', 'navigation');
  skipLinksContainer.setAttribute('aria-label', 'Skip navigation links');
  skipLinksContainer.className = 'skip-links';

  skipLinks.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.className = 'skip-link';
    anchor.textContent = link.text;
    skipLinksContainer.append(anchor);
  });

  return skipLinksContainer;
};

// Generate unique IDs for accessibility attributes
export const generateId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
};

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Check if user prefers high contrast
export const prefersHighContrast = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

// Get user's preferred color scheme
export const getPreferredColorScheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// ARIA label generators
export const createEmptySearchAriaLabel = (placeholder: string): string => {
  return placeholder;
};

export const createValueSearchAriaLabel = (placeholder: string): string => {
  return `Search field with current value: ${placeholder}`;
};

export const createButtonAriaLabel = (action: string, description?: string) => {
  return description ? `${action}: ${description}` : action;
};

export const createResultAriaLabel = (title: string, type: string, index: number, total: number) => {
  return `${title}, ${type}, ${index} of ${total} results`;
};

// Enhanced focus management
export const manageFocus = (element: HTMLElement, options: {
  preventScroll?: boolean;
  focusVisible?: boolean;
} = {}) => {
  const { preventScroll = false, focusVisible = true } = options;

  // Add focus-visible class if needed
  if (focusVisible) {
    element.classList.add('focus-visible');
  }

  element.focus({
    preventScroll,
  });

  // Remove focus-visible class on blur
  const handleBlur = () => {
    element.classList.remove('focus-visible');
    element.removeEventListener('blur', handleBlur);
  };

  element.addEventListener('blur', handleBlur);
};

// Keyboard navigation utilities
export const handleKeyboardNavigation = (
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  orientation: 'horizontal' | 'vertical' = 'vertical'
): number => {
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      if (orientation === 'vertical' || event.key === 'ArrowRight') {
        event.preventDefault();
        newIndex = (currentIndex + 1) % items.length;
      }
      break;

    case 'ArrowUp':
    case 'ArrowLeft':
      if (orientation === 'vertical' || event.key === 'ArrowLeft') {
        event.preventDefault();
        newIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      }
      break;

    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;

    case 'End':
      event.preventDefault();
      newIndex = items.length - 1;
      break;

    case 'Enter':
    case ' ':
      event.preventDefault();
      items[currentIndex]?.click();
      break;

    default:
      break;
  }

  if (newIndex !== currentIndex && items[newIndex]) {
    manageFocus(items[newIndex]);
  }

  return newIndex;
};

// Semantic HTML enhancements
export const enhanceSemantics = (element: HTMLElement, semantics: {
  role?: string;
  label?: string;
  description?: string;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  busy?: boolean;
}) => {
  Object.entries(semantics).forEach(([key, value]) => {
    if (value !== undefined) {
      const ariaKey = key === 'role' ? 'role' : `aria-${key}`;
      element.setAttribute(ariaKey, value.toString());
    }
  });
};

// Progress announcement for screen readers
export const announceProgress = (current: number, total: number, description: string) => {
  const percentage = Math.round((current / total) * 100);
  announceToScreenReader(`${description}: ${current} of ${total} (${percentage}%)`, 'polite');
};

// Error announcement for screen readers
export const announceError = (error: string, context?: string) => {
  const message = context ? `Error in ${context}: ${error}` : `Error: ${error}`;
  announceToScreenReader(message, 'assertive');
};

// Success announcement for screen readers
export const announceSuccess = (message: string, context?: string) => {
  const fullMessage = context ? `${context}: ${message}` : message;
  announceToScreenReader(fullMessage, 'polite');
};

// Validation utilities
export const validateAccessibility = (element: HTMLElement) => {
  const issues: string[] = [];

  // Check for missing alt text on images
  const images = element.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push(`Image ${index + 1} missing alt text or aria-label`);
    }
  });

  // Check for missing labels on form inputs
  const inputs = element.querySelectorAll('input, textarea, select');
  inputs.forEach((input, index) => {
    // Use multiple methods instead of dynamic selector
    let hasLabel = false;
    if (input.id) {
      const labels = element.querySelectorAll('label');
      hasLabel = [...labels].some(label => label.getAttribute('for') === input.id);
    }
    const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');

    if (!hasLabel && !hasAriaLabel) {
      issues.push(`Form input ${index + 1} missing label or aria-label`);
    }
  });

  // Check for proper heading hierarchy
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach((heading, index) => {
    const level = Number.parseInt(heading.tagName.slice(1));
    if (level > lastLevel + 1) {
      issues.push(`Heading ${index + 1} skips heading levels (from h${lastLevel} to h${level})`);
    }
    lastLevel = level;
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
};

// Utility to add CSS for skip links and focus styles
export const injectAccessibilityStyles = () => {
  const styleId = 'accessibility-styles';

  if (document.querySelector(`#${styleId}`)) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .skip-links {
      position: absolute;
      top: -40px;
      left: 6px;
      z-index: 10000;
    }

    .skip-link {
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--mantine-color-blue-6);
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      transition: top 0.3s;
    }

    .skip-link:focus {
      top: 6px;
    }

    .focus-visible {
      outline: 2px solid var(--mantine-color-blue-6);
      outline-offset: 2px;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .focus-visible {
        outline-width: 3px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;

  document.head.append(style);
};