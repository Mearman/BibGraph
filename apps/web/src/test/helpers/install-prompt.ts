/**
 * Test helper: dispatch a synthetic beforeinstallprompt event, the non-standard event Chromium fires when a PWA becomes installable. jsdom never fires it, so install-affordance tests synthesise one carrying the two fields the app reads (prompt and userChoice).
 */

import { type Mock, vi } from "vitest";

export type InstallChoiceOutcome = "accepted" | "dismissed";

/**
 * The mocked `BeforeInstallPromptEvent.prompt` method a test asserts on.
 */
export type PromptMock = Mock<() => Promise<void>>;

export const dispatchBeforeInstallPrompt = (
  outcome: InstallChoiceOutcome,
): PromptMock => {
  const prompt = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const userChoice = Promise.resolve<{ outcome: InstallChoiceOutcome }>({
    outcome,
  });
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: { value: userChoice },
  });
  window.dispatchEvent(event);
  return prompt;
};
