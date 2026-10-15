/**
 * Regression tests: entity error pages must show human-facing copy, not raw internals. A schema parse failure dumps a Zod issue array and an HTTP 404 dumps an OpenAlexApiError message when rendered with String(error); both must instead surface a plain-English sentence, with the technical detail available only behind an explicit disclosure.
 */

import { OpenAlexApiError } from "@bibgraph/client";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ErrorState } from "./ErrorState";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const schemaParseFailure = (): unknown => {
  const result = z
    .object({ authorships: z.array(z.object({ author: z.object({ orcid: z.string() }) })) })
    .safeParse({ authorships: [{ author: { orcid: 123 } }] });
  if (result.success) {
    throw new Error("expected the fixture payload to fail schema validation");
  }
  return result.error;
};

const renderErrorState = (error: unknown) => {
  return render(
    <MantineProvider>
      <ErrorState entityType="Work" entityId="W123" error={error} />
    </MantineProvider>,
  );
};

afterEach(() => {
  cleanup();
});

describe("entity ErrorState human-facing copy", () => {
  it("shows a plain-English sentence for a schema parse failure, not the Zod issue array", () => {
    renderErrorState(schemaParseFailure());

    expect(screen.getByTestId("error-headline")).toHaveTextContent(
      /did not match the expected shape/i,
    );
    expect(screen.queryByTestId("error-technical-details")).not.toBeInTheDocument();
  });

  it("shows a plain-English sentence for an HTTP 404", () => {
    renderErrorState(
      new OpenAlexApiError({
        message: "HTTP 404: Not Found",
        statusCode: 404,
      }),
    );

    expect(screen.getByTestId("error-headline")).toHaveTextContent(
      /OpenAlex has no record with this id/i,
    );
    expect(screen.queryByTestId("error-technical-details")).not.toBeInTheDocument();
  });

  it("keeps the technical detail available behind a collapsed disclosure", async () => {
    renderErrorState(schemaParseFailure());
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /technical details/i }));

    const detail = screen.getByTestId("error-technical-details");
    expect(detail).toBeInTheDocument();
    expect(detail).toHaveTextContent(/"orcid"/);
  });
});
