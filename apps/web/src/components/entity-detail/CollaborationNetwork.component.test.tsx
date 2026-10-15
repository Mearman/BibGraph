/**
 * Component tests for the Collaboration Network section's response to the works query's state: an errored works query shows the classified error copy, never the no-co-authors empty state, because the empty state claims the author has no co-authors when the truth is the works failed to load.
 */

import { OpenAlexApiError } from "@bibgraph/client";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollaborationNetwork } from "./CollaborationNetwork";

const renderSection = (properties: { works?: []; isLoading?: boolean; error?: Error | null }) =>
  render(
    <MantineProvider>
      <CollaborationNetwork
        authorId="https://openalex.org/A5017898742"
        works={properties.works ?? []}
        isLoading={properties.isLoading ?? false}
        error={properties.error ?? null}
      />
    </MantineProvider>,
  );

describe("CollaborationNetwork error state", () => {
  it("shows the classified error copy when the works query errored", () => {
    renderSection({ error: new OpenAlexApiError({ message: "Too many requests", statusCode: 429 }) });

    expect(screen.getByText("Collaboration Network")).toBeVisible();
    expect(screen.getByText(/could not be loaded/i)).toBeVisible();
    expect(screen.queryByText(/No co-authors appear/i)).toBeNull();
  });

  it("keeps the empty state when the works query succeeded with no co-authors", () => {
    renderSection({ error: null });

    expect(screen.getByText(/No co-authors appear/i)).toBeVisible();
  });

  it("keeps the loading state ahead of the error state while the query is in flight", () => {
    renderSection({ isLoading: true, error: new Error("boom") });

    expect(screen.getByText(/Loading co-authors/i)).toBeVisible();
  });
});
