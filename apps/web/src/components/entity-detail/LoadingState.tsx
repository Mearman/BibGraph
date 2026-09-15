import { isEntityType } from "@bibgraph/types";
import { useLiveRegion, useReducedMotion } from "@bibgraph/ui";
import { logger } from "@bibgraph/utils";
import { Alert, Badge,Code, Container, Flex, Group, Loader, Paper, Progress, Skeleton, Stack, Text, Title } from "@mantine/core";
import React, { useEffect,useRef,useState } from "react";

import { BORDER_STYLE_GRAY_3, LOADING_CONSTANTS } from "@/config/style-constants";

import type { EntityTypeConfig } from "./EntityTypeConfig";
import { getMantineColor } from "./EntityTypeConfig";

interface LoadingStateProperties {
  entityType: string;
  entityId: string;
  config: EntityTypeConfig;
  operation?: string;
  showProgress?: boolean;
  estimatedDuration?: number; // in milliseconds
}

interface LoadingStep {
  id: string;
  label: string;
  estimatedTime: number; // percentage of total time
}

const PERCENT_SCALE = 100;
const MS_PER_SECOND = 1000;

// Define loading steps for entity detail pages
const getLoadingSteps = (entityType: string): LoadingStep[] => {
  const baseSteps = [
    { id: 'fetch', label: `Fetching ${entityType} data`, estimatedTime: 30 },
    { id: 'process', label: 'Processing information', estimatedTime: 20 },
    { id: 'relationships', label: 'Loading relationships', estimatedTime: 30 },
    { id: 'finalize', label: 'Finalizing display', estimatedTime: 20 },
  ];

  // Adjust steps based on entity type complexity
  if (['authors', 'works'].includes(entityType)) {
    return baseSteps;
  }
  if (['institutions', 'sources'].includes(entityType)) {
    return [
      { id: 'fetch', label: `Fetching ${entityType} data`, estimatedTime: 40 },
      { id: 'process', label: 'Processing information', estimatedTime: 30 },
      { id: 'finalize', label: 'Finalizing display', estimatedTime: 30 },
    ];
  }
  return [
    { id: 'fetch', label: `Fetching ${entityType} data`, estimatedTime: 60 },
    { id: 'finalize', label: 'Finalizing display', estimatedTime: 40 },
  ];
};

