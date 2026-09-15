import { Alert, Badge, Button, Card, Group, Progress, Stack, Text } from "@mantine/core";
import {
  IconArrowBack,
  IconBug,
  IconClock,
  IconCloudOff,
  IconDatabaseOff,
  IconHome,
  IconRefresh,
  IconServerOff,
  IconWifiOff} from "@tabler/icons-react";
import type { ReactNode } from "react";

const DEFAULT_ERROR_SUGGESTIONS: ErrorSuggestion[] = [];
const MS_PER_SECOND = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const RETRY_PROGRESS_PERCENTAGE_MULTIPLIER = 100;

export interface ErrorRecoveryProps {
  error: unknown;
  onRetry?: () => void;
  onRetryWithExponentialBackoff?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  retryCount?: number;
  maxRetries?: number;
  isRetrying?: boolean;
  className?: string;
  context?: {
    operation?: string;
    entity?: string;
    entityId?: string;
  };
  errorSuggestions?: ErrorSuggestion[];
}

export interface ErrorSuggestion {
  action: string;
  label: string;
  description: string;
  icon: ReactNode;
  onAction: () => void;
}

const getErrorType = (error: unknown): {
  type: 'network' | 'server' | 'timeout' | 'rate-limit' | 'database' | 'unknown';
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
} => {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
    return {
      type: 'network',
      title: 'Network Error',
      description: 'Unable to connect to the server. Check your internet connection.',
      icon: <IconWifiOff size={20} />,
      color: 'orange'
    };
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      type: 'timeout',
      title: 'Request Timeout',
      description: 'The request took too long to complete. The server may be busy.',
      icon: <IconClock size={20} />,
      color: 'yellow'
    };
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') || errorMessage.includes('429')) {
    return {
      type: 'rate-limit',
      title: 'Rate Limited',
      description: 'Too many requests. Please wait a moment before trying again.',
      icon: <IconCloudOff size={20} />,
      color: 'blue'
    };
  }

  if (errorMessage.includes('database') || errorMessage.includes('503') || errorMessage.includes('service unavailable')) {
    return {
      type: 'server',
      title: 'Service Unavailable',
      description: 'The service is temporarily unavailable. Please try again later.',
      icon: <IconServerOff size={20} />,
      color: 'red'
    };
  }

  if (errorMessage.includes('database') || errorMessage.includes('storage')) {
    return {
      type: 'database',
      title: 'Database Error',
      description: 'There was an issue accessing the data. This is usually temporary.',
      icon: <IconDatabaseOff size={20} />,
      color: 'pink'
    };
  }

  return {
    type: 'unknown',
    title: 'Unexpected Error',
    description: 'An unexpected error occurred. We\'re working to fix this issue.',
    icon: <IconBug size={20} />,
    color: 'gray'
  };
};

const getRetryDelay = (retryCount: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  return Math.min(Math.pow(2, retryCount) * MS_PER_SECOND, MAX_RETRY_DELAY_MS);
};

const getRetryText = (retryCount: number, maxRetries: number): string => {
  if (retryCount === 0) return 'Retry';
  if (retryCount >= maxRetries) return 'Retry Limit Reached';
  return `Retry (${String(retryCount)}/${String(maxRetries)})`;
};

