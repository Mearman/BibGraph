// @vitest-environment jsdom

/**
 * Unit tests for the onboarding hook: the tour never opens by itself, not even on a first visit; the corner launchpad opens it on demand, and closing it marks the tour completed so the offer never nags as unfinished business.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useOnboarding } from "./useOnboarding";

describe("useOnboarding", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("does not open the tour on a first visit", () => {
    window.localStorage.removeItem("bibgraph-onboarding-completed");
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.tourOpen).toBe(false);
  });

  it("does not open the tour on a later visit either", () => {
    window.localStorage.setItem("bibgraph-onboarding-completed", "true");
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.tourOpen).toBe(false);
  });

  it("opens the tour on demand and marks it completed when closed", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.openTour();
    });
    expect(result.current.tourOpen).toBe(true);
    act(() => {
      result.current.closeTour();
    });
    expect(result.current.tourOpen).toBe(false);
    expect(window.localStorage.getItem("bibgraph-onboarding-completed")).toBe("true");
  });
});
