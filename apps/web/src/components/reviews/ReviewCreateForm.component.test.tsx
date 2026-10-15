// @vitest-environment jsdom

/**
 * Component tests for the review create form: a review can start from search terms alone (the app picks the starting works), from pasted starting works, or from chosen bookmarked works. The form is a real form (Enter submits), shows each field's error under that field, focuses the first invalid field, and while submitting locks its fields, shows the start's stage and offers a cancel.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewCreateForm, type ReviewCreateValues } from "./ReviewCreateForm";

const BOOKMARKS = [
  { id: "W11", title: "Bookmarked one" },
  { id: "W12", title: "Bookmarked two" },
];

interface RenderOptions {
  readonly submitting?: boolean;
  readonly progressLabel?: string | null;
  readonly onCancel?: () => void;
}

const renderForm = (
  bookmarkedWorks = BOOKMARKS,
  options: RenderOptions = {},
) => {
  const onSubmit = vi.fn<(values: ReviewCreateValues) => void>();
  const { container } = render(
    <MantineProvider>
      <ReviewCreateForm
        onSubmit={onSubmit}
        submitting={options.submitting ?? false}
        bookmarkedWorks={bookmarkedWorks}
        progressLabel={options.progressLabel}
        onCancel={options.onCancel}
      />
    </MantineProvider>,
  );
  const form = container.querySelector("form");
  if (form === null)
    throw new Error("the form must render a real form element");
  return { onSubmit, form };
};

const fill = (label: string | RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), {
    target: { value },
  });
};

const submit = (form: HTMLFormElement) => {
  fireEvent.submit(form);
};

describe("ReviewCreateForm", () => {
  it("starts from search terms alone with no starting works", () => {
    const { onSubmit, form } = renderForm();
    fill("Review name", "Malaria gut");
    fill("Search terms", "malaria AND gut");
    submit(form);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Malaria gut",
      query: "malaria AND gut",
      seeds: [],
    });
    expect(screen.getByText(/pick them for you/)).toBeInTheDocument();
  });

  it("submits when Enter is pressed in the name field", () => {
    const { onSubmit } = renderForm();
    fill("Review name", "Enter start");
    fill("Search terms", "malaria");
    fireEvent.keyDown(screen.getByLabelText(/Review name/), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.submit(
      screen.getByLabelText(/Review name/).closest("form") ??
        document.createElement("form"),
    );
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Enter start",
      query: "malaria",
      seeds: [],
    });
  });

  it("starts from pasted starting works, normalising URLs and separators", () => {
    const { onSubmit, form } = renderForm();
    fill("Review name", "From seeds");
    fill("Starting works", "https://openalex.org/W1, w2\nW3");
    submit(form);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "From seeds",
      query: "",
      seeds: ["W1", "W2", "W3"],
    });
    expect(screen.getByText("3 starting works")).toBeInTheDocument();
    expect(screen.getByText("Bookmarked one")).toBeInTheDocument();
  });

  it("lets the reviewer pick which bookmarked works to add, skipping ones already present", () => {
    const { onSubmit, form } = renderForm();
    fill("Review name", "From bookmarks");
    fill("Starting works", "W12");
    fireEvent.click(screen.getByRole("checkbox", { name: "Bookmarked one" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Add 1 selected as starting works" }),
    );
    submit(form);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "From bookmarks",
      query: "",
      seeds: ["W12", "W11"],
    });
    expect(
      screen.getByText("Bookmarked two (already added)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Bookmarked two (already added)" }),
    ).toBeDisabled();
  });

  it("shows each field's error under its own field and focuses the first invalid one", () => {
    const { onSubmit, form } = renderForm();
    submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Give the review a name.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Review name/)).toHaveFocus();
    fill("Review name", "Named");
    submit(form);
    expect(
      screen.queryByText("Give the review a name."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Enter search terms, some starting works, or both."),
    ).toBeInTheDocument();
    fill("Starting works", "W1 nonsense");
    submit(form);
    expect(
      screen.getByText(/Not OpenAlex work ids: nonsense/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Enter search terms, some starting works, or both."),
    ).not.toBeInTheDocument();
  });

  it("removes a parsed starting work from its chip", () => {
    const { onSubmit, form } = renderForm();
    fill("Review name", "Chips");
    fill("Starting works", "W1 W2");
    expect(screen.getByText("2 starting works")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove W1" }));
    expect(screen.getByText("1 starting work")).toBeInTheDocument();
    submit(form);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Chips",
      query: "",
      seeds: ["W2"],
    });
  });

  it("locks the fields, shows the stage and offers a cancel while submitting", () => {
    const onCancel = vi.fn<() => void>();
    const { onSubmit, form } = renderForm(BOOKMARKS, {
      submitting: true,
      progressLabel: "Searching OpenAlex...",
      onCancel,
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Searching OpenAlex...",
    );
    expect(screen.getByLabelText(/Review name/)).toBeDisabled();
    expect(screen.getByLabelText(/Search terms/)).toBeDisabled();
    expect(screen.getByLabelText(/Starting works/)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("carries a placeholder naming the kind of review", () => {
    renderForm();
    expect(
      screen.getByPlaceholderText("Gut microbiome and malaria"),
    ).toBeInTheDocument();
  });

  it("clears the form when a start succeeds, so a second submit cannot duplicate it", async () => {
    const onSubmit = vi.fn<(values: ReviewCreateValues) => Promise<void>>(
      async () => {
        await Promise.resolve();
      },
    );
    const { container } = render(
      <MantineProvider>
        <ReviewCreateForm
          onSubmit={onSubmit}
          submitting={false}
          bookmarkedWorks={[]}
        />
      </MantineProvider>,
    );
    const form = container.querySelector("form");
    if (form === null) throw new Error("the form must render a real form element");
    fill("Review name", "Malaria gut");
    fill("Search terms", "malaria AND gut");
    fill("Starting works", "W1");
    submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByLabelText(/Review name/)).toHaveValue("");
      expect(screen.getByLabelText(/Search terms/)).toHaveValue("");
      expect(screen.getByLabelText(/Starting works/)).toHaveValue("");
    });
    // With the fields cleared, a second press of the still-live button has nothing to submit.
    submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps the entered values when a start fails, so nothing is retyped", async () => {
    const onSubmit = vi.fn<(values: ReviewCreateValues) => Promise<void>>(
      async () => {
        await Promise.reject(new Error("search failed"));
      },
    );
    const { container } = render(
      <MantineProvider>
        <ReviewCreateForm
          onSubmit={onSubmit}
          submitting={false}
          bookmarkedWorks={[]}
        />
      </MantineProvider>,
    );
    const form = container.querySelector("form");
    if (form === null) throw new Error("the form must render a real form element");
    fill("Review name", "Malaria gut");
    fill("Search terms", "malaria AND gut");
    submit(form);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/Review name/)).toHaveValue("Malaria gut");
      expect(screen.getByLabelText(/Search terms/)).toHaveValue("malaria AND gut");
    });
  });
});
