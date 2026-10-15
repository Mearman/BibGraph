/**
 * Component tests for entity data display: primitive arrays such as name alternatives deduplicate case-insensitively for display, because OpenAlex can carry the same alternative in two casings.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as ReactRouterModule from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { EntityDataDisplay } from "./EntityDataDisplay";

// Identifier values render as router links; the test renders destinations as plain anchors so no live router instance is needed.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterModule>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  };
});

const renderData = (data: Record<string, unknown>) =>
  render(
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <EntityDataDisplay data={data} />
      </QueryClientProvider>
    </MantineProvider>,
  );

describe("EntityDataDisplay primitive arrays", () => {
  it("renders each case-insensitive duplicate alternative once, keeping the first casing", () => {
    renderData({
      id: "https://openalex.org/A5017898742",
      display_name: "William Teahan",
      display_name_alternatives: ["TEAHAN, WILLIAM", "TEAHAN, William", "Mearman, J"],
    });

    const badges = screen.getAllByText(/TEAHAN, WILLIAM/i);
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent("TEAHAN, WILLIAM");
    expect(screen.getByText("Mearman, J")).toBeVisible();
  });

  it("keeps distinct alternatives that differ by more than case", () => {
    renderData({
      id: "https://openalex.org/A5017898742",
      display_name: "William Teahan",
      display_name_alternatives: ["W. Teahan", "Bill Teahan"],
    });

    expect(screen.getByText("W. Teahan")).toBeVisible();
    expect(screen.getByText("Bill Teahan")).toBeVisible();
  });

  it("renders apostrophe-glyph duplicates once, keeping the first spelling", () => {
    renderData({
      id: "https://openalex.org/A5020251281",
      display_name: "Dara O'Briain",
      display_name_alternatives: ["O'BRIAIN, DARA", "O’BRIAIN, DARA"],
    });

    const badges = screen.getAllByText(/O.?BRIAIN, DARA/i);
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent("O'BRIAIN, DARA");
  });
});
