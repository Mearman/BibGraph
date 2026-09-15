/**
 * Accessibility Provider - Comprehensive accessibility support with screen reader integration
 *
 * Provides screen reader announcements, focus management, keyboard navigation,
 * and various accessibility features for enhanced user experience.
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Portal,
  Stack,
  Text
} from "@mantine/core";
import {
  IconAccessible,
  IconAdjustments,
  IconVolume,
  IconVolumeOff,
  IconZoomIn,
  IconZoomOut
} from "@tabler/icons-react";
import type { ReactNode} from "react";
import { createContext, use, useCallback, useEffect, useMemo , useRef, useState } from "react";

// Speech Recognition API type definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  onaudiostart: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  onend: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  onerror: ((this: SpeechRecognition, event_: SpeechRecognitionErrorEvent) => unknown) | null;
  onnomatch: ((this: SpeechRecognition, event_: SpeechRecognitionEvent) => unknown) | null;
  onresult: ((this: SpeechRecognition, event_: SpeechRecognitionEvent) => unknown) | null;
  onsoundend: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  onsoundstart: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  onspeechend: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  onspeechstart: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  onstart: ((this: SpeechRecognition, event_: Event) => unknown) | null;
  serviceURI: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Speech Grammar List interface
interface SpeechGrammarList {
  addFromString: (string: string, weight?: number) => void;
  addFromURI: (source: string, weight?: number) => void;
  length: number;
  item: (index: number) => SpeechGrammar | null;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'service-not-allowed' | 'not-allowed';
  message?: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item: (index: number) => SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  }
}

// Type guard narrowing `document.activeElement` (typed `Element | null`) to `HTMLElement`.
const isHTMLElement = (value: unknown): value is HTMLElement => value instanceof HTMLElement;

const DEFAULT_FONT_SIZE_PX = 16;
const MIN_FONT_SIZE_PX = 12;
const MAX_FONT_SIZE_PX = 24;
const FONT_SIZE_STEP_PX = 2;
const ANNOUNCEMENT_CLEANUP_DELAY_MS = 1000;
const VOICE_RECOGNITION_RESTART_DELAY_MS = 100;

// Detects whether a screen reader appears to be active, via available speech-synthesis voices or a known screen-reader user-agent substring.
const detectScreenReaderStatus = (): boolean =>
  window.speechSynthesis.getVoices().length > 0 ||
  navigator.userAgent.includes('NVDA') ||
  navigator.userAgent.includes('JAWS') ||
  navigator.userAgent.includes('VoiceOver');

// Accessibility context interface
interface AccessibilityContextType {
  // Screen reader
  announce: (message: string, priority?: "polite" | "assertive") => void;
  isScreenReaderActive: boolean;

  // Focus management
  focusNext: () => void;
  focusPrevious: () => void;
  trapFocus: (element: HTMLElement) => void;
  releaseFocus: () => void;

  // Visual accommodations
  highContrastMode: boolean;
  toggleHighContrast: () => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;

  // Keyboard navigation
  keyboardShortcuts: Map<string, () => void>;
  registerShortcut: (key: string, action: () => void) => void;
  unregisterShortcut: (key: string) => void;

  // Voice commands
  voiceEnabled: boolean;
  toggleVoice: () => void;
  startVoiceRecognition: () => void;
  stopVoiceRecognition: () => void;
}

// Create accessibility context
const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

// Provider props
interface AccessibilityProviderProperties {
  children: ReactNode;
}

// Focus trap utilities
class FocusTrap {
  private element: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private readonly keydownHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.keydownHandler = this.handleKeydown.bind(this);
  }

  trap(element: HTMLElement) {
    this.release(); // Release any existing trap

    this.element = element;
    this.previousFocus = isHTMLElement(document.activeElement) ? document.activeElement : null;

    // Focus first focusable element
    const firstFocusable = this.getFirstFocusableElement(element);
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Add event listener
    element.addEventListener('keydown', this.keydownHandler);
  }

  release() {
    if (this.element) {
      this.element.removeEventListener('keydown', this.keydownHandler);
      this.element = null;
    }

    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') {
    	return;
    }

    if (!this.element) return;
    const focusableElements = this.getFocusableElements(this.element);
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
  }

  private getFocusableElements(element: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([type="hidden"]):not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return [...element.querySelectorAll<HTMLElement>(selector)];
  }

  private getFirstFocusableElement(element: HTMLElement): HTMLElement | null {
    const focusable = this.getFocusableElements(element);
    return focusable.length > 0 ? focusable[0] : null;
  }
}

// Type guard for SpeechRecognition constructor
const isSpeechRecognitionConstructor = (value: unknown): value is new () => SpeechRecognition => typeof value === 'function' && 'prototype' in value;

// Voice command utilities
class VoiceCommandProcessor {
  private readonly recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onCommand?: (command: string) => void;

  constructor() {
    if (typeof window !== 'undefined' && typeof window.webkitSpeechRecognition !== 'undefined' && isSpeechRecognitionConstructor(window.webkitSpeechRecognition)) {
      this.recognition = new window.webkitSpeechRecognition();
      this.setupRecognition();
    } else if (typeof window !== 'undefined' && typeof window.SpeechRecognition !== 'undefined' && isSpeechRecognitionConstructor(window.SpeechRecognition)) {
      this.recognition = new window.SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();

      if (event.results[last].isFinal && this.onCommand) {
        this.onCommand(command);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart if we were intentionally listening
      if (this.recognition && this.onCommand) {
        const onCommand = this.onCommand;
        setTimeout(() => { this.start(onCommand); }, VOICE_RECOGNITION_RESTART_DELAY_MS);
      }
    };
  }

  start(onCommand: (command: string) => void) {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    this.onCommand = onCommand;
    this.recognition.start();
    this.isListening = true;
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.onCommand = undefined;
  }

  get isSupported(): boolean {
    return this.recognition !== null;
  }

  get listening(): boolean {
    return this.isListening;
  }
}

/**
 * Accessibility Provider Component
 *
 * Provides comprehensive accessibility features including screen reader support,
 * focus management, voice commands, and visual accommodations.
 */
