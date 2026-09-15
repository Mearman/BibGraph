import { useCallback,useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

interface HotkeyConfig {
  key: string;
  description: string;
  action: () => void | Promise<void>;
  enabled?: boolean;
  preventDefault?: boolean;
  category?: 'navigation' | 'search' | 'content' | 'accessibility' | 'global';
}

interface UseHotkeysOptions {
  enabled?: boolean;
  scope?: string;
}

export const useGlobalHotkeys = (options: Readonly<UseHotkeysOptions> = {}) => {
  const { enabled = true } = options;

  // Define all hotkey configurations
  const hotkeys: HotkeyConfig[] = [
    // Global shortcuts
    {
      key: 'ctrl+k',
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector('input[aria-label*="search" i]');
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          searchInput.select();
        }
      },
      category: 'global',
      preventDefault: true,
    },
    {
      key: 'ctrl+/',
      description: 'Show keyboard shortcuts help',
      action: () => {
        // This will be implemented when we create the help modal
        console.log('Keyboard shortcuts help - to be implemented');
      },
      category: 'global',
      preventDefault: true,
    },
    {
      key: 'escape',
      description: 'Close modals / clear search',
      action: () => {
        // Close any open modals
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
          const closeButton = modal.querySelector('button[aria-label*="close" i]');
          if (closeButton && closeButton instanceof HTMLElement) {
            closeButton.click();
          }
        });

        // Clear search if focused
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT' && activeElement.getAttribute('aria-label')?.includes('search') === true) {
          const clearButton = document.querySelector('[aria-label*="clear" i]');
          if (clearButton instanceof HTMLElement) {
            clearButton.click();
          }
        }
      },
      category: 'global',
      preventDefault: false,
    },

    // Navigation shortcuts
    {
      key: 'g+h',
      description: 'Go to home',
      action: () => {
        window.location.assign('/');
      },
      category: 'navigation',
      preventDefault: true,
    },
    {
      key: 'g+s',
      description: 'Go to search',
      action: () => {
        window.location.assign('/search');
      },
      category: 'navigation',
      preventDefault: true,
    },
    {
      key: 'g+b',
      description: 'Go to bookmarks',
      action: () => {
        window.location.assign('/bookmarks');
      },
      category: 'navigation',
      preventDefault: true,
    },

    // Search shortcuts
    {
      key: 'ctrl+f',
      description: 'Toggle filters',
      action: () => {
        const filterButton = document.querySelector('[aria-label*="filter" i]');
        if (filterButton instanceof HTMLElement) {
          filterButton.click();
        }
      },
      category: 'search',
      preventDefault: true,
    },
    {
      key: 'ctrl+enter',
      description: 'Execute search',
      action: () => {
        const searchButton = document.querySelector('[aria-label*="search" i][type="submit"]');
        if (searchButton instanceof HTMLElement) {
          searchButton.click();
        }
      },
      category: 'search',
      preventDefault: true,
    },

    // Content shortcuts
    {
      key: 'j',
      description: 'Next result',
      action: () => {
        const results = document.querySelectorAll('[role="listitem"]');
        const activeParent = document.activeElement?.parentElement;
        const currentIndex = activeParent ? [...results].indexOf(activeParent) : -1;
        const nextIndex = (currentIndex + 1) % results.length;
        const nextElement = results[nextIndex];
        if (nextElement instanceof HTMLElement) {
          nextElement.focus();
        }
      },
      category: 'content',
      preventDefault: true,
    },
    {
      key: 'k',
      description: 'Previous result',
      action: () => {
        const results = document.querySelectorAll('[role="listitem"]');
        const activeParent = document.activeElement?.parentElement;
        const currentIndex = activeParent ? [...results].indexOf(activeParent) : -1;
        const previousIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
        const previousElement = results[previousIndex];
        if (previousElement instanceof HTMLElement) {
          previousElement.focus();
        }
      },
      category: 'content',
      preventDefault: true,
    },

    // Accessibility shortcuts
    {
      key: 'alt+a',
      description: 'Skip to main content',
      action: () => {
        const mainContent = document.querySelector('main') ?? document.querySelector('[role="main"]');
        mainContent?.scrollIntoView({ behavior: 'smooth' });
        if (mainContent instanceof HTMLElement) {
          mainContent.focus();
        }
      },
      category: 'accessibility',
      preventDefault: true,
    },
    {
      key: 'alt+t',
      description: 'Jump to top',
      action: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      category: 'accessibility',
      preventDefault: true,
    },
    {
      key: 'alt+b',
      description: 'Jump to bottom',
      action: () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      },
      category: 'accessibility',
      preventDefault: true,
    },
  ];

  // Helper function to check key combination matches
  const checkKeyMatch = useCallback((event: KeyboardEvent, hotkeyKey: string): boolean => {
    const keys: string[] = hotkeyKey.toLowerCase().split('+');
    const pressedKeys: string[] = [];

    if (event.ctrlKey) pressedKeys.push('ctrl');
    if (event.metaKey) pressedKeys.push('meta'); // For Mac compatibility
    if (event.altKey) pressedKeys.push('alt');
    if (event.shiftKey) pressedKeys.push('shift');
    if (event.key && !['ctrl', 'meta', 'alt', 'shift'].includes(event.key.toLowerCase())) {
      pressedKeys.push(event.key.toLowerCase());
    }

    const normalizedKeys: string[] = keys.flatMap(key => {
      if (key === 'ctrl') return ['ctrl', 'meta'];
      return [key];
    });

    return normalizedKeys.every(key => pressedKeys.includes(key)) &&
      pressedKeys.length === normalizedKeys.length;
  }, []);

  // Helper function to handle hotkey events
  const createHotkeyHandler = useCallback((hotkey: Readonly<HotkeyConfig>) => {
    return (event: KeyboardEvent) => {
      // Check if the key combination matches
      const isMatch = checkKeyMatch(event, hotkey.key);

      if (isMatch) {
        if (hotkey.preventDefault === true) {
          event.preventDefault();
        }
        event.stopPropagation();

        // Execute the action
        void hotkey.action();
      }
    };
  }, [checkKeyMatch]);

  // Helper function to register a single hotkey
  const registerHotkey = useCallback((hotkey: Readonly<HotkeyConfig>) => {
    if (hotkey.enabled === false) return undefined;

    const handler = createHotkeyHandler(hotkey);
    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [createHotkeyHandler]);

  // Register all hotkeys
  useEffect(() => {
    if (!enabled) return undefined;

    const cleanupFunctions = hotkeys.map(hotkey => registerHotkey(hotkey));

    return () => {
      for (const cleanup of cleanupFunctions) cleanup?.();
    };
  }, [enabled, hotkeys, registerHotkey]);

  // Get hotkeys by category
  const getHotkeysByCategory = useCallback((category: HotkeyConfig['category']) => {
    return hotkeys.filter(hotkey => hotkey.category === category);
  }, [hotkeys]);

  // Get all hotkeys
  const getAllHotkeys = useCallback(() => hotkeys, [hotkeys]);

  return {
    hotkeys,
    getHotkeysByCategory,
    getAllHotkeys,
  };
};

