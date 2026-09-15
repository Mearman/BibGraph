// @vitest-environment jsdom

/**
 * Unit tests for expansion settings store
 * Tests standalone actions API for expansion configuration management
 *
 * NOTE: The standalone expansionSettingsActions API is currently incomplete.
 * Only getSettings() and getSettingsSummary() are functional.
 * The React hooks API (useExpansionSettingsActions) should be used for full functionality.
 */

import { RelationType } from "@bibgraph/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expansionSettingsActions } from "./expansion-settings-store";

// Mock logger to prevent console output during tests
vi.mock("@bibgraph/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Expansion Settings Store - Standalone API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Store initialization", () => {
    it("should initialize with default settings for all entity types", () => {
      const { getSettings } = expansionSettingsActions;

      // Should have settings for all entity types
      expect(getSettings("works")).toBeDefined();
      expect(getSettings("authors")).toBeDefined();
      expect(getSettings("sources")).toBeDefined();
      expect(getSettings("institutions")).toBeDefined();
      expect(getSettings("topics")).toBeDefined();
      expect(getSettings("keywords")).toBeDefined();
      expect(getSettings("publishers")).toBeDefined();
      expect(getSettings("funders")).toBeDefined();

      // Should have settings for relation types
      expect(getSettings(RelationType.REFERENCE)).toBeDefined();
      expect(getSettings(RelationType.AUTHORSHIP)).toBeDefined();
    });

    it("should have valid default settings structure", () => {
      const { getSettings } = expansionSettingsActions;
      const worksSettings = getSettings("works");

      expect(worksSettings).toMatchObject({
        enabled: expect.any(Boolean) as unknown,
        limit: expect.any(Number) as unknown,
        sorts: expect.any(Array) as unknown,
        filters: expect.any(Array) as unknown,
      });

      expect(worksSettings.limit).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getSettings", () => {
    it("should return settings for a specific target", () => {
      const { getSettings } = expansionSettingsActions;
      const worksSettings = getSettings("works");

      expect(worksSettings).toBeDefined();
      expect(typeof worksSettings.enabled).toBe("boolean");
      expect(typeof worksSettings.limit).toBe("number");
    });

    it("should return different settings for different targets", () => {
      const { getSettings } = expansionSettingsActions;
      const worksSettings = getSettings("works");
      const authorsSettings = getSettings("authors");

      // Settings should be different objects
      expect(worksSettings).not.toBe(authorsSettings);
    });

    it("should return settings with expected properties", () => {
      const { getSettings } = expansionSettingsActions;
      const settings = getSettings("works");

      expect(settings).toHaveProperty("target");
      expect(settings).toHaveProperty("enabled");
      expect(settings).toHaveProperty("limit");
      expect(settings).toHaveProperty("sorts");
      expect(settings).toHaveProperty("filters");
    });
  });

  describe("getSettingsSummary", () => {
    it("should return a summary object with max limits", () => {
      const { getSettingsSummary } = expansionSettingsActions;

      const summary = getSettingsSummary("works");

      expect(typeof summary).toBe("object");
      expect(summary).toHaveProperty("maxWorks");
      expect(summary).toHaveProperty("maxAuthors");
      expect(summary).toHaveProperty("maxInstitutions");
      expect(summary).toHaveProperty("maxSources");
      expect(summary).toHaveProperty("maxConcepts");
      expect(summary).toHaveProperty("maxTopics");
      expect(summary).toHaveProperty("maxFunders");
      expect(summary).toHaveProperty("maxPublishers");
    });

    it("should return consistent summary for same target", () => {
      const { getSettingsSummary } = expansionSettingsActions;

      const summary1 = getSettingsSummary("works");
      const summary2 = getSettingsSummary("works");

      expect(summary1).toEqual(summary2);
    });
  });

  describe("All relation types", () => {
    it("should have settings for all relation types", () => {
      const { getSettings } = expansionSettingsActions;

      const relationTypes = [
        RelationType.AUTHORSHIP,
        RelationType.AFFILIATION,
        RelationType.PUBLICATION,
        RelationType.REFERENCE,
        RelationType.TOPIC,
        RelationType.HOST_ORGANIZATION,
        RelationType.LINEAGE,
        RelationType.AUTHOR_RESEARCHES,
        RelationType.FUNDED_BY,
      ];

      for (const relationType of relationTypes) {
        const settings = getSettings(relationType);
        expect(settings).toBeDefined();
        expect(settings.target).toBe(relationType);
      }
    });
  });
});