export const LoadingState = ({
  entityType,
  entityId,
  config: _config,
  operation = "load",
  showProgress = true,
  estimatedDuration = 3000 // Default 3 seconds
}: LoadingStateProperties) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [lastAnnouncedStep, setLastAnnouncedStep] = useState(-1);
  const loaderColor = isEntityType(entityType) ? getMantineColor(entityType) : 'blue';
  const steps = getLoadingSteps(entityType);

  // Accessibility hooks
  const { announce, LiveRegionComponent } = useLiveRegion();
  const isPrefersReducedMotion = useReducedMotion();
  const loadingElementRef = useRef<HTMLDivElement>(null);

  // Simulate progress with accessibility announcements
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(previous => previous + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);

      // Calculate progress based on elapsed time and steps
      const progressPercentage = Math.min(
        (timeElapsed / estimatedDuration) * PERCENT_SCALE,
        LOADING_CONSTANTS.MAX_PROGRESS_PERCENT
      );

      setProgress(progressPercentage);

      // Update current step based on progress
      let cumulativeTime = 0;
      let newStep = 0;
      for (let index = 0; index < steps.length; index++) {
        cumulativeTime += (steps[index].estimatedTime / PERCENT_SCALE) * estimatedDuration;
        if (timeElapsed < cumulativeTime) {
          newStep = index;
          break;
        }
      }

      setCurrentStep(newStep);

      // Announce step changes to screen readers
      if (newStep !== lastAnnouncedStep && newStep < steps.length) {
        const step = steps[newStep];
        announce(
          `Loading ${entityType}: ${step.label}. ${String(Math.round(progressPercentage))}% complete.`,
          'polite'
        );
        setLastAnnouncedStep(newStep);
      }
    }, LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);

    return () => { clearInterval(interval); };
  }, [timeElapsed, estimatedDuration, steps, entityType, lastAnnouncedStep, announce]);

  // Debug logging
  logger.debug("ui", "LoadingState rendering", {
    entityType,
    operation,
    progress,
    currentStep: steps[currentStep]?.label
  });

  // Generate loading tip
  const getLoadingTip = () => {
    const tips = [
      "Large datasets may take longer to load",
      "Network conditions can affect loading speed",
      "Complex relationships require additional processing time",
      "Loading optimized data for better performance",
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  return (
    <>
      {/* Live region for screen reader announcements */}
      <LiveRegionComponent />

      <Container
        size="md"
        p="xl"
        data-testid="loading-state"
        ref={loadingElementRef}
        role="status"
        aria-live="polite"
        aria-label={`Loading ${entityType}`}
      >
        <Flex h="100vh" justify="center" align="center">
          <Paper
            p="xl"
            radius="xl"
            style={{ border: BORDER_STYLE_GRAY_3 }}
            w="100%"
            maw="48rem"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${operation} ${entityType} progress`}
          >
          <Stack gap="xl">
            {/* Header */}
            <Group justify="center" gap="md">
              <Loader size="xl" color={loaderColor} />
              <div>
                <Title order={2} c={loaderColor}>
                  {operation === 'load' ? 'Loading' : operation} {entityType}...
                </Title>
                <Text size="sm" c="dimmed" ta="center">
                  {steps[currentStep]?.label}
                </Text>
              </div>
            </Group>

            {/* Progress Section */}
            {showProgress && (
              <Stack gap="md">
                {/* Overall Progress Bar */}
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>Progress</Text>
                    <Text size="sm" c="dimmed">{Math.round(progress)}%</Text>
                  </Group>
                  <Progress
                    value={progress}
                    color={loaderColor}
                    size="md"
                    radius="md"
                    animated={!isPrefersReducedMotion}
                  />
                </Stack>

                {/* Step Indicators */}
                <Group gap="xs" wrap="nowrap">
                  {steps.map((step, index) => (
                    <Badge
                      key={step.id}
                      variant={index <= currentStep ? "filled" : "outline"}
                      color={index <= currentStep ? loaderColor : "gray"}
                      size="sm"
                      style={{ flex: 1 }}
                    >
                      {step.label}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}

            {/* Entity Information */}
            <Stack gap="xs" w="100%">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {entityType} ID:
              </Text>
              <Code style={{ wordBreak: "break-all" }}>
                {entityId}
              </Code>
            </Stack>

            {/* Content Preview Skeleton */}
            <Stack gap="md">
              <Text size="sm" fw={500} c="dimmed">Preview:</Text>
              <Stack gap="xs">
                {/* Title skeleton */}
                <Skeleton height={24} width="60%" radius="md" />

                {/* Metadata skeleton */}
                <Group gap="sm">
                  <Skeleton height={16} width="20%" radius="sm" />
                  <Skeleton height={16} width="15%" radius="sm" />
                  <Skeleton height={16} width="25%" radius="sm" />
                </Group>

                {/* Description skeleton */}
                <Skeleton height={12} width="100%" radius="sm" />
                <Skeleton height={12} width="95%" radius="sm" />
                <Skeleton height={12} width="85%" radius="sm" />
              </Stack>
            </Stack>

            {/* Tips Section */}
            <Alert variant="light" color="blue" radius="md">
              <Text size="sm">
                <strong>Tip:</strong> {getLoadingTip()}
              </Text>
            </Alert>

            {/* Time Information */}
            <Group justify="center" gap="md">
              <Text size="xs" c="dimmed">
                Time elapsed: {(timeElapsed / MS_PER_SECOND).toFixed(1)}s
              </Text>
              <Text size="xs" c="dimmed">
                Estimated: {(estimatedDuration / MS_PER_SECOND).toFixed(1)}s
              </Text>
            </Group>
          </Stack>
        </Paper>
      </Flex>
    </Container>
    </>
  );
};