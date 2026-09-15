// @vitest-environment jsdom

/**
 * Settings store unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  settingsActions,
  settingsStoreInstance,
} from "./settings-store";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Use the existing store instance for testing


const MIGRATION_WAIT_MS = 100;
const INITIALIZATION_WAIT_MS = 50;

describe("SettingsStore", () => {
  beforeEach(async () => {
    // Wait for any pending migrations to complete
    await new Promise((resolve) => { setTimeout(resolve, MIGRATION_WAIT_MS); });
    // Clear store state before each test
    await settingsStoreInstance.resetSettings();
    // Clear localStorage mock calls
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    // Wait for initialization to complete
    await new Promise((resolve) => { setTimeout(resolve, INITIALIZATION_WAIT_MS); });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("politePoolEmail", () => {
    it("should have empty email initially", async () => {
      const settings = await settingsStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("");
    });

    it("should set polite pool email", async () => {
      await settingsStoreInstance.setPolitePoolEmail("test@example.com");
      const settings = await settingsStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");
    });

    it("should clear polite pool email", async () => {
      await settingsStoreInstance.setPolitePoolEmail("test@example.com");
      let settings = await settingsStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");

      await settingsStoreInstance.setPolitePoolEmail("");
      settings = await settingsStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("");
    });
  });

  describe("email validation", () => {
    it("should validate correct email", () => {
      expect(settingsActions.isValidEmail("test@example.com")).toBe(true);
    });

    it("should reject invalid email", () => {
      expect(settingsActions.isValidEmail("invalid")).toBe(false);
      expect(settingsActions.isValidEmail("")).toBe(false);
      expect(settingsActions.isValidEmail("test@")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(settingsActions.isValidEmail(" test@example.com ")).toBe(true); // trims whitespace
      expect(settingsActions.isValidEmail("test@example.com.")).toBe(false);
    });
  });

  describe("resetSettings", () => {
    it("should reset email to empty", async () => {
      await settingsStoreInstance.setPolitePoolEmail("test@example.com");
      let settings = await settingsStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");

      await settingsStoreInstance.resetSettings();
      settings = await settingsStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("");
    });
  });

  describe("state access", () => {
    it("should provide polite pool email through state", async () => {
      await settingsStoreInstance.setPolitePoolEmail("test@example.com");
      const settings = await settingsStoreInstance.getSettings();
      expect(settings.politePoolEmail).toBe("test@example.com");
    });

    it("should provide valid email check through actions", () => {
      expect(settingsActions.isValidEmail("test@example.com")).toBe(true);
      expect(settingsActions.isValidEmail("invalid")).toBe(false);
    });
  });
});
