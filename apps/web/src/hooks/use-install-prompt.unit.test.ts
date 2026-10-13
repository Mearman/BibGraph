/**
 * Unit tests for the install prompt hook: capture of the deferred beforeinstallprompt event, the prompt/choice round trip, and the states that must hide the affordance (no event, accepted install, already standalone).
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dispatchBeforeInstallPrompt, type PromptMock } from "@/test/helpers/install-prompt";

import { useInstallPrompt } from "./use-install-prompt";

const standaloneQueryList = {
  matches: true,
  media: "(display-mode: standalone)",
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
} as unknown as MediaQueryList;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useInstallPrompt", () => {
  it("reports no install available before any beforeinstallprompt event", async () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(false);

    await act(async () => {
      const outcome = await result.current.promptInstall();
      expect(outcome).toBe("unavailable");
    });
  });

  it("captures a beforeinstallprompt event and reports installability", () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      dispatchBeforeInstallPrompt("accepted");
    });

    expect(result.current.canInstall).toBe(true);
  });

  it("prompts the browser and clears the affordance after acceptance", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    // Placeholder mock: if the act callback below never ran, the call-count assertion fails visibly instead of tripping definite-assignment analysis.
    let prompt: PromptMock = vi.fn<() => Promise<void>>();
    act(() => {
      prompt = dispatchBeforeInstallPrompt("accepted");
    });

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(outcome).toBe("accepted");
    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.canInstall).toBe(false);
    });
  });

  it("keeps the affordance after dismissal so the user can retry", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      dispatchBeforeInstallPrompt("dismissed");
    });

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(outcome).toBe("dismissed");
    expect(result.current.canInstall).toBe(true);
  });

  it("never reports installability when already running standalone", () => {
    // The standalone display mode is what an installed launch reports; the hook must not offer installation there even though the browser deferred a prompt.
    vi.spyOn(window, "matchMedia").mockReturnValue(standaloneQueryList);
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      dispatchBeforeInstallPrompt("accepted");
    });

    expect(result.current.canInstall).toBe(false);
  });
});
