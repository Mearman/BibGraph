/**
 * Unit tests for expansion query builder service Tests query parameter construction from expansion settings
 */

import type {
  ExpansionSettings,
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

const TEST_YEAR_START = 2020;
const TEST_YEAR_END = 2023;

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

  describe("buildQueryParams", () => {
    it("should build basic query params with per_page", () => {
      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: baseSettings,
      });

      expect(parameters).toEqual({
        per_page: 200, // Always use maximum per page
      });
    });

    it("should include select fields when provided", () => {
      const selectFields = ["id", "title", "publication_year"];
      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: baseSettings,
        baseSelect: selectFields,
      });

      expect(parameters).toEqual({
        per_page: 200,
        select: selectFields,
      });
    });

    it("should include sort string when sorts are provided", () => {
      const settingsWithSort: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          { property: "publication_year", direction: "desc", priority: 1 },
          { property: "cited_by_count", direction: "asc", priority: 2 },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithSort,
      });

      expect(parameters).toEqual({
        per_page: 200,
        sort: "publication_year:desc,cited_by_count:asc",
      });
    });

    it("should include filter string when filters are provided", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "publication_year",
            operator: "gte",
            value: 2020,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });

      expect(parameters).toEqual({
        per_page: 200,
        filter: "publication_year:>=2020",
      });
    });

    it("should include both sort and filter when provided", () => {
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

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: complexSettings,
      });

      expect(parameters).toEqual({
        per_page: 200,
        sort: "cited_by_count:desc",
        filter: "is_oa:true",
      });
    });
  });

  describe("Sort string building", () => {
    it("should build sort string with single criteria", () => {
      const settingsWithSort: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          { property: "publication_year", direction: "desc", priority: 1 },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithSort,
      });
      expect(parameters.sort).toBe("publication_year:desc");
    });

    it("should build sort string with multiple criteria ordered by priority", () => {
      const settingsWithMultipleSorts: ExpansionSettings = {
        ...baseSettings,
        sorts: [
          { property: "cited_by_count", direction: "asc", priority: 3 },
          { property: "publication_year", direction: "desc", priority: 1 },
          { property: "title", direction: "asc", priority: 2 },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithMultipleSorts,
      });
      expect(parameters.sort).toBe(
        "publication_year:desc,title:asc,cited_by_count:asc",
      );
    });

    it("should handle empty sorts array", () => {
      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: baseSettings,
      });
      expect(parameters.sort).toBeUndefined();
    });
  });

  describe("Filter string building", () => {
    it("should build equality filter", () => {
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

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("type:journal-article");
    });

    it("should build not-equal filter", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "type",
            operator: "ne",
            value: "preprint",
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("type:!preprint");
    });

    it("should build greater-than filter", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "publication_year",
            operator: "gt",
            value: 2020,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("publication_year:>2020");
    });

    it("should build less-than filter", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "publication_year",
            operator: "lt",
            value: 2025,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("publication_year:<2025");
    });

    it("should build greater-than-or-equal filter", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "cited_by_count",
            operator: "gte",
            value: 10,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("cited_by_count:>=10");
    });

    it("should build less-than-or-equal filter", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "cited_by_count",
            operator: "lte",
            value: 1000,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("cited_by_count:<=1000");
    });

    it("should build between filter with array values", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "publication_year",
            operator: "between",
            value: [TEST_YEAR_START, TEST_YEAR_END],
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("publication_year:2020-2023");
    });

    it("should build in filter with array values", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "type",
            operator: "in",
            value: ["journal-article", "book-chapter"],
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("type:journal-article|book-chapter");
    });

    it("should build not-in filter with array values", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "type",
            operator: "notin",
            value: ["preprint", "thesis"],
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("type:!preprint|thesis");
    });

    it("should build contains filter", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "title",
            operator: "contains",
            value: "machine learning",
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("title:machine learning");
    });

    it("should skip disabled filters", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "type",
            operator: "eq",
            value: "journal-article",
            enabled: false, // Disabled
          },
          {
            property: "is_oa",
            operator: "eq",
            value: true,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("is_oa:true");
    });

    it("should combine multiple enabled filters", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "publication_year",
            operator: "gte",
            value: 2020,
            enabled: true,
          },
          {
            property: "is_oa",
            operator: "eq",
            value: true,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("publication_year:>=2020,is_oa:true");
    });

    it("should handle empty filters array", () => {
      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: baseSettings,
      });
      expect(parameters.filter).toBeUndefined();
    });

    it("should handle all filters disabled", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "type",
            operator: "eq",
            value: "journal-article",
            enabled: false,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBeUndefined();
    });
  });

  describe("Value formatting", () => {
    it("should format string values and escape special characters", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "title",
            operator: "eq",
            value: "test:value,with|special",
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe(String.raw`title:test\:value\,with\|special`);
    });

    it("should format boolean values", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "is_oa",
            operator: "eq",
            value: true,
            enabled: true,
          },
          {
            property: "is_retracted",
            operator: "eq",
            value: false,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("is_oa:true,is_retracted:false");
    });

    it("should format number values", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "cited_by_count",
            operator: "eq",
            value: 42,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("cited_by_count:42");
    });

    it("should format Date values as years", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "publication_date",
            operator: "gte",
            value: new Date("2023-01-01"),
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("publication_date:>=2023");
    });

    it("should handle null and undefined values", () => {
      const settingsWithFilter: ExpansionSettings = {
        ...baseSettings,
        filters: [
          {
            property: "test_null",
            operator: "eq",
            value: null,
            enabled: true,
          },
          {
            property: "test_undefined",
            operator: "eq",
            value: undefined,
            enabled: true,
          },
        ],
      };

      const parameters = ExpansionQueryBuilder.buildQueryParams({
        settings: settingsWithFilter,
      });
      expect(parameters.filter).toBe("test_null:,test_undefined:");
    });
  });
});
