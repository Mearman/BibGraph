/**
 * Component tests for the graph empty state's action buttons: below the xs breakpoint the visible labels yield to the icons, so each button must carry its full action as the accessible name regardless of what is visually shown.
 */

import { MantineProvider } from "@mantine/core";
import type * as ReactRouterModule from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { GraphEmptyState } from "./GraphEmptyState";

// The empty state's buttons render router links; the test renders destinations as plain anchors so no live router instance is needed.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterModule>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  };
});

const renderEmptyState = () =>
  render(
    <MantineProvider>
      <GraphEmptyState variant="no-entities" />
    </MantineProvider>,
  );

describe("GraphEmptyState action buttons", () => {
  it("keeps each action's full name as the accessible name when the visible label yields to the icon", () => {
    renderEmptyState();

    expect(screen.getByRole("link", { name: "Search OpenAlex" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Entities" })).toBeInTheDocument();
  });
});
