/**
 * Unit tests for expansion query builder service Tests settings validation, query preview, and settings-transform helpers
 */

import type {
  ExpansionSettings,
  FilterCriteria,
  SortCriteria,
} from "@bibgraph/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpansionQueryBuilder } from "./expansion-query-builder";

// Mock logger to prevent console output during tests
vi.mock("@bibgraph/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const OVER_LIMIT_VALUE = 10_001;
const TEST_YEAR_START = 2020;

describe("ExpansionQueryBuilder", () => {
  let baseSettings: ExpansionSettings;

  beforeEach(() => {
    baseSettings = {
      target: "works",
      enabled: true,
      limit: 100,
      sorts: [],
      filters: [],
    };
    vi.clearAllMocks();
  });

  describe("validateSettings", () => {
    it("should validate valid settings", () => {
      const result = ExpansionQueryBuilder.validateSettings(baseSettings);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject negative limit", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        limit: -1,
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Limit must be 0 (unlimited) or greater");
    });

    it("should reject limit exceeding maximum", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        limit: OVER_LIMIT_VALUE,
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Limit cannot exceed 10000 for performance reasons",
      );
    });

    it("should accept zero limit (unlimited)", () => {
      const validSettings: ExpansionSettings = {
        ...baseSettings,
        limit: 0,
      };

      const result = ExpansionQueryBuilder.validateSettings(validSettings);
      expect(result.valid).toBe(true);
    });

    it("should reject sort without property", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          {
            property: "",
            direction: "asc",
            priority: 1,
          },
        ],
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Sort criteria must have a property");
    });

    it("should reject invalid sort direction", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          {
            property: "test",
            direction: "invalid" as unknown as SortCriteria["direction"],
            priority: 1,
          },
        ],
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid sort direction: invalid");
    });

    it("should reject sort priority less than 1", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          {
            property: "test",
            direction: "asc",
            priority: 0,
          },
        ],
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Sort priority must be 1 or greater");
    });

    it("should reject duplicate sort properties", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          {
            property: "test",
            direction: "asc",
            priority: 1,
          },
          {
            property: "test",
            direction: "desc",
            priority: 2,
          },
        ],
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Duplicate sort properties are not allowed",
      );
    });

    it("should reject filter without property", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "",
            operator: "eq",
            value: "test",
            enabled: true,
          },
        ],
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Filter criteria must have a property");
    });

    it("should reject between filter without exactly 2 values", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "year",
            operator: "between",
            value: [TEST_YEAR_START], // Only 1 value
            enabled: true,
          },
        ],
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Between filter must have exactly 2 values",
      );
    });

    it("should reject in/notin filter with invalid value type", () => {
      const invalidSettings: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "type",
            operator: "in",
            value: { invalid: "object" }, // Invalid object
            enabled: true,
          },
        ],
      };

      const result = ExpansionQueryBuilder.validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Filter operator in requires array, string, or number value",
      );
    });
  });

  describe("getQueryPreview", () => {
    it("should generate preview for empty settings", () => {
      const preview = ExpansionQueryBuilder.getQueryPreview(baseSettings);
      expect(preview).toBe("?per_page=200");
    });

    it("should generate preview with sort", () => {
      const settingsWithSort: ExpansionSettings = {
        ...baseSettings,
        sorts: [{ property: "cited_by_count", direction: "desc", priority: 1 }],
      };

      const preview = ExpansionQueryBuilder.getQueryPreview(settingsWithSort);
      expect(preview).toContain("sort=cited_by_count:desc");
      expect(preview).toContain("per_page=200");
    });

    it("should generate preview with filter", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "is_oa",
            operator: "eq",
            value: true,
            enabled: true,
          },
        ],
      };

      const preview = ExpansionQueryBuilder.getQueryPreview(settingsWithFilter);
      expect(preview).toContain("filter=is_oa:true");
      expect(preview).toContain("per_page=200");
    });

    it("should generate preview with both sort and filter", () => {
      const complexSettings: ExpansionSettings = {
        ...baseSettings,
        sorts: [{ property: "cited_by_count", direction: "desc", priority: 1 }],
        filters: [
          {
            property: "is_oa",
            operator: "eq",
            value: true,
            enabled: true,
          },
        ],
      };

      const preview = ExpansionQueryBuilder.getQueryPreview(complexSettings);
      expect(preview).toContain("sort=cited_by_count:desc");
      expect(preview).toContain("filter=is_oa:true");
      expect(preview).toContain("per_page=200");
    });
  });

  describe("mergeFilters", () => {
    it("should return undefined when no filters", () => {
      const result = ExpansionQueryBuilder.mergeFilters({
        baseFilters: undefined,
        additionalFilters: [],
      });
      expect(result).toBeUndefined();
    });

    it("should return base filters when no additional filters", () => {
      const result = ExpansionQueryBuilder.mergeFilters({
        baseFilters: "entityType:journal-article",
        additionalFilters: [],
      });
      expect(result).toBe("entityType:journal-article");
    });

    it("should return additional filters when no base filters", () => {
      const additionalFilters: FilterCriteria[] = [
        {
          property: "is_oa",
          operator: "eq",
          value: true,
          enabled: true,
        },
      ];

      const result = ExpansionQueryBuilder.mergeFilters({
        baseFilters: undefined,
        additionalFilters,
      });
      expect(result).toBe("is_oa:true");
    });

    it("should merge base and additional filters", () => {
      const additionalFilters: FilterCriteria[] = [
        {
          property: "is_oa",
          operator: "eq",
          value: true,
          enabled: true,
        },
      ];

      const result = ExpansionQueryBuilder.mergeFilters({
        baseFilters: "type:journal-article",
        additionalFilters,
      });
      expect(result).toBe("type:journal-article,is_oa:true");
    });
  });

  describe("withAdditionalFilters", () => {
    it("should add filters to settings without existing filters", () => {
      const additionalFilters: FilterCriteria[] = [
        {
          property: "is_oa",
          operator: "eq",
          value: true,
          enabled: true,
        },
      ];

      const result = ExpansionQueryBuilder.withAdditionalFilters({
        settings: baseSettings,
        additionalFilters,
      });
      expect(result.filters).toHaveLength(1);
      expect(result.filters?.[0]).toEqual(additionalFilters[0]);
    });

    it("should combine existing and additional filters", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "type",
            operator: "eq",
            value: "journal-article",
            enabled: true,
          },
        ],
      };

      const additionalFilters: FilterCriteria[] = [
        {
          property: "is_oa",
          operator: "eq",
          value: true,
          enabled: true,
        },
      ];

      const result = ExpansionQueryBuilder.withAdditionalFilters({
        settings: settingsWithFilter,
        additionalFilters,
      });
      expect(result.filters).toHaveLength(2);
      expect(result.filters?.[0].property).toBe("type");
      expect(result.filters?.[1].property).toBe("is_oa");
    });
  });

  describe("withFallbackSort", () => {
    it("should add fallback sort when no sorts exist", () => {
      const fallbackSort: SortCriteria = {
        property: "cited_by_count",
        direction: "desc",
        priority: 1,
      };

      const result = ExpansionQueryBuilder.withFallbackSort({
        settings: baseSettings,
        fallbackSort,
      });
      expect(result.sorts).toHaveLength(1);
      expect(result.sorts?.[0].property).toBe("cited_by_count");
      expect(result.sorts?.[0].priority).toBe(1);
    });

    it("should not add fallback sort when sorts already exist", () => {
      const settingsWithSort: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          {
            property: "publication_year",
            direction: "desc",
            priority: 1,
          },
        ],
      };

      const fallbackSort: SortCriteria = {
        property: "cited_by_count",
        direction: "desc",
        priority: 1,
      };

      const result = ExpansionQueryBuilder.withFallbackSort({
        settings: settingsWithSort,
        fallbackSort,
      });
      expect(result.sorts).toHaveLength(1);
      expect(result.sorts?.[0].property).toBe("publication_year");
    });
  });
});
