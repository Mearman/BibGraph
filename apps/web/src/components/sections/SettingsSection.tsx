/**
 * Settings section for user preferences and data management
 */

import { updateOpenAlexApiKey,updateOpenAlexEmail } from "@bibgraph/client";
import { BackgroundStrategySelector,DataVersionSelector, XpacToggle } from "@bibgraph/ui";
import { isDataVersionSelectorVisible } from "@bibgraph/utils";
import { clearAllCacheLayers , clearAppMetadata } from "@bibgraph/utils/cache";
import { logger } from "@bibgraph/utils/logger";
import {
  Alert,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconKey,
  IconMail,
  IconRefresh,
  IconSettings,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { type BackgroundStrategy,settingsStoreInstance, usePolitePoolEmail, useSettingsStore } from "@/stores/settings-store";


interface ResetState {
  clearingCache: boolean;
  resettingPreferences: boolean;
}

export const SettingsSection: React.FC = () => {
  const [resetState, setResetState] = React.useState<ResetState>({
    clearingCache: false,
    resettingPreferences: false,
  });

  // Settings store - using simplified API
  const politePoolEmail = usePolitePoolEmail();
  const { setPolitePoolEmail, setApiKey, isValidEmail } = useSettingsStore(
    (state) => state,
  );

  // Local state for xpac setting
  const [includeXpac, setIncludeXpac] = React.useState<boolean>(true);

  // Local state for data version setting
  const [dataVersion, setDataVersion] = React.useState<'1' | '2' | undefined>();

  // Local state for API key
  const [storedApiKey, setStoredApiKey] = React.useState<string | undefined>();

  // Local state for background strategy
  const [backgroundStrategy, setBackgroundStrategy] = React.useState<BackgroundStrategy>('idle');

  // Load settings from store on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      const settings = await settingsStoreInstance.getSettings();
      setIncludeXpac(settings.includeXpac);
      setDataVersion(settings.dataVersion);
      setStoredApiKey(settings.apiKey);
      setBackgroundStrategy(settings.backgroundStrategy);
    };
    void loadSettings();
  }, []);

  // Local state for email editing
  const [localEmail, setLocalEmail] = React.useState(politePoolEmail || "");
  const [previousPolitePoolEmail, setPreviousPolitePoolEmail] = React.useState(politePoolEmail);
  const [isEditingEmail, setIsEditingEmail] = React.useState(false);
  const [showEmailValidation, setShowEmailValidation] = React.useState(false);

  // Local state for API key editing
  const [localApiKey, setLocalApiKey] = React.useState<string>(storedApiKey ?? "");
  const [previousStoredApiKey, setPreviousStoredApiKey] = React.useState(storedApiKey);
  const [isEditingApiKey, setIsEditingApiKey] = React.useState(false);

  const queryClient = useQueryClient();

  // Adjust local state during render when the store value changes, avoiding a useEffect-driven extra render (see https://react.dev/learn/you-might-not-need-an-effect).
  if (politePoolEmail !== previousPolitePoolEmail) {
    setPreviousPolitePoolEmail(politePoolEmail);
    setLocalEmail(politePoolEmail || "");
  }

  if (storedApiKey !== previousStoredApiKey) {
    setPreviousStoredApiKey(storedApiKey);
    setLocalApiKey(storedApiKey ?? "");
  }

  const handleEmailChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setLocalEmail(value);
      setShowEmailValidation(value.length > 0);
    },
    [],
  );

  // Helper function to update email configuration
  const updateEmailConfig = React.useCallback(
    async (email: string) => {
      await setPolitePoolEmail(email);
      updateOpenAlexEmail(email);
    },
    [setPolitePoolEmail],
  );

  // Helper function to show email update notification
  const showEmailUpdateNotification = React.useCallback((email: string) => {
    const message = email
      ? "OpenAlex polite pool email has been configured."
      : "OpenAlex polite pool email has been cleared.";

    notifications.show({
      title: "Email Updated",
      message,
      color: "green",
      icon: <IconCheck size={ICON_SIZE.MD} />,
    });
  }, []);

  // Helper function to log email save
  const logEmailSave = React.useCallback(
    (email: string) => {
      logger.debug("settings", "Email saved successfully", {
        hasEmail: email.length > 0,
        isValid: isValidEmail(email),
      });
    },
    [isValidEmail],
  );

  const handleEmailSave = React.useCallback(async () => {
    const trimmedEmail = localEmail.trim();
    if (trimmedEmail === "" || isValidEmail(trimmedEmail)) {
      await updateEmailConfig(trimmedEmail);
      setIsEditingEmail(false);
      setShowEmailValidation(false);
      logEmailSave(trimmedEmail);
      showEmailUpdateNotification(trimmedEmail);
    }
  }, [
    localEmail,
    isValidEmail,
    updateEmailConfig,
    logEmailSave,
    showEmailUpdateNotification,
  ]);

  const handleEmailCancel = React.useCallback(() => {
    setLocalEmail(politePoolEmail || "");
    setIsEditingEmail(false);
    setShowEmailValidation(false);
    logger.debug("settings", "Email edit cancelled");
  }, [politePoolEmail]);

  const handleEmailKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleEmailSave();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleEmailCancel();
      }
    },
    [handleEmailSave, handleEmailCancel],
  );

  // API Key handlers
  const handleApiKeyChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setLocalApiKey(value);
    },
    [],
  );

  const handleApiKeySave = React.useCallback(async () => {
    const trimmedApiKey = localApiKey.trim();
    const apiKeyValue = trimmedApiKey === "" ? undefined : trimmedApiKey;
    await setApiKey(apiKeyValue);
    updateOpenAlexApiKey(apiKeyValue);
    setIsEditingApiKey(false);
    logger.debug("settings", "API key saved successfully", {
      hasApiKey: apiKeyValue !== undefined,
    });

    const message = apiKeyValue !== undefined
      ? "OpenAlex API key has been configured."
      : "OpenAlex API key has been cleared.";

    notifications.show({
      title: "API Key Updated",
      message,
      color: "green",
      icon: <IconCheck size={ICON_SIZE.MD} />,
    });
  }, [localApiKey, setApiKey]);

  const handleApiKeyCancel = React.useCallback(() => {
    setLocalApiKey(storedApiKey ?? "");
    setIsEditingApiKey(false);
    logger.debug("settings", "API key edit cancelled");
  }, [storedApiKey]);

  const handleApiKeyKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleApiKeySave();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleApiKeyCancel();
      }
    },
    [handleApiKeySave, handleApiKeyCancel],
  );

  const handleXpacToggle = React.useCallback(async (value: boolean) => {
    setIncludeXpac(value);
    await settingsStoreInstance.setIncludeXpac(value);
    logger.debug("settings", "Xpac setting updated", { includeXpac: value });

    notifications.show({
      title: "Setting Updated",
      message: value
        ? "Extended research outputs (xpac) enabled"
        : "Extended research outputs (xpac) disabled",
      color: "blue",
      icon: <IconCheck size={ICON_SIZE.MD} />,
    });
  }, []);

  const handleDataVersionChange = React.useCallback(async (value: '1' | '2' | undefined) => {
    setDataVersion(value);
    await settingsStoreInstance.setDataVersion(value);
    logger.debug("settings", "Data version setting updated", { dataVersion: value });

    const versionLabel = value === '1' ? "Version 1 (legacy)" : (value === '2' ? "Version 2 (current)" : "Auto (v2 default)");
    notifications.show({
      title: "Data Version Updated",
      message: `OpenAlex data version set to ${versionLabel}`,
      color: "blue",
      icon: <IconCheck size={ICON_SIZE.MD} />,
    });
  }, []);

  const handleBackgroundStrategyChange = React.useCallback(async (value: BackgroundStrategy) => {
    setBackgroundStrategy(value);
    await settingsStoreInstance.setBackgroundStrategy(value);
    logger.debug("settings", "Background strategy setting updated", { backgroundStrategy: value });

    const strategyLabels: Record<BackgroundStrategy, string> = {
      idle: "Idle Callback",
      scheduler: "Scheduler API",
      worker: "Web Worker",
      sync: "Synchronous",
    };
    notifications.show({
      title: "Strategy Updated",
      message: `Background processing strategy set to ${strategyLabels[value]}`,
      color: "blue",
      icon: <IconCheck size={ICON_SIZE.MD} />,
    });
  }, []);

  /**
   * Reset user preferences to defaults
   */
  const handleResetPreferences = async (): Promise<void> => {
    setResetState((previous) => ({ ...previous, resettingPreferences: true }));

    try {
      logger.debug(
        "ui",
        "Starting user preferences reset",
        {},
        "SettingsSection",
      );

      // Clear Zustand persisted stores
      // This will reset layout store, expansion settings, graph store, etc.
      const storeKeys = [
        "layout-state",
        "expansion-settings-state",
        "graph-store-state",
      ];

      for (const key of storeKeys) {
        try {
          localStorage.removeItem(key);
          logger.debug(
            "ui",
            `Cleared persisted store: ${key}`,
            { key },
            "SettingsSection",
          );
        } catch (error) {
          logger.warn(
            "ui",
            `Failed to clear store: ${key}`,
            { key, error },
            "SettingsSection",
          );
        }
      }

      // Layout store state is automatically cleared via localStorage removal
      // The Dexie database will be cleared when the browser is refreshed

      // Clear app metadata
      await clearAppMetadata();

      logger.debug(
        "ui",
        "User preferences reset completed",
        {},
        "SettingsSection",
      );

      notifications.show({
        title: "Preferences Reset",
        message:
          "User preferences have been reset to defaults. Please reload the page to see changes.",
        color: "green",
        icon: <IconRefresh size={ICON_SIZE.MD} />,
      });
    } catch (error) {
      logger.error("ui", "Failed to reset user preferences", { error });
      notifications.show({
        title: "Reset Failed",
        message: "Failed to reset user preferences. Please try again.",
        color: "red",
        icon: <IconAlertTriangle size={ICON_SIZE.MD} />,
      });
    } finally {
      setResetState((previous) => ({ ...previous, resettingPreferences: false }));
    }
  };

  // Helper function to clear query cache
  const clearQueryCache = () => {
    queryClient.clear();
    logger.debug("ui", "TanStack Query cache cleared", {}, "SettingsSection");
  };

  // Helper function to clear cache layers
  const clearCacheLayers = async () => {
    const result = await clearAllCacheLayers();

    const isCacheResult = (
      value: unknown,
    ): value is { clearedLayers?: string[]; errors?: unknown[] } => {
      return value !== null && typeof value === "object";
    };

    logger.debug("ui", "Cache layers cleared", {
      clearedLayers: isCacheResult(result) ? (result.clearedLayers ?? []) : [],
      errors: isCacheResult(result) ? (result.errors ?? []) : [],
    });
  };

  // Helper function to clear app metadata
  const clearMetadata = async () => {
    await clearAppMetadata();
    logger.debug("ui", "App metadata cleared", {}, "SettingsSection");
  };

  // Helper function to clear localStorage data
  const clearLocalStorageData = () => {
    const localStorageKeys = Object.keys(localStorage);
    for (const key of localStorageKeys) {
      if (key.startsWith("bibgraph-") || key.startsWith("mantine-")) {
        try {
          localStorage.removeItem(key);
          logger.debug(
            "ui",
            `Cleared localStorage key: ${key}`,
            { key },
            "SettingsSection",
          );
        } catch (error) {
          logger.warn(
            "ui",
            `Failed to clear localStorage key: ${key}`,
            { key, error },
            "SettingsSection",
          );
        }
      }
    }
  };

  // Helper function to show success notification
  const showSuccessNotification = () => {
    notifications.show({
      title: "Data Cleared",
      message:
        "All cache and user data have been cleared. Please reload the page to see changes.",
      color: "green",
      icon: <IconTrash size={ICON_SIZE.MD} />,
    });
  };

  // Helper function to show error notification
  const showErrorNotification = (error: unknown) => {
    logger.error("ui", "Failed to clear cache and user data", { error });
    notifications.show({
      title: "Clear Failed",
      message: "Failed to clear cache and user data. Please try again.",
      color: "red",
      icon: <IconAlertTriangle size={ICON_SIZE.MD} />,
    });
  };

  /**
   * Clear all cache and user data
   */
  const handleClearAllData = async (): Promise<void> => {
    setResetState((previous) => ({ ...previous, clearingCache: true }));

    try {
      logger.debug("ui", "Starting complete data reset", {}, "SettingsSection");

      clearQueryCache();
      await clearCacheLayers();
      await clearMetadata();
      clearLocalStorageData();

      logger.debug(
        "ui",
        "Complete data reset completed",
        {},
        "SettingsSection",
      );
      showSuccessNotification();
    } catch (error) {
      showErrorNotification(error);
    } finally {
      setResetState((previous) => ({ ...previous, clearingCache: false }));
    }
  };

  const isEmailValid = showEmailValidation ? isValidEmail(localEmail) : true;
  const hasStoredEmail =
    politePoolEmail.length > 0 && isValidEmail(politePoolEmail);

  return (
    <Stack gap="md">
      <Group gap="xs">
        <IconSettings size={ICON_SIZE.MD} />
        <Text size="sm" fw={500}>
          User Preferences
        </Text>
      </Group>

      {/* OpenAlex Polite Pool Email Configuration */}
      <Stack gap="sm">
        <Group gap="xs">
          <IconMail size={ICON_SIZE.MD} />
          <Text size="sm" fw={500}>
            OpenAlex Polite Pool
          </Text>
          <Tooltip
            label="Your email enables faster OpenAlex API responses and is required for Unpaywall PDF lookups on work pages"
            position="right"
            multiline
            w={220}
          >
            <IconInfoCircle
              size={ICON_SIZE.XS}
              style={{ color: "var(--mantine-color-dimmed)" }}
            />
          </Tooltip>
        </Group>

        {isEditingEmail ? (
          <Stack gap="xs">
            <TextInput
              className="ph-no-capture"
              placeholder="your.email@example.com"
              value={localEmail}
              onChange={handleEmailChange}
              onKeyDown={handleEmailKeyDown}
              error={
                showEmailValidation && !isEmailValid
                  ? "Please enter a valid email address"
                  : undefined
              }
              rightSection={
                showEmailValidation ? (
                  isEmailValid ? (
                    <IconCheck
                      size={ICON_SIZE.MD}
                      style={{ color: "var(--mantine-color-green-6)" }}
                    />
                  ) : (
                    <IconX
                      size={ICON_SIZE.MD}
                      style={{ color: "var(--mantine-color-red-6)" }}
                    />
                  )
                ) : null
              }
            />
            <Group gap="sm">
              <Button
                variant="light"
                size="xs"
                onClick={() => {
                  void handleEmailSave();
                }}
                disabled={showEmailValidation && !isEmailValid}
                leftSection={<IconCheck size={ICON_SIZE.SM} />}
              >
                Save
              </Button>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleEmailCancel}
                leftSection={<IconX size={ICON_SIZE.SM} />}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group gap="sm">
            <Text size="sm" {...(hasStoredEmail ? {} : { c: "dimmed" })}>
              {hasStoredEmail ? politePoolEmail : "No email configured"}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setIsEditingEmail(true);
              }}
            >
              {hasStoredEmail ? "Edit" : "Configure"}
            </Button>
          </Group>
        )}

        <Text size="xs" c="dimmed">
          Your email is used for OpenAlex API requests (faster response times)
          and Unpaywall API (PDF lookup for open access papers). It is stored
          locally and only sent to these services when making API requests.
        </Text>
      </Stack>

      <Divider />

      {/* OpenAlex API Key Configuration */}
      <Stack gap="sm">
        <Group gap="xs">
          <IconKey size={ICON_SIZE.MD} />
          <Text size="sm" fw={500}>
            OpenAlex API Key
          </Text>
          <Tooltip
            label="Optional API key for OpenAlex requests. Provides higher rate limits and priority access"
            position="right"
            multiline
            w={200}
          >
            <IconInfoCircle
              size={ICON_SIZE.XS}
              style={{ color: "var(--mantine-color-dimmed)" }}
            />
          </Tooltip>
        </Group>

        {isEditingApiKey ? (
          <Stack gap="xs">
            <TextInput
              className="ph-no-capture"
              type="password"
              placeholder="Enter your OpenAlex API key"
              value={localApiKey}
              onChange={handleApiKeyChange}
              onKeyDown={handleApiKeyKeyDown}
            />
            <Group gap="sm">
              <Button
                variant="light"
                size="xs"
                onClick={() => {
                  void handleApiKeySave();
                }}
                leftSection={<IconCheck size={ICON_SIZE.SM} />}
              >
                Save
              </Button>
              <Button
                variant="subtle"
                size="xs"
                onClick={handleApiKeyCancel}
                leftSection={<IconX size={ICON_SIZE.SM} />}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group gap="sm">
            <Text size="sm" {...(storedApiKey !== undefined && storedApiKey !== "" ? {} : { c: "dimmed" })}>
              {storedApiKey !== undefined && storedApiKey !== "" ? "••••••••••••••••" : "No API key configured"}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setIsEditingApiKey(true);
              }}
            >
              {storedApiKey !== undefined && storedApiKey !== "" ? "Edit" : "Configure"}
            </Button>
          </Group>
        )}

        <Text size="xs" c="dimmed">
          Your API key is stored locally in your browser and is never sent to
          any third parties except OpenAlex.
        </Text>
      </Stack>

      <Divider />

      {/* Xpac Toggle */}
      <XpacToggle
        value={includeXpac}
        onChange={(value: boolean) => {
          void handleXpacToggle(value);
        }}
        showDescription={true}
      />

      <Divider />

      {/* Background Strategy Selector */}
      <BackgroundStrategySelector
        value={backgroundStrategy}
        onChange={(value: BackgroundStrategy) => {
          void handleBackgroundStrategyChange(value);
        }}
        showDescription={true}
      />

      {/* Data Version Selector - Only visible before December 2025 */}
      {isDataVersionSelectorVisible() && (
        <>
          <Divider />
          <DataVersionSelector
            value={dataVersion}
            onChange={(value: '1' | '2' | undefined) => {
              void handleDataVersionChange(value);
            }}
            showDescription={true}
          />
        </>
      )}

      <Divider />

      <Alert
        icon={<IconAlertTriangle size={ICON_SIZE.MD} />}
        title="Warning"
        color="yellow"
        variant="light"
      >
        These actions will modify or clear your saved preferences and data. You
        may need to reload the page after making changes.
      </Alert>

      <Stack gap="sm">
        <Button
          variant="outline"
          leftSection={<IconRefresh size={ICON_SIZE.MD} />}
          onClick={() => void handleResetPreferences()}
          loading={resetState.resettingPreferences}
          disabled={resetState.clearingCache}
          fullWidth
        >
          Reset User Preferences
        </Button>

        <Text size="xs" c="dimmed">
          Reset layout, expansion settings, and other user preferences to
          default values.
        </Text>

        <Button
          variant="outline"
          color="red"
          leftSection={<IconTrash size={ICON_SIZE.MD} />}
          onClick={() => void handleClearAllData()}
          loading={resetState.clearingCache}
          disabled={resetState.resettingPreferences}
          fullWidth
        >
          Clear All Cache & User Data
        </Button>

        <Text size="xs" c="dimmed">
          Clear all cached API data, user preferences, and application state.
          This will reset the app to a fresh state.
        </Text>
      </Stack>
    </Stack>
  );
};
