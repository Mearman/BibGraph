// @vitest-environment jsdom

/**
 * Regression test: addEvent from the app activity store must keep a stable identity across state updates. It used to be rebuilt whenever the stored events changed, so NavigationTracker's mount effect (which depends on addEvent and calls it) re-fired on every event it added: an unbounded render loop that surfaced as "Maximum update depth exceeded" on pages that mount while activity events are being recorded.
 */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppActivityProvider, useAppActivityStore } from "./provider";

vi.mock("./database", () => ({
	loadEventsFromDB: vi.fn(async () => {
		await Promise.resolve();
		return {};
	}),
	saveEventToDB: vi.fn(async () => {
		await Promise.resolve();
	}),
	deleteEventsFromDB: vi.fn(async () => {
		await Promise.resolve();
	}),
}));

const wrapper = ({ children }: { readonly children: ReactNode }) => <AppActivityProvider>{children}</AppActivityProvider>;

describe("addEvent identity", () => {
	it("is unchanged after an event has been added", () => {
		const { result } = renderHook(() => useAppActivityStore(), { wrapper });
		const before = result.current.addEvent;
		act(() => {
			before({ type: "component", category: "lifecycle", event: "mount", description: "d", severity: "debug" });
		});
		expect(result.current.addEvent).toBe(before);
	});
});
