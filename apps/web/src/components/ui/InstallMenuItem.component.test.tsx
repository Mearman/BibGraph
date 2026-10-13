/**
 * Component tests for the install menu item: it renders only while the browser holds a deferred install prompt, and clicking it triggers that prompt.
 */

import { MantineProvider, Menu } from "@mantine/core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dispatchBeforeInstallPrompt, type PromptMock } from "@/test/helpers/install-prompt";

import { InstallMenuItem } from "./InstallMenuItem";

const renderInsideOpenMenu = () =>
  render(
    <MantineProvider>
      <Menu opened withinPortal={false}>
        <Menu.Dropdown>
          <InstallMenuItem />
        </Menu.Dropdown>
      </Menu>
    </MantineProvider>,
  );

describe("InstallMenuItem", () => {
  it("renders nothing when no install prompt is available", () => {
    renderInsideOpenMenu();

    expect(screen.queryByTestId("install-app-menu-item")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Install App" })).toBeNull();
  });

  it("shows the Install App action once the browser defers a prompt", () => {
    renderInsideOpenMenu();

    act(() => {
      dispatchBeforeInstallPrompt("accepted");
    });

    expect(screen.getByRole("menuitem", { name: "Install App" })).toBeVisible();
  });

  it("prompts the browser when clicked", async () => {
    renderInsideOpenMenu();
    // Placeholder mock: if the act callback below never ran, the call-count assertion fails visibly instead of tripping definite-assignment analysis.
    let prompt: PromptMock = vi.fn<() => Promise<void>>();
    act(() => {
      prompt = dispatchBeforeInstallPrompt("accepted");
    });

    fireEvent.click(screen.getByRole("menuitem", { name: "Install App" }));

    await waitFor(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
    });
  });
});