export const ErrorRecovery = ({
  error,
  onRetry,
  onRetryWithExponentialBackoff,
  onGoHome,
  onGoBack,
  retryCount = 0,
  maxRetries = 3,
  isRetrying = false,
  className,
  context,
  errorSuggestions = DEFAULT_ERROR_SUGGESTIONS
}: ErrorRecoveryProps) => {
  const errorInfo = getErrorType(error);
  const retryDelay = getRetryDelay(retryCount);
  const canRetry = retryCount < maxRetries;
  const shouldShowExponentialRetry = ['timeout', 'server', 'rate-limit'].includes(errorInfo.type);

  const formatErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      // Only show user-friendly error messages, hide technical details
      const technicalPatterns = [
        /at /,
        /node_modules/,
        /\.js:\d+:\d+/,
        /stack trace/i,
        /internal server error/i
      ];

      const isTechnical = technicalPatterns.some(pattern => pattern.test(err.message));
      if (isTechnical) {
        return 'A technical error occurred. Please try again.';
      }

      return err.message;
    }
    return String(err);
  };

  const renderRetrySection = () => {
    if (!onRetry && !onRetryWithExponentialBackoff) return null;

    return (
      <Stack gap="sm">
        {canRetry && (
          <>
            <Group gap="sm">
              <Button
                variant="filled"
                color="blue"
                onClick={onRetry}
                loading={isRetrying}
                leftSection={<IconRefresh size={16} />}
                disabled={isRetrying}
              >
                {getRetryText(retryCount, maxRetries)}
              </Button>

              {shouldShowExponentialRetry && onRetryWithExponentialBackoff && (
                <Button
                  variant="outline"
                  color="gray"
                  onClick={onRetryWithExponentialBackoff}
                  loading={isRetrying}
                  disabled={isRetrying}
                  size="sm"
                >
                  Smart Retry
                </Button>
              )}
            </Group>

            {retryCount > 0 && (
              <Text size="xs" c="dimmed">
                {shouldShowExponentialRetry
                  ? `Next retry will wait ${String(retryDelay / MS_PER_SECOND)}s to avoid overwhelming the server.`
                  : `${String(retryCount)} retry attempt${retryCount > 1 ? 's' : ''} made.`
                }
              </Text>
            )}
          </>
        )}

        {!canRetry && (
          <Alert variant="light" color="orange">
            <Text size="sm">
              Maximum retry attempts reached. Please try again later or contact support if the problem persists.
            </Text>
          </Alert>
        )}

        {retryCount > 0 && (
          <div>
            <Text size="xs" c="dimmed" mb="xs">Retry Progress</Text>
            <Progress
              value={(retryCount / maxRetries) * RETRY_PROGRESS_PERCENTAGE_MULTIPLIER}
              color={canRetry ? "blue" : "orange"}
              size="xs"
            />
          </div>
        )}
      </Stack>
    );
  };

  const renderContext = () => {
    if (!context) return null;

    return (
      <Card p="md" radius="md" bg="var(--mantine-color-gray-0)" style={{ border: '1px solid var(--mantine-color-gray-2)' }}>
        <Stack gap="xs">
          <Text size="sm" fw={600} c="dimmed">Context</Text>
          {context.operation !== undefined && context.operation !== "" && (
            <Group gap="xs">
              <Text size="xs" c="dimmed" miw={80}>Operation:</Text>
              <Text size="xs">{context.operation}</Text>
            </Group>
          )}
          {context.entity !== undefined && context.entity !== "" && (
            <Group gap="xs">
              <Text size="xs" c="dimmed" miw={80}>Entity:</Text>
              <Text size="xs">{context.entity}</Text>
            </Group>
          )}
          {context.entityId !== undefined && context.entityId !== "" && (
            <Group gap="xs">
              <Text size="xs" c="dimmed" miw={80}>ID:</Text>
              <Text size="xs" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {context.entityId}
              </Text>
            </Group>
          )}
        </Stack>
      </Card>
    );
  };

  const renderSuggestions = () => {
    const defaultSuggestions: ErrorSuggestion[] = [];

    if (errorInfo.type === 'network') {
      defaultSuggestions.push({
        action: 'check-connection',
        label: 'Check Connection',
        description: 'Verify your internet connection',
        icon: <IconWifiOff size={16} />,
        onAction: () => {
          // Could open network diagnostics or suggest checking connection
          window.location.reload();
        }
      });
    }

    if (onGoHome) {
      defaultSuggestions.push({
        action: 'go-home',
        label: 'Go Home',
        description: 'Return to the main page',
        icon: <IconHome size={16} />,
        onAction: onGoHome
      });
    }

    if (onGoBack) {
      defaultSuggestions.push({
        action: 'go-back',
        label: 'Go Back',
        description: 'Return to the previous page',
        icon: <IconArrowBack size={16} />,
        onAction: onGoBack
      });
    }

    const allSuggestions = [...defaultSuggestions, ...errorSuggestions];

    if (allSuggestions.length === 0) return null;

    return (
      <Stack gap="sm">
        <Text size="sm" fw={600} c="dimmed">Suggested Actions</Text>
        <Group gap="sm">
          {allSuggestions.map((suggestion) => (
            <Button
              key={suggestion.action}
              variant="light"
              color="gray"
              size="sm"
              leftSection={suggestion.icon}
              onClick={suggestion.onAction}
            >
              {suggestion.label}
            </Button>
          ))}
        </Group>
      </Stack>
    );
  };

  return (
    <Card
      style={{ border: `1px solid var(--mantine-color-${errorInfo.color}-2)` }}
      className={className}
      p="lg"
    >
      <Stack gap="md">
        {/* Error Header */}
        <Group gap="sm">
          <Alert
            icon={errorInfo.icon}
            title={errorInfo.title}
            color={errorInfo.color}
            variant="light"
            style={{ flex: 1 }}
          >
            <Text size="sm">
              {errorInfo.description}
            </Text>
          </Alert>
        </Group>

        {/* Error Details */}
        <Card p="md" radius="md" bg="var(--mantine-color-gray-0)" style={{ border: '1px solid var(--mantine-color-gray-2)' }}>
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={600} c="dimmed">Error Details</Text>
              <Badge size="xs" color={errorInfo.color} variant="light">
                {errorInfo.type}
              </Badge>
            </Group>
            <Text size="sm" c="var(--mantine-color-red-8)">
              {formatErrorMessage(error)}
            </Text>
            {context && renderContext()}
          </Stack>
        </Card>

        {/* Retry Section */}
        {renderRetrySection()}

        {/* Suggestions */}
        {renderSuggestions()}

        {/* Technical Details (for debugging) */}
        {process.env.NODE_ENV === 'development' && error instanceof Error && error.stack !== undefined && error.stack !== "" && (
          <Card p="md" radius="md" bg="var(--mantine-color-gray-0)" style={{ border: '1px solid var(--mantine-color-gray-2)' }}>
            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed">Technical Details (Development Only)</Text>
              <Text
                size="xs"
                component="pre"
                style={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}
              >
                {error.stack}
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  );
};