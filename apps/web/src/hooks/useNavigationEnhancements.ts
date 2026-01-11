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

export const useNavigationEnhancements = () => {
  const location = useLocation();
  const router = useRouter();
  const historyRef = useRef<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Track navigation history
  const currentPath = location.pathname + serializeSearch(location.search) + location.hash;

  useEffect(() => {
    const lastPath = historyRef.current[historyRef.current.length - 1];
    if (lastPath !== currentPath) {
      historyRef.current.push(currentPath);

      // Limit history size
      if (historyRef.current.length > 50) {
        historyRef.current = historyRef.current.slice(-50);
      }
    }
  }, [currentPath]);

  const navigationState: NavigationState = {
    canGoBack: historyRef.current.length > 1,
    canGoForward: false, // Forward navigation would need more complex implementation
    currentPath,
    searchHistory,
  };

  // Enhanced navigation functions
  const goBack = useCallback(() => {
    if (navigationState.canGoBack) {
      const previousPath = historyRef.current[historyRef.current.length - 2];
      if (previousPath) {
        router.navigate({ to: previousPath });
      }
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

    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(item => item !== query)];
      return newHistory.slice(0, 20); // Keep last 20 searches
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  // Quick navigation shortcuts
  const navigateToSearch = useCallback((entityType?: string) => {
    const path = entityType ? `/${entityType}` : '/';
    router.navigate({ to: path });
  }, [router]);

  const navigateToHome = useCallback(() => {
    router.navigate({ to: '/' });
  }, [router]);

  // Keyboard navigation handling
  const useKeyboardNavigation = useCallback(() => {
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Only handle navigation keys when not focused on input fields
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement ||
          (event.target as HTMLElement)?.contentEditable === 'true'
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
              if (searchInput) {
                (searchInput as HTMLInputElement).focus();
              }
              break;
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [navigateWithKeyboard]);
  }, [navigateWithKeyboard]);

  // Get navigation context information
  const getNavigationContext = useCallback(() => {
    const parts = location.pathname.replace(/^\//, "").split("/");
    const entityType = parts[0];
    const isEntityPage = parts.length > 1 && parts[1];
    const hasSearch = !!location.search;

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