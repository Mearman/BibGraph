// @vitest-environment jsdom

/**
 * Unit tests for the global hotkeys: a bare-letter shortcut acts on the page but never swallows typing into a form field, and j and k walk the role="listitem" rows whether focus sits on a row or on a control inside one.
 */

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useGlobalHotkeys } from "./use-hotkeys";

const press = (target: HTMLElement, key: string): KeyboardEvent => {
	const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
	target.dispatchEvent(event);
	return event;
};

describe("useGlobalHotkeys", () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it("claims a bare-letter shortcut pressed on the page", () => {
		renderHook(() => {
			useGlobalHotkeys({ enabled: true });
		});
		expect(press(document.body, "j").defaultPrevented).toBe(true);
	});

	it("leaves typing into an input alone", () => {
		renderHook(() => {
			useGlobalHotkeys({ enabled: true });
		});
		const input = document.createElement("input");
		document.body.append(input);
		expect(press(input, "j").defaultPrevented).toBe(false);
	});

	it("walks list items with j and k, from a focused row and from a control inside one", () => {
		renderHook(() => {
			useGlobalHotkeys({ enabled: true });
		});
		const list = document.createElement("ul");
		const first = document.createElement("li");
		const second = document.createElement("li");
		const button = document.createElement("button");
		first.setAttribute("role", "listitem");
		second.setAttribute("role", "listitem");
		first.tabIndex = 0;
		second.tabIndex = 0;
		second.append(button);
		list.append(first, second);
		document.body.append(list);

		expect(document.activeElement).toBe(document.body);
		press(document.body, "j");
		expect(document.activeElement).toBe(first);

		// Focus on the row itself: j moves to the next row, not back to the first.
		press(document.body, "j");
		expect(document.activeElement).toBe(second);

		// Focus on a control inside a row: k moves back to the previous row.
		button.focus();
		press(document.body, "k");
		expect(document.activeElement).toBe(first);
	});
});
