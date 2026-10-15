/**
 * Component tests for the settings installation panel: the install affordance is always visible somewhere, with an honest unavailable state for browsers whose install API never fires.
 */

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const promptInstall = vi.fn().mockResolvedValue("accepted");

const { canInstall, isStandalone } = vi.hoisted(() => ({
  canInstall: vi.fn(() => false),
  isStandalone: vi.fn(() => false),
}));

vi.mock("@/hooks/use-install-prompt", () => ({
  useInstallPrompt: () => ({
    canInstall: canInstall(),
    isStandalone: isStandalone(),
    promptInstall,
  }),
}));

import { InstallPanel } from "./InstallPanel";

const renderPanel = () =>
  render(
    <MantineProvider>
      <InstallPanel />
    </MantineProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe("InstallPanel", () => {
  it("offers the browser install prompt when one is available", () => {
    canInstall.mockReturnValue(true);
    isStandalone.mockReturnValue(false);
    renderPanel();

    expect(screen.getByRole("button", { name: /install app/i })).toBeVisible();
  });

  it("says plainly when the browser cannot install the app programmatically", () => {
    canInstall.mockReturnValue(false);
    isStandalone.mockReturnValue(false);
    renderPanel();

    expect(screen.getByText(/not available in this browser/i)).toBeVisible();
  });

  it("states when the app already runs installed", () => {
    canInstall.mockReturnValue(false);
    isStandalone.mockReturnValue(true);
    renderPanel();

    expect(screen.getByText(/already installed/i)).toBeVisible();
  });
});
