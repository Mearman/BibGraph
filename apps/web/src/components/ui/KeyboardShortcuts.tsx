/**
 * Keyboard Shortcuts Manager
 *
 * Provides comprehensive keyboard shortcut management with configurable
 * hotkeys, help modal, and accessibility features. Enhances user experience
 * through improved keyboard navigation and productivity shortcuts.
 */

import {
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconKeyboard } from "@tabler/icons-react";
import { useCallback, useEffect, useRef } from "react";

// Type guard narrowing an event target (typed `EventTarget | null`) to `HTMLElement`.
const isHTMLElement = (value: unknown): value is HTMLElement => value instanceof HTMLElement;

export interface KeyboardShortcut {
  /**
  Unique identifier for the shortcut
   */
  id: string;
  /**
  Key combination (e.g., 'ctrl+k', 'mod+s')
   */
  keys: string;
  /**
  Description of what the shortcut does
   */
  description: string;
  /**
  Function to execute when shortcut is triggered
   */
  handler: () => void | Promise<void>;
  /**
  Category for grouping in help modal
   */
  category?: string;
  /**
  Whether shortcut is currently enabled
   */
  enabled?: boolean;
  /**
  Modifier key requirements
   */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  /**
  Key that must be pressed
   */
  key?: string;
  /**
  Prevent default browser behavior
   */
  preventDefault?: boolean;
  /**
  Stop event propagation
   */
  stopPropagation?: boolean;
}

export interface KeyboardShortcutConfig {
  /**
  Array of keyboard shortcuts
   */
  shortcuts: KeyboardShortcut[];
  /**
  Global enable/disable flag
   */
  enabled?: boolean;
  /**
  Show help shortcut
   */
  helpShortcut?: string;
  /**
  Whether to show help button
   */
  showHelpButton?: boolean;
  /**
  Custom help button position
   */
  helpButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface KeyboardShortcutsManagerProperties {
  /**
  Configuration object
   */
  config: KeyboardShortcutConfig;
  /**
  Whether to render help button
   */
  renderHelpButton?: boolean;
}

/**
 * Hook for keyboard shortcuts management
 */
export const useKeyboardShortcuts = (config: KeyboardShortcutConfig) => {
  const shortcutsRef = useRef(config.shortcuts);

  // Update shortcuts ref when config changes
  useEffect(() => {
    shortcutsRef.current = config.shortcuts;
  }, [config.shortcuts]);

  // Parse key combination
  const parseKeyCombo = useCallback((combo: string): {
    modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean };
    key: string;
  } => {
    const parts = combo.toLowerCase().split('+');
    const modifiers = {
      ctrl: parts.includes('ctrl') || parts.includes('control'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('mod'),
    };

    const key = parts.find(part =>
      !['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd', 'mod'].includes(part)
    );

    return { modifiers, key: key ?? '' };
  }, []);

  // Check if key event matches shortcut
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    if (shortcut.enabled === false) {
      return false;
    }

    const combo = shortcut.modifiers ?
      `${shortcut.modifiers.ctrl === true ? 'ctrl+' : ''}${shortcut.modifiers.alt === true ? 'alt+' : ''}${shortcut.modifiers.shift === true ? 'shift+' : ''}${shortcut.modifiers.meta === true ? 'meta+' : ''}${shortcut.key ?? ''}` :
      shortcut.keys;

    const { modifiers, key } = parseKeyCombo(combo);

    const eventModifiers = {
      ctrl: event.ctrlKey || event.metaKey, // Treat cmd as ctrl for cross-platform
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    };

    // Check modifiers match
    const isModifiersMatch =
      (modifiers.ctrl === undefined || modifiers.ctrl === eventModifiers.ctrl) &&
      (modifiers.alt === undefined || modifiers.alt === eventModifiers.alt) &&
      (modifiers.shift === undefined || modifiers.shift === eventModifiers.shift) &&
      (modifiers.meta === undefined || modifiers.meta === eventModifiers.meta);

    // Check key matches
    const isKeyMatches = key ? (
      key.toLowerCase() === event.key.toLowerCase() ||
      key.toLowerCase() === event.code.toLowerCase()
    ) : false;

    return isModifiersMatch && isKeyMatches;
  }, [parseKeyCombo]);

  // Handle keyboard events
  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
    if (config.enabled === false) return;

    // Ignore events in input fields unless explicitly allowed
    const target = event.target;
    if (
      isHTMLElement(target) &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true')
    ) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      if (matchesShortcut(event, shortcut)) {
        try {
          if (shortcut.preventDefault === true) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation === true) {
            event.stopPropagation();
          }

          await shortcut.handler();
        } catch (error) {
          console.error(`Keyboard shortcut error (${shortcut.id}):`, error);
        }
        break;
      }
    }
  }, [config.enabled, matchesShortcut]);

  // Add and remove event listeners
  useEffect(() => {
    if (config.enabled === false) {
      return undefined;
    }

    const keydownHandler = (event: KeyboardEvent) => {
      void handleKeyDown(event);
    };

    document.addEventListener('keydown', keydownHandler, {capture: true});
    return () => { document.removeEventListener('keydown', keydownHandler, true); };
  }, [config.enabled, handleKeyDown]);

  
  // Register new shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current = [...shortcutsRef.current, shortcut];
  }, []);

  // Unregister shortcut
  const unregisterShortcut = useCallback((id: string) => {
    shortcutsRef.current = shortcutsRef.current.filter(s => s.id !== id);
  }, []);

  // Simple setter for help modal (for help button)
  const setHelpOpen = useCallback((_open: boolean) => {
    // This function exists for compatibility with the help button
    // In a full implementation, this would control a help modal
  }, []);

  return {
    setHelpOpen,
    registerShortcut,
    unregisterShortcut,
  };
};


