/**
 * Error Boundary Component
 *
 * Provides graceful error handling for React components with
 * user-friendly error messages and recovery options.
 */

import { ActionIcon, Alert, Button, Container, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCopy, IconHome, IconKeyboard,IconRefresh } from '@tabler/icons-react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProperties {
  children: ReactNode;
  fallback?: (error: Error, errorId: string, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: Readonly<ErrorInfo>, errorId: string) => void;
  showRetry?: boolean;
  showDetails?: boolean;
  title?: string;
  description?: string;
}

/**
 * Enhanced error reporting with context aggregation
 */
interface ErrorReport {
  errorId: string;
  error: Error;
  errorInfo?: ErrorInfo;
  userAgent: string;
  url: string;
  timestamp: number;
  context?: string;
  componentStack?: string;
}

const ERROR_STORAGE_KEY = 'bibgraph_errors';
const MAX_STORED_ERRORS = 10;
const RANDOM_ID_RADIX = 36;
const RANDOM_ID_LENGTH = 11;
const COPY_FEEDBACK_RESET_DELAY_MS = 2000;

/**
Generates a unique, timestamp-prefixed error identifier for correlating a boundary catch with its stored report.
 */
const generateErrorId = (): string =>
  `err_${String(Date.now())}_${Math.random().toString(RANDOM_ID_RADIX).slice(2, RANDOM_ID_LENGTH)}`;

const isErrorReportArray = (value: unknown): value is ErrorReport[] => Array.isArray(value);

/**
Reads the persisted error report list from localStorage, defaulting to an empty list on missing or malformed data.
 */
