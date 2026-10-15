/**
 * Component tests for the export modal: every format row is one labelled control, so clicking any part of the row (name or description) selects that format.
 */

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExportModal } from "./ExportModal";

const exportListAsFile = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useCatalogue", () => ({
  useCatalogue: () => ({ exportListAsFile }),
}));

const renderModal = () =>
  render(
    <MantineProvider>
      <ExportModal listId="list-1" listTitle="My List" onClose={() => { /* the close path is not under test */ }} />
    </MantineProvider>,
  );

describe("ExportModal format rows", () => {
  it("selects the format whose description text is clicked", async () => {
    renderModal();

    fireEvent.click(screen.getByText("Spreadsheet-compatible format"));
    fireEvent.click(screen.getByTestId("export-list-button"));

    await waitFor(() => {
      expect(exportListAsFile).toHaveBeenCalledWith("list-1", "csv");
    });
  });

  it("keeps exactly one checked format radio after selecting via the row", () => {
    renderModal();

    fireEvent.click(screen.getByText("Compact format for sharing via URL"));

    const checked = screen
      .getAllByRole("radio")
      .filter((radio) => radio.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName(/Compressed Data/);
  });
});
