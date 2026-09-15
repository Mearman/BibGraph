/**
 * Enhanced Navigation Hook
 * Provides navigation utilities and keyboard shortcuts for improved UX
 */

import { useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { serializeSearch } from "@/utils/url-decoding";

interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  currentPath: string;
  searchHistory: string[];
}

const MAX_NAVIGATION_HISTORY_SIZE = 50;
const MAX_SEARCH_HISTORY_ENTRIES = 20;

export const useNavigationEnhancements = () => {
  const location = useLocation();
  const router = useRouter();
  const historyReference = useRef<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Track navigation history
  const currentPath = location.pathname + serializeSearch(location.search) + location.hash;

  useEffect(() => {
    const lastPath = historyReference.current[historyReference.current.length - 1];
    if (lastPath !== currentPath) {
      historyReference.current.push(currentPath);

      // Limit history size
      if (historyReference.current.length > MAX_NAVIGATION_HISTORY_SIZE) {
        historyReference.current = historyReference.current.slice(-MAX_NAVIGATION_HISTORY_SIZE);
      }
    }
  }, [currentPath]);

  const navigationState: NavigationState = {
    canGoBack: historyReference.current.length > 1,
    canGoForward: false, // Forward navigation would need more complex implementation
    currentPath,
    searchHistory,
  };

  // Enhanced navigation functions
  const goBack = useCallback(() => {
    if (!navigationState.canGoBack) {
    	return;
    }

    const previousPath = historyReference.current[historyReference.current.length - 2];
    if (previousPath) {
      void router.navigate({ to: previousPath });
    }
  }, [navigationState.canGoBack, router]);

  const goForward = useCallback(() => {
    // This would require implementing forward history tracking
    console.log("Forward navigation not implemented yet");
  }, []);

  const navigateWithKeyboard = useCallback((direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) => {
    // Prevent default browser behavior for these keys
    event.preventDefault();

    switch (direction) {
      case 'up':
      case 'left':
        goBack();
        break;
      case 'down':
      case 'right':
        goForward();
        break;
    }
  }, [goBack, goForward]);

  // Search history management
  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    setSearchHistory(previous => {
      const newHistory = [query, ...previous.filter(item => item !== query)];
      return newHistory.slice(0, MAX_SEARCH_HISTORY_ENTRIES);
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  // Quick navigation shortcuts
  const navigateToSearch = useCallback((entityType?: string) => {
    const path = entityType !== undefined && entityType !== '' ? `/${entityType}` : '/';
    void router.navigate({ to: path });
  }, [router]);

  const navigateToHome = useCallback(() => {
    void router.navigate({ to: '/', params: {} });
  }, [router]);

  // Keyboard navigation is now handled directly in the hook
  // Components using this hook automatically get keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle navigation keys when not focused on input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.contentEditable === 'true')
      ) {
        return;
      }

      // Alt + Arrow keys for navigation
      if (event.altKey) {
        switch (event.key) {
          case 'ArrowLeft':
            navigateWithKeyboard('left', event);
            break;
          case 'ArrowRight':
            navigateWithKeyboard('right', event);
            break;
          case 'ArrowUp':
            navigateWithKeyboard('up', event);
            break;
          case 'ArrowDown':
            navigateWithKeyboard('down', event);
            break;
        }
      }

      // Ctrl/Cmd + [ and ] for history navigation
      if ((event.ctrlKey || event.metaKey)) {
        switch (event.key) {
          case '[':
            navigateWithKeyboard('left', event);
            break;
          case ']':
            navigateWithKeyboard('right', event);
            break;
          case 'k':
          case 'K': {
            // Focus search input
            event.preventDefault();
            const searchInput = document.querySelector('input[aria-label="Global search input"]');
            if (searchInput instanceof HTMLInputElement) {
              searchInput.focus();
            }
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateWithKeyboard]);

  // Legacy function for backwards compatibility - now a no-op
  const useKeyboardNavigation = useCallback(() => {
    // Keyboard navigation is now automatically enabled when using this hook
  }, []);

  // Get navigation context information
  const getNavigationContext = useCallback(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    const entityType = parts[0];
    const isEntityPage = parts.length > 1 && parts[1];
    const hasSearch = Object.keys(location.search).length > 0;

    return {
      entityType,
      isEntityPage,
      hasSearch,
      parts: parts.filter(Boolean),
    };
  }, [location.pathname, location.search]);

  return {
    navigationState,
    goBack,
    goForward,
    navigateToSearch,
    navigateToHome,
    addToSearchHistory,
    clearSearchHistory,
    searchHistory,
    getNavigationContext,
    useKeyboardNavigation,
  };
};