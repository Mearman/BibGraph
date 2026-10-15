/**
 * Responsive x-axis thinning for the publication timeline: with every year labelled, a few decades of data crowd roughly one rotated label per 20px, so labels are shown every Nth year with N derived from the measured plot width.
 */

/**
 * Minimum horizontal room (px) one rotated four-digit year label needs next to its neighbours.
 */
export const MIN_YEAR_LABEL_SPACING_PX = 48;

/**
 * How many years to skip between shown x-axis labels: the smallest stride that gives every shown label at least the minimum spacing at the current width. A null width (nothing measured yet) keeps every label.
 */
export const yearLabelStride = (yearCount: number, widthPx: number | null): number => {
  if (widthPx === null || widthPx <= 0 || yearCount <= 1) {
    return 1;
  }
  return Math.max(1, Math.ceil((yearCount * MIN_YEAR_LABEL_SPACING_PX) / widthPx));
};

/**
 * Whether the year at `index` of `yearCount` carries a visible label under `stride`: every stride-th year plus the final year, so the axis always names both ends.
 */
export const showsYearLabel = (index: number, yearCount: number, stride: number): boolean =>
  stride <= 1 || index % stride === 0 || index === yearCount - 1;
