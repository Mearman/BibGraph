import {
  Box,
  Group,
  type MantineColor,
  Progress,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import {
  IconCheck,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { useCallback,useEffect, useState } from "react";

const ANIMATION_DELAY_MS = 100;
const PROGRESS_PERCENTAGE_MULTIPLIER = 100;

interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  description?: string;
}

interface ProgressIndicatorProperties {
  steps: ProgressStep[];
  currentStep?: number;
  showProgress?: boolean;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  color?: MantineColor;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ProgressIndicator = ({
  steps,
  currentStep = 0,
  showProgress = true,
  orientation = "horizontal",
  size = "md",
  color = "blue",
  animated = true,
  className,
  style,
}: ProgressIndicatorProperties) => {
  const theme = useMantineTheme();
  const [animatedProgress, setAnimatedProgress] = useState(currentStep);

  // Animate progress changes
  useEffect(() => {
    if (!animated) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setAnimatedProgress(currentStep);
    }, ANIMATION_DELAY_MS);
    return () => { clearTimeout(timer); };
  }, [currentStep, animated]);

  const displayProgress = animated ? animatedProgress : currentStep;

  const getStepIcon = useCallback((status: ProgressStep["status"]) => {
    switch (status) {
      case "completed":
        return <IconCheck size={16} />;
      case "error":
        return <IconX size={16} />;
      case "active":
        return <IconLoader2 size={16} className={animated ? "animate-spin" : ""} />;
      case "pending":
        return null;
      default:
        return null;
    }
  }, [animated]);

  const getStepColor = useCallback((status: ProgressStep["status"], _index: number) => {
    switch (status) {
      case "completed":
        return theme.colors.green[6];
      case "error":
        return theme.colors.red[6];
      case "active":
        return theme.colors[color][6];
      case "pending":
        return theme.colors.gray[4];
      default:
        return theme.colors.gray[6];
    }
  }, [color, theme]);

  const getStepBgColor = useCallback((status: ProgressStep["status"], _index: number) => {
    switch (status) {
      case "completed":
        return theme.colors.green[0];
      case "error":
        return theme.colors.red[0];
      case "active":
        return theme.colors[color][0];
      case "pending":
        return theme.colors.gray[0];
      default:
        return theme.colors.gray[0];
    }
  }, [color, theme]);

  const getSizeClasses = useCallback(() => {
    switch (size) {
      case "sm":
        return {
          container: "py-1 px-2",
          icon: "text-xs",
          text: "text-xs",
        };
      case "lg":
        return {
          container: "py-3 px-4",
          icon: "text-lg",
          text: "text-sm",
        };
      case "md":
      default:
        return {
          container: "py-2 px-3",
          icon: "text-sm",
          text: "text-xs",
        };
    }
  }, [size]);

  const progressPercentage = Math.round((displayProgress / (steps.length - 1)) * PROGRESS_PERCENTAGE_MULTIPLIER);

  const renderHorizontal = () => (
    <Stack gap="sm" className={className} style={style}>
      {showProgress && (
        <Progress
          value={progressPercentage}
          color={color}
          size={size === "lg" ? "md" : "sm"}
          animated={animated}
        />
      )}
      <Group gap="xs" style={{ flex: 1 }} justify="space-between">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const hasDescription = Boolean(step.description);

          return (
            <Box
              key={step.id}
              style={{
                flex: 1,
                minWidth: 0,
                position: "relative",
              }}
            >
              {/* Step Number/Icon */}
              <Group gap="xs" align="center" wrap="nowrap">
                <Box
                  className={`${getSizeClasses().container} ${getSizeClasses().icon}`}
                  style={{
                    backgroundColor: getStepBgColor(step.status, index),
                    borderColor: getStepColor(step.status, index),
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderRadius: "50%",
                    color: getStepColor(step.status, index),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "28px",
                    height: "28px",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  {getStepIcon(step.status) ?? (
                    <Text
                      style={{
                        color: getStepColor(step.status, index),
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </Box>

                {/* Step Content */}
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    size="sm"
                    fw={500}
                    style={{
                      color: getStepColor(step.status, index),
                    }}
                  >
                    {step.label}
                  </Text>
                  {hasDescription && (
                    <Text
                      size="xs"
                      c="dimmed"
                      lineClamp={2}
                    >
                      {step.description}
                    </Text>
                  )}
                </Box>
              </Group>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <Box
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "100%",
                    height: "2px",
                    backgroundColor:
                      isCompleted || index < currentStep
                        ? getStepColor("completed", index)
                        : theme.colors.gray[2],
                    transform: "translateY(-50%)",
                    zIndex: 0,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Group>
    </Stack>
  );

  const renderVertical = () => (
    <Stack gap="md" className={className} style={style}>
      <Stack gap="xs" style={{ width: "100%" }}>
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const hasDescription = Boolean(step.description);

          return (
            <Box
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "md",
              }}
            >
              {/* Step Number/Icon */}
              <Box
                className={`${getSizeClasses().container} ${getSizeClasses().icon}`}
                style={{
                  backgroundColor: getStepBgColor(step.status, index),
                  borderColor: getStepColor(step.status, index),
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderRadius: "50%",
                  color: getStepColor(step.status, index),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "32px",
                  height: "32px",
                  fontWeight: 600,
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {getStepIcon(step.status) ?? (
                  <Text
                    style={{
                      color: getStepColor(step.status, index),
                    }}
                  >
                    {index + 1}
                  </Text>
                )}
              </Box>

              {/* Step Content */}
              <Box style={{ flex: 1 }}>
                <Text
                  size="sm"
                  fw={500}
                  style={{
                    color: getStepColor(step.status, index),
                  }}
                >
                  {step.label}
                </Text>
                {hasDescription && (
                  <Text
                    size="xs"
                    c="dimmed"
                    lineClamp={2}
                  >
                    {step.description}
                  </Text>
                )}
              </Box>

              {/* Status Icon for completed steps */}
              {isCompleted && (
                <IconCheck
                  size={20}
                  style={{
                    color: theme.colors.green[6],
                  }}
                />
              )}
              </Box>
          );
        })}

        {/* Vertical Progress */}
        {showProgress && (
          <Box
            style={{
              position: "relative",
              height: "2px",
              backgroundColor: theme.colors.gray[2],
              width: "100%",
              marginTop: "8px",
            }}
          >
            <Box
              style={{
                position: "absolute",
                left: "0",
                top: "0",
                height: "100%",
                width: `${String(progressPercentage)}%`,
                backgroundColor: theme.colors[color][6],
                transition: animated ? "width 0.3s ease" : "none",
              }}
            />
          </Box>
        )}
      </Stack>
    </Stack>
  );

  return orientation === "vertical" ? renderVertical() : renderHorizontal();
};

// Quick preset for common progress scenarios
export const ProgressPresets: Record<"dataLoading" | "searchWorkflow" | "fileUpload", ProgressStep[]> = {
  // Data loading
  dataLoading: [
    { id: "1", label: "Fetching data", status: "active", description: "Loading from OpenAlex API" },
    { id: "2", label: "Processing", status: "pending", description: "Analyzing results" },
    { id: "3", label: "Rendering", status: "pending", description: "Preparing display" },
  ],

  // Search workflow
  searchWorkflow: [
    { id: "1", label: "Validating query", status: "pending" },
    { id: "2", label: "Searching", status: "pending" },
    { id: "3", label: "Processing results", status: "pending" },
    { id: "4", label: "Displaying", status: "pending" },
  ],

  // File upload
  fileUpload: [
    { id: "1", label: "Validating file", status: "pending" },
    { id: "2", label: "Uploading", status: "pending" },
    { id: "3", label: "Processing", status: "pending" },
    { id: "4", label: "Complete", status: "pending" },
  ],
};

// Hook for common progress scenarios
export const useProgressIndicator = (
  preset: keyof typeof ProgressPresets
) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(ProgressPresets[preset]);

  const nextStep = useCallback(() => {
    setCurrentStep(previous => Math.min(previous + 1, steps.length - 1));
  }, [steps.length]);

  const resetProgress = useCallback(() => {
    setCurrentStep(0);
    setSteps(steps.map(step => ({ ...step, status: "pending" })));
  }, [steps]);

  const markStepCompleted = useCallback((stepId: string) => {
    setSteps(previous =>
      previous.map(step =>
        step.id === stepId ? { ...step, status: "completed" as const } : step
      )
    );
  }, []);

  const markStepError = useCallback((stepId: string, error?: string) => {
    setSteps(previous =>
      previous.map(step =>
        step.id === stepId
          ? { ...step, status: "error" as const, description: error ?? step.description }
          : step
      )
    );
    }, []);

  const markStepActive = useCallback((stepId: string) => {
      const stepIndex = steps.findIndex(s => s.id === stepId);
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
        setSteps(previous =>
          previous.map((step, index) => ({
            ...step,
            status: index === stepIndex ? "active" : step.status === "active" ? "completed" : "pending",
          }))
        );
      }
    }, [steps]);

  return {
    steps,
    currentStep,
    progress: Math.round((currentStep / (steps.length - 1)) * PROGRESS_PERCENTAGE_MULTIPLIER),
    nextStep,
    resetProgress,
    markStepCompleted,
    markStepError,
    markStepActive,
    updateStep: (stepId: string, updates: Readonly<Partial<ProgressStep>>) => {
      setSteps(previous =>
        previous.map(step =>
          step.id === stepId ? { ...step, ...updates } : step
        )
      );
    },
  };
};