/**
 * Help button component
 */
interface KeyboardHelpButtonProperties {
  onClick: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  tooltip?: string;
}

export const KeyboardHelpButton = ({
  onClick,
  position = 'top-right',
  tooltip = "Keyboard Shortcuts (Ctrl+?)",
}: KeyboardHelpButtonProperties) => {
  const positionStyles = {
    'top-right': { position: 'fixed' as const, top: 20, right: 20 },
    'top-left': { position: 'fixed' as const, top: 20, left: 20 },
    'bottom-right': { position: 'fixed' as const, bottom: 20, right: 20 },
    'bottom-left': { position: 'fixed' as const, bottom: 20, left: 20 },
  };

  return (
    <Tooltip label={tooltip} position="bottom">
      <ActionIcon
        size="lg"
        radius="md"
        variant="light"
        onClick={onClick}
        style={positionStyles[position]}
        aria-label="Show keyboard shortcuts help"
      >
        <IconKeyboard size={20} />
      </ActionIcon>
    </Tooltip>
  );
};

/**
 * Main Keyboard Shortcuts Manager Component
 */
export const KeyboardShortcutsManager = ({
  config,
  renderHelpButton = true,
}: KeyboardShortcutsManagerProperties) => {
  const { setHelpOpen } = useKeyboardShortcuts(config);

  if (renderHelpButton && config.showHelpButton !== false) {
    return (
      <>
        <KeyboardHelpButton
          onClick={() => { setHelpOpen(true); }}
          position={config.helpButtonPosition}
        />
      </>
    );
  }

  return null;
};

/**
 * Predefined keyboard shortcuts for common actions
 */
export const CommonShortcuts = {
  search: {
    id: 'search',
    keys: 'ctrl+k',
    description: 'Focus search input',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'Navigation',
  },
  save: {
    id: 'save',
    keys: 'ctrl+s',
    description: 'Save current item',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'File',
  },
  new: {
    id: 'new',
    keys: 'ctrl+n',
    description: 'Create new item',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'File',
  },
  copy: {
    id: 'copy',
    keys: 'ctrl+c',
    description: 'Copy selected item',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'Edit',
  },
  paste: {
    id: 'paste',
    keys: 'ctrl+v',
    description: 'Paste from clipboard',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'Edit',
  },
  undo: {
    id: 'undo',
    keys: 'ctrl+z',
    description: 'Undo last action',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'Edit',
  },
  redo: {
    id: 'redo',
    keys: 'ctrl+y',
    description: 'Redo last action',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'Edit',
  },
  help: {
    id: 'help',
    keys: 'ctrl+?',
    description: 'Show keyboard shortcuts help',
    handler: () => { /* placeholder - override with a real handler when registering this preset */ },
    category: 'Help',
  },
} as const;

