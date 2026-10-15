/**
 * Component tests for the publication timeline's x-axis: year labels thin responsively at narrow widths while both ends of the axis stay named.
 */

import { MantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicationTimeline } from "./PublicationTimeline";
import { MIN_YEAR_LABEL_SPACING_PX } from "./year-label-stride";

// The crowded default the axis must survive: a quarter-century of yearly data.
const YEAR_COUNT = 26;
const FIRST_FIXTURE_YEAR = 2000;
const LAST_FIXTURE_YEAR = FIRST_FIXTURE_YEAR + YEAR_COUNT - 1;
// Widths expressed as multiples of the minimum label spacing.
const NARROW_SPACING_MULTIPLE = 6;
const GENEROUS_SPACING_MULTIPLE = 30;
// At six minimum-spacings of width, only the multiples of the stride plus the last year carry labels.
const MAX_NARROW_LABELS = 10;

const yearData = Array.from({ length: YEAR_COUNT }, (_value, index) => ({
  year: FIRST_FIXTURE_YEAR + index,
  count: index + 1,
}));

interface ResizeObserverEntryLike {
  contentRect: { width: number };
}

const installResizeObserverReporting = (widthPx: number) => {
  const observers: ((entries: readonly ResizeObserverEntryLike[]) => void)[] = [];
  class ResizeObserverStub {
    observe() {
      // Report the configured width on observe, mirroring the real observer's initial callback.
      queueMicrotask(() => {
        for (const callback of observers) {
          callback([{ contentRect: { width: widthPx } }]);
        }
      });
    }
    disconnect() {
      // the stub holds nothing to close
    }
    unobserve() {
      // the stub never emits per-element events
    }
  }
  vi.stubGlobal(
    "ResizeObserver",
    class BoundStub extends ResizeObserverStub {
      constructor(callback: (entries: readonly ResizeObserverEntryLike[]) => void) {
        super();
        observers.push(callback);
      }
    },
  );
};

// Async so the stubbed ResizeObserver's initial microtask report lands inside act before assertions read the axis.
const renderTimeline = async () => {
  let rendered: ReturnType<typeof render> | undefined;
  await act(async () => {
    await Promise.resolve();
    rendered = render(
      <MantineProvider>
        <PublicationTimeline yearData={yearData} entityType="authors" />
      </MantineProvider>,
    );
  });
  return rendered;
};

const yearLabels = (): string[] =>
  screen.getAllByText(/^(19|20)\d{2}$/).map((element) => element.textContent);

describe("PublicationTimeline x-axis", () => {
  it("thins the year labels when the measured width crowds them", async () => {
    installResizeObserverReporting(MIN_YEAR_LABEL_SPACING_PX * NARROW_SPACING_MULTIPLE);

    await renderTimeline();

    expect(yearLabels().length).toBeLessThanOrEqual(MAX_NARROW_LABELS);
  });

  it("keeps both ends of the axis named while thinning", async () => {
    installResizeObserverReporting(MIN_YEAR_LABEL_SPACING_PX * NARROW_SPACING_MULTIPLE);

    await renderTimeline();

    const labels = yearLabels();
    expect(labels).toContain(String(FIRST_FIXTURE_YEAR));
    expect(labels).toContain(String(LAST_FIXTURE_YEAR));
  });

  it("labels every year when the measured width is generous", async () => {
    installResizeObserverReporting(MIN_YEAR_LABEL_SPACING_PX * GENEROUS_SPACING_MULTIPLE);

    await renderTimeline();

    expect(yearLabels().length).toBe(YEAR_COUNT);
  });
});
