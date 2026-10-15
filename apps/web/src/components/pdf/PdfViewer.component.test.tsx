/**
 * Component tests for PdfViewer. The always-visible embedded-display hint exists because publisher frame refusals (X-Frame-Options) fail silently inside the iframe: the browser paints its own error page, the iframe error handler never fires, and the console errors are unreachable from the app (2026-10-15 verification walk found unexplained blank frames on OA work pages).
 */

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TestWrapper } from "@/test/test-utils";

import { PdfViewer } from "./PdfViewer";

describe("PdfViewer", () => {
	it("shows the embedded-display fallback hint beside the frame so a refused embed is explained, not a blank frame", () => {
		render(
			<TestWrapper>
				<MantineProvider>
				<PdfViewer pdfUrl="https://peerj.com/articles/1234.pdf" title="A framed PDF" />
			</MantineProvider>
			</TestWrapper>,
		);
		expect(
			screen.getByText(/Some publishers block embedded display/i),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Open PDF in new tab" })).toBeInTheDocument();
	});

	it("renders nothing when there is no pdf url and no error", () => {
		const { container } = render(
			<TestWrapper>
				<MantineProvider>
				<PdfViewer pdfUrl={null} />
			</MantineProvider>
			</TestWrapper>,
		);
		expect(container.querySelector("iframe")).toBeNull();
		expect(screen.queryByText(/PDF Document/i)).toBeNull();
	});
});