const readStoredErrors = (): ErrorReport[] => {
  try {
    const raw = localStorage.getItem(ERROR_STORAGE_KEY) ?? '[]';
    const parsed: unknown = JSON.parse(raw);
    return isErrorReportArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
Appends a report to the persisted error list, trimming to the most recent entries to bound storage growth.
 */
const appendStoredError = (report: ErrorReport): void => {
  try {
    const existingErrors = readStoredErrors();
    existingErrors.push(report);
    const recentErrors = existingErrors.slice(-MAX_STORED_ERRORS);
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(recentErrors));
  } catch (storageError) {
    console.warn('Failed to store error report:', storageError);
  }
};

/**
 * Error Boundary component that catches and handles React errors gracefully
 */
export class ErrorBoundary extends Component<ErrorBoundaryProperties, ErrorBoundaryState> {
  constructor(properties: ErrorBoundaryProperties) {
    super(properties);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: Readonly<ErrorInfo>): void {
    this.setState({
      error,
      errorInfo,
    });

    // Enhanced error reporting
    const errorReport: ErrorReport = {
      errorId: this.state.errorId,
      error,
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
      componentStack: errorInfo.componentStack ?? undefined,
    };

    // Store error for debugging
    appendStoredError(errorReport);

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId);
    }

    // Log to console in development with enhanced context
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', {
        error,
        errorInfo,
        errorId: this.state.errorId,
        errorReport,
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleGoHome = (): void => {
    window.location.assign('/');
  };

  handleCopyErrorDetails = (): void => {
    const errorDetails = {
      errorId: this.state.errorId,
      errorMessage: this.state.error?.message,
      errorStack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    const errorText = JSON.stringify(errorDetails, null, 2);

    navigator.clipboard.writeText(errorText).then(() => {
      // Show success feedback briefly
      const originalText = document.title;
      document.title = 'Error details copied!';
      setTimeout(() => {
        document.title = originalText;
      }, COPY_FEEDBACK_RESET_DELAY_MS);
      return undefined; // Explicit return for promise chain
    }).catch((error: unknown) => {
      console.error('Failed to copy error details:', error);
    });
  };

  componentDidUpdate(previousProperties: ErrorBoundaryProperties, previousState: ErrorBoundaryState): void {
    // Add keyboard shortcuts when error occurs, remove when resolved
    if (!previousState.hasError && this.state.hasError) {
      this.handleKeyPress = this.handleKeyPress.bind(this);
      window.addEventListener('keydown', this.handleKeyPress);
    } else if (previousState.hasError && !this.state.hasError) {
      window.removeEventListener('keydown', this.handleKeyPress);
    }
  }

  componentWillUnmount(): void {
    if (this.state.hasError) {
      window.removeEventListener('keydown', this.handleKeyPress);
    }
  }

  private handleKeyPress = (event: KeyboardEvent): void => {
    if (event.key === 'r' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.handleReset();
    } else if (event.key === 'c' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
      event.preventDefault();
      this.handleCopyErrorDetails();
    } else if (event.key === 'h' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.handleGoHome();
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorId, this.handleReset);
      }

      // Default error UI
      return (
        <Container size="sm" py="xl">
          <Paper withBorder p="xl" radius="md">
            <Stack align="center" gap="md">
              <IconAlertTriangle size={48} color="red" />

              <Title order={2} c="red" ta="center">
                {this.props.title ?? 'Something went wrong'}
              </Title>

              <Text c="dimmed" ta="center" size="lg">
                {this.props.description ?? 'An unexpected error occurred while loading this component.'}
              </Text>

              {this.props.showDetails === true && process.env.NODE_ENV === 'development' && (
                <Alert
                  variant="light"
                  color="red"
                  title="Error Details"
                  icon={<IconAlertTriangle size={16} />}
                >
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Error ID: {this.state.errorId}
                    </Text>
                    <Text size="sm" component="pre" style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      {this.state.error.message}
                    </Text>
                    {this.state.error.stack !== undefined && (
                      <Text size="sm" component="pre" style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {this.state.error.stack}
                      </Text>
                    )}
                  </Stack>
                </Alert>
              )}

              <Group gap="sm">
                {this.props.showRetry === true && (
                  <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={this.handleReset}
                    variant="filled"
                  >
                    Try Again
                  </Button>
                )}

                <Button
                  leftSection={<IconHome size={16} />}
                  onClick={this.handleGoHome}
                  variant="light"
                >
                  Go Home
                </Button>

                <Tooltip label="Copy error details (Ctrl+Shift+C)">
                  <ActionIcon
                    variant="light"
                    onClick={this.handleCopyErrorDetails}
                  >
                    <IconCopy size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Keyboard shortcuts: Ctrl+R (Retry), Ctrl+H (Home), Ctrl+Shift+C (Copy)">
                  <ActionIcon
                    variant="light"
                  >
                    <IconKeyboard size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              <Text size="xs" c="dimmed">
                Error ID: {this.state.errorId}
              </Text>
            </Stack>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

/**
 * Error handler utility for functional components to handle errors within their scope
 */
export const createErrorHandler = () => {
  const reportError = (error: Error, context?: string) => {
    const errorReport: ErrorReport = {
      errorId: generateErrorId(),
      error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
      context,
    };

    console.error(`Error in ${context ?? 'component'}:`, errorReport);

    // Store in localStorage for debugging
    appendStoredError(errorReport);

    // Here you could add integration with error reporting services like Sentry, LogRocket, PostHog, etc.
  };

  const getStoredErrors = (): ErrorReport[] => readStoredErrors();

  const clearStoredErrors = (): void => {
    localStorage.removeItem(ERROR_STORAGE_KEY);
  };

  return { reportError, getStoredErrors, clearStoredErrors };
};

/**
 * Error handler utility for functional components to handle errors within their scope
 */
export const createErrorHandlerHook = () => {
  const errorHandlers = createErrorHandler();

  return { reportError: errorHandlers.reportError };
};

/**
 * Minimal error boundary for inline components
 */
interface InlineErrorBoundaryProperties {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

const DEFAULT_FALLBACK = <Text c="red" size="sm">Failed to load content</Text>;

export const InlineErrorBoundary = ({
  children,
  fallback = DEFAULT_FALLBACK,
  onError,
}: InlineErrorBoundaryProperties) => {
  return (
    <ErrorBoundary
      fallback={(error, errorId, reset) => (
        <Alert
          variant="light"
          color="red"
          title="Component Error"
          icon={<IconAlertTriangle size={14} />}
        >
          <Stack gap="xs">
            <Text size="sm">{fallback}</Text>
            <Button size="compact" onClick={reset}>
              Retry
            </Button>
          </Stack>
        </Alert>
      )}
      onError={onError ? (error, _errorInfo, _errorId) => { onError(error); } : undefined}
      showRetry={true}
      showDetails={false}
      title=""
      description=""
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error boundary specifically for async components
 */
export const AsyncErrorBoundary = ({
  children,
  ...props
}: Omit<ErrorBoundaryProperties, 'title' | 'description'>) => {
  return (
    <ErrorBoundary
      {...props}
      title="Loading Failed"
      description="The component failed to load its data. Please try again."
    >
      {children}
    </ErrorBoundary>
  );
};

// No default export - use named exports from the class declaration above