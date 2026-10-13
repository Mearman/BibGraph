/**
 * Install prompt state for the PWA.
 *
 * Browsers that support programmatic installation (Chromium desktop and Android) fire `beforeinstallprompt` once the installability criteria are met, and defer the browser dialog until the page calls `prompt()` on the captured event. The hook exposes that captured event as renderable state.
 *
 * iOS Safari never fires the event: installation there relies on the manifest and the Share menu, so the hook reports "cannot install" and no install affordance renders.
 */

import { useCallback, useEffect, useState } from "react";

/**
 * The parts of the non-standard BeforeInstallPromptEvent the app consumes.
 */
interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Narrow an arbitrary Event to a deferred install prompt. The DOM lib does not know this non-standard event type, and production code must not assert types.
 */
const isDeferredInstallPromptEvent = (
  event: Event,
): event is DeferredInstallPromptEvent =>
  "prompt" in event &&
  typeof event.prompt === "function" &&
  "userChoice" in event;

const STANDALONE_DISPLAY_MODE_QUERY = "(display-mode: standalone)";

/**
 * True when the page runs as an installed app rather than a browser tab.
 */
const isRunningStandalone = (): boolean => {
  if (window.matchMedia(STANDALONE_DISPLAY_MODE_QUERY).matches) {
    return true;
  }
  // iOS Safari reports installation through its own navigator flag, outside the display-mode media query the other engines honour.
  return "standalone" in navigator && navigator.standalone === true;
};

export type InstallPromptOutcome = "accepted" | "dismissed" | "unavailable";

export interface UseInstallPromptResult {
  /**
   * True while the browser holds a deferred install prompt and the app is not already installed.
   */
  canInstall: boolean;
  /**
   * Shows the browser install dialog and resolves with the user's choice.
   */
  promptInstall: () => Promise<InstallPromptOutcome>;
}

export const useInstallPrompt = (): UseInstallPromptResult => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<DeferredInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(isRunningStandalone);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isDeferredInstallPromptEvent(event)) return;
      // Keep the browser's own mini-infobar out of the picture; the app offers installation through its own affordance instead.
      event.preventDefault();
      setDeferredPrompt(event);
    };

    // A successful install clears the deferred prompt and hides the affordance for the launched app; the display-mode listener covers tab/app switches afterwards.
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    const displayModeQuery = window.matchMedia(STANDALONE_DISPLAY_MODE_QUERY);
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsStandalone(event.matches || isRunningStandalone());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayModeQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayModeQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallPromptOutcome> => {
    if (deferredPrompt === null) {
      return "unavailable";
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      // The appinstalled event also clears this; clearing here keeps the state correct even if the event is swallowed by a browser edge case.
      setDeferredPrompt(null);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null && !isStandalone,
    promptInstall,
  };
};
