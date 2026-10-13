// @vitest-environment jsdom

/**
 * Component tests for the notification bell: it is one button with an accessible name carrying the unread count, never a button nested inside a button, and activating it opens the notification list.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotificationProvider } from "@/contexts/NotificationContext";

import { NotificationCenter } from "./NotificationCenter";

const renderCenter = () =>
	render(
		<MantineProvider>
			<NotificationProvider>
				<NotificationCenter />
			</NotificationProvider>
		</MantineProvider>,
	);

describe("NotificationCenter bell", () => {
	it("is a single named button that opens the notification list", async () => {
		renderCenter();
		const bell = screen.getByRole("button", { name: "Open notifications (0 unread)" });
		fireEvent.click(bell);
		await waitFor(() => { expect(screen.getByText("Notifications")).toBeInTheDocument(); });
	});

	it("never nests a button inside a button", () => {
		const { container } = renderCenter();
		expect(container.querySelectorAll(":scope button button")).toHaveLength(0);
		expect(container.querySelectorAll(":scope button")).toHaveLength(1);
	});
});
