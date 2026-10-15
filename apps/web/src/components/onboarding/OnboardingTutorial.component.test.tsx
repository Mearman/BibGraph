// @vitest-environment jsdom

/**
 * Component tests for the onboarding tutorial: the tour is the same eight steps as before, but Skip is on every step (not only reachable by finishing), and reopening the tour starts from the first step again. The corner launchpad, not a first-visit modal, is what offers the tour.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingTutorial } from "./OnboardingTutorial";
import { TourLaunchpad } from "./TourLaunchpad";

const renderTutorial = (opened: boolean) => {
  const onClose = vi.fn<() => void>();
  const view = (nextOpened: boolean) => (
    <MantineProvider>
      <OnboardingTutorial opened={nextOpened} onClose={onClose} />
    </MantineProvider>
  );
  const rendered = render(view(opened));
  return {
    onClose,
    rerender: (nextOpened: boolean): void => {
      rendered.rerender(view(nextOpened));
    },
  };
};

describe("OnboardingTutorial", () => {
  /**
   * Presses needed to walk from the first step to the last of the eight.
   */
  const PRESSES_TO_LAST_STEP = 7;

  afterEach(() => {
    window.localStorage.clear();
  });

  it("offers Skip on the very first step, and skipping completes the tour", () => {
    const { onClose } = renderTutorial(true);
    const skip = screen.getByRole("button", { name: /skip tour/i });
    expect(skip).toBeInTheDocument();
    expect(skip).toBeVisible();
    fireEvent.click(skip);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("bibgraph-onboarding-completed")).toBe("true");
  });

  it("keeps Skip available on the last step", () => {
    renderTutorial(true);
    for (let press = 0; press < PRESSES_TO_LAST_STEP; press++) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    expect(screen.getByText("Step 8 of 8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip tour/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("preserves the full tour content for whoever takes it", () => {
    renderTutorial(true);
    expect(screen.getByText("Welcome to BibGraph!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Global Search")).toBeInTheDocument();
  });

  it("restarts at the first step when the tour is reopened", () => {
    const { rerender } = renderTutorial(true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 8")).toBeInTheDocument();
    rerender(false);
    rerender(true);
    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
    expect(screen.getByText("Welcome to BibGraph!")).toBeInTheDocument();
  });
});

describe("TourLaunchpad", () => {
  it("offers the tour from a corner button without opening anything by itself", () => {
    const onOpen = vi.fn<() => void>();
    render(
      <MantineProvider>
        <TourLaunchpad onOpen={onOpen} />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /take the tour/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
