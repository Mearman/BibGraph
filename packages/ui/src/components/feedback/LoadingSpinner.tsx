import { Group, Loader, Stack, Text } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";
import React, { useState } from "react";

export interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  message?: string;
  showProgress?: boolean;
  progress?: number;
  variant?: "dots" | "bars" | "oval";
}

export const LoadingSpinner = ({
  size = "md",
  message,
  showProgress = false,
  progress,
  variant = "oval"
}: LoadingSpinnerProps) => {
  const loaderSize = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32
  }[size];

  return (
    <Stack gap="sm" align="center">
      <Group gap="xs">
        <Loader size={loaderSize} type={variant} />
        {showProgress && typeof progress === "number" && (
          <Text size="sm" c="dimmed">
            {Math.round(progress)}%
          </Text>
        )}
      </Group>
      {message !== undefined && message !== "" && (
        <Text size={size} c="dimmed" ta="center">
          {message}
        </Text>
      )}
    </Stack>
  );
};

export interface SearchLoadingSpinnerProps {
  message?: string;
  showEta?: boolean;
  step?: string;
}

export const SearchLoadingSpinner = ({
  message = "Searching academic database...",
  showEta = true,
  step
}: SearchLoadingSpinnerProps) => {
  const searchSteps = [
    "Validating search query",
    "Connecting to OpenAlex API",
    "Fetching search results",
    "Processing academic data",
    "Preparing results display"
  ];

  const [randomStep] = useState(() => searchSteps[Math.floor(Math.random() * searchSteps.length)]);
  const currentStep = step ?? randomStep;

  return (
    <>
      <style>{`
        @keyframes loading-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(200%); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .search-loading-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <Stack gap="md" align="center" p="lg">
        <Group gap="sm">
          <IconLoader size={24} className="search-loading-spinner" />
          <Text size="lg" fw={500} c="blue">
            {message}
          </Text>
        </Group>

        <Stack gap="xs" align="center">
          <Text size="sm" c="dimmed">
            {currentStep}
          </Text>
          {showEta && (
            <Text size="xs" c="dimmed" opacity={0.7}>
              This usually takes a few seconds...
            </Text>
          )}
        </Stack>

        <div style={{
          width: "200px",
          height: "4px",
          backgroundColor: "var(--mantine-color-gray-2)",
          borderRadius: "2px",
          overflow: "hidden"
        }}>
          <div
            style={{
              width: "60%",
              height: "100%",
              backgroundColor: "var(--mantine-color-blue-6)",
              borderRadius: "2px",
              animation: "loading-progress 1.5s ease-in-out infinite"
            }}
          />
        </div>
      </Stack>
    </>
  );
};