export const AccessibilityProvider = ({ children }: AccessibilityProviderProperties) => {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(detectScreenReaderStatus);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE_PX);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);

  // Refs
  const focusTrapRef = useRef(new FocusTrap());
  const voiceProcessorRef = useRef(new VoiceCommandProcessor());
  const keyboardShortcutsRef = useRef(new Map<string, () => void>());
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Screen reader detection - re-checked on resize since some screen readers only become detectable once voices load
  useEffect(() => {
    const handleResize = () => { setIsScreenReaderActive(detectScreenReaderStatus()); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, []);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (!liveRegionRef.current) return;

    // Create temporary announcement element
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

    // Remove after announcement
    setTimeout(() => {
      announcement.remove();
    }, ANNOUNCEMENT_CLEANUP_DELAY_MS);
  }, []);

  // Focus management
  const focusNext = useCallback(() => {
    const focusableElements = [...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];

    const activeElement = document.activeElement;
    const currentIndex = isHTMLElement(activeElement) ? focusableElements.indexOf(activeElement) : -1;
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }, []);

  const focusPrevious = useCallback(() => {
    const focusableElements = [...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];

    const activeElement = document.activeElement;
    const currentIndex = isHTMLElement(activeElement) ? focusableElements.indexOf(activeElement) : -1;
    const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[previousIndex]?.focus();
  }, []);

  const trapFocus = useCallback((element: HTMLElement) => {
    focusTrapRef.current.trap(element);
  }, []);

  const releaseFocus = useCallback(() => {
    focusTrapRef.current.release();
  }, []);

  // Visual accommodations
  const toggleHighContrast = useCallback(() => {
    setHighContrastMode(previous => !previous);
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSize(previous => Math.min(previous + FONT_SIZE_STEP_PX, MAX_FONT_SIZE_PX));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(previous => Math.max(previous - FONT_SIZE_STEP_PX, MIN_FONT_SIZE_PX));
  }, []);

  // Keyboard shortcuts
  const registerShortcut = useCallback((key: string, action: () => void) => {
    keyboardShortcutsRef.current.set(key, action);
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    keyboardShortcutsRef.current.delete(key);
  }, []);

  // Voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    // Simple voice command processing
    const commands: Record<string, () => void> = {
      'next page': focusNext,
      'previous page': focusPrevious,
      'increase font size': increaseFontSize,
      'decrease font size': decreaseFontSize,
      'toggle high contrast': toggleHighContrast,
      'help': () => { setShowAccessibilityPanel(true); },
      'close': () => { setShowAccessibilityPanel(false); }
    };

    for (const [keyword, action] of Object.entries(commands)) {
      if (command.includes(keyword)) {
        action();
        return;
      }
    }

    announce('Command not recognized');
  }, [focusNext, focusPrevious, increaseFontSize, decreaseFontSize, toggleHighContrast, announce]);

  const startVoiceRecognition = useCallback(() => {
    if (!voiceProcessorRef.current.isSupported) return;

    try {
      voiceProcessorRef.current.start((command: string) => {
        announce(`Voice command: ${command}`, 'assertive');
        handleVoiceCommand(command);
      });
      setVoiceEnabled(true);
      announce('Voice commands activated', 'assertive');
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      announce('Failed to start voice recognition', 'assertive');
    }
  }, [announce, handleVoiceCommand]);

  const stopVoiceRecognition = useCallback(() => {
    voiceProcessorRef.current.stop();
    setVoiceEnabled(false);
    announce('Voice commands deactivated', 'assertive');
  }, [announce]);

  const toggleVoice = useCallback(() => {
    if (!voiceProcessorRef.current.isSupported) {
      announce('Voice commands are not supported in this browser');
      return;
    }

    if (voiceEnabled) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }, [voiceEnabled, announce, startVoiceRecognition, stopVoiceRecognition]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Accessibility modifier keys
      if (e.altKey && e.shiftKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            setShowAccessibilityPanel(previous => !previous);
            break;
          case 'h':
            e.preventDefault();
            toggleHighContrast();
            break;
          case '+':
          case '=':
            e.preventDefault();
            increaseFontSize();
            break;
          case '-':
            e.preventDefault();
            decreaseFontSize();
            break;
          case 'v':
            e.preventDefault();
            toggleVoice();
            break;
        }
      }

      // Check registered shortcuts
      const shortcutKey = `${e.altKey ? 'alt+' : ''}${e.ctrlKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key}`;
      const action = keyboardShortcutsRef.current.get(shortcutKey);
      if (action) {
        e.preventDefault();
        action();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => { document.removeEventListener('keydown', handleKeydown); };
  }, [toggleHighContrast, increaseFontSize, decreaseFontSize, toggleVoice]);

  // Apply visual accommodations
  useEffect(() => {
    document.documentElement.style.fontSize = `${String(fontSize)}px`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [fontSize]);

  useEffect(() => {
    if (highContrastMode) {
      document.documentElement.dataset.highContrast = 'true';
    } else {
      delete document.documentElement.dataset.highContrast;
    }
  }, [highContrastMode]);

  // Context value - memoized to prevent unnecessary re-renders
  const contextValue = useMemo((): AccessibilityContextType => ({
    announce,
    isScreenReaderActive,
    focusNext,
    focusPrevious,
    trapFocus,
    releaseFocus,
    highContrastMode,
    toggleHighContrast,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    keyboardShortcuts: keyboardShortcutsRef.current,
    registerShortcut,
    unregisterShortcut,
    voiceEnabled,
    toggleVoice,
    startVoiceRecognition,
    stopVoiceRecognition
  }), [
    announce,
    isScreenReaderActive,
    focusNext,
    focusPrevious,
    trapFocus,
    releaseFocus,
    highContrastMode,
    toggleHighContrast,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    registerShortcut,
    unregisterShortcut,
    voiceEnabled,
    toggleVoice,
    startVoiceRecognition,
    stopVoiceRecognition
  ]);

  return (
    <AccessibilityContext value={contextValue}>
      {children}

      {/* Screen reader live regions */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      />

      {/* Accessibility control panel */}
      <Portal>
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: 20,
            zIndex: 9999
          }}
        >
          <Button
            size="sm"
            variant="light"
            leftSection={<IconAccessible size={16} />}
            onClick={() => { setShowAccessibilityPanel(!showAccessibilityPanel); }}
            aria-label="Accessibility options"
            aria-expanded={showAccessibilityPanel}
          >
            A11y
          </Button>
        </div>
      </Portal>

      {showAccessibilityPanel && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              top: 70,
              left: 20,
              zIndex: 9999,
              width: 320
            }}
          >
            <Paper shadow="md" p="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={500}>Accessibility Options</Text>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => { setShowAccessibilityPanel(false); }}
                    aria-label="Close accessibility panel"
                  >
                    ×
                  </ActionIcon>
                </Group>

                {/* Screen reader status */}
                <Group justify="space-between" align="center">
                  <Text size="xs">Screen Reader</Text>
                  <Badge
                    size="xs"
                    color={isScreenReaderActive ? 'green' : 'gray'}
                  >
                    {isScreenReaderActive ? 'Active' : 'Not detected'}
                  </Badge>
                </Group>

                {/* High contrast mode */}
                <Group justify="space-between" align="center">
                  <Text size="xs">High Contrast</Text>
                  <ActionIcon
                    size="sm"
                    variant={highContrastMode ? 'filled' : 'outline'}
                    color="blue"
                    onClick={toggleHighContrast}
                    aria-label={`High contrast mode ${highContrastMode ? 'enabled' : 'disabled'}`}
                  >
                    <IconAdjustments size={14} />
                  </ActionIcon>
                </Group>

                {/* Font size controls */}
                <Group justify="space-between" align="center">
                  <Text size="xs">Font Size: {fontSize}px</Text>
                  <Group gap="xs">
                    <ActionIcon
                      size="sm"
                      variant="outline"
                      onClick={decreaseFontSize}
                      disabled={fontSize <= MIN_FONT_SIZE_PX}
                      aria-label="Decrease font size"
                    >
                      <IconZoomOut size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="outline"
                      onClick={increaseFontSize}
                      disabled={fontSize >= MAX_FONT_SIZE_PX}
                      aria-label="Increase font size"
                    >
                      <IconZoomIn size={14} />
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Voice commands */}
                {voiceProcessorRef.current.isSupported && (
                  <Group justify="space-between" align="center">
                    <Text size="xs">Voice Commands</Text>
                    <ActionIcon
                      size="sm"
                      variant={voiceEnabled ? 'filled' : 'outline'}
                      color={voiceEnabled ? 'green' : 'blue'}
                      onClick={toggleVoice}
                      aria-label={`Voice commands ${voiceEnabled ? 'enabled' : 'disabled'}`}
                    >
                      {voiceEnabled ? <IconVolume size={14} /> : <IconVolumeOff size={14} />}
                    </ActionIcon>
                  </Group>
                )}

                {/* Keyboard shortcuts help */}
                <Box>
                  <Text size="xs" mb="xs">Keyboard Shortcuts:</Text>
                  <Stack gap="xs" ml="sm">
                    <Text size="xs" c="dimmed">Alt+Shift+A: Accessibility panel</Text>
                    <Text size="xs" c="dimmed">Alt+Shift+H: Toggle high contrast</Text>
                    <Text size="xs" c="dimmed">Alt+Shift+±: Font size</Text>
                    <Text size="xs" c="dimmed">Alt+Shift+V: Voice commands</Text>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </div>
        </Portal>
      )}
    </AccessibilityContext>
  );
};

// Hook to use accessibility context
export const useAccessibility = () => {
  const context = use(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};