// Individual hotkey hooks for common patterns
export const useSearchHotkeys = (onSearch?: () => void, onClear?: () => void) => {
  useHotkeys('ctrl+k', (e) => {
    e.preventDefault();
    const searchInput = document.querySelector('input[aria-label*="search" i]');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
    }
  }, { enableOnFormTags: true });

  useHotkeys('ctrl+enter', (e) => {
    e.preventDefault();
    onSearch?.();
  }, { enableOnFormTags: true });

  useHotkeys('escape', (e) => {
    e.preventDefault();
    onClear?.();
  }, { enableOnFormTags: true });
};

export const useNavigationHotkeys = () => {
  useHotkeys('j', (e) => {
    e.preventDefault();
    const results = document.querySelectorAll('[role="listitem"]');
    const activeParent = document.activeElement?.parentElement;
    const currentIndex = activeParent ? [...results].indexOf(activeParent) : -1;
    const nextIndex = (currentIndex + 1) % results.length;
    const nextElement = results[nextIndex];
    if (nextElement instanceof HTMLElement) {
      nextElement.focus();
    }
  });

  useHotkeys('k', (e) => {
    e.preventDefault();
    const results = document.querySelectorAll('[role="listitem"]');
    const activeParent = document.activeElement?.parentElement;
    const currentIndex = activeParent ? [...results].indexOf(activeParent) : -1;
    const previousIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
    const previousElement = results[previousIndex];
    if (previousElement instanceof HTMLElement) {
      previousElement.focus();
    }
  });
};