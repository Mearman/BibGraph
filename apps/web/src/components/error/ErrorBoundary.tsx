/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree below it.
 * Logs errors and displays a fallback UI instead of crashing the entire app.
 */

import { logger } from '@bibgraph/utils/logger';
import {
  Alert,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBug,
  IconHome,
  IconRefresh,
} from '@tabler/icons-react';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

import { CHUNK_LOAD_ERROR_TITLE, isChunkLoadError } from './chunk-load-error';

interface ErrorBoundaryProperties {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: Readonly<ErrorInfo>) => void;
  className?: ClassValue;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /**
   * Incremented on every reset so the children remount: without a new key React reuses the crashed subtree and stale render state.
   */
  resetCount: number;
}

/**
 * Error Boundary Class Component
 *
 * Class components are required for Error Boundaries as they need
 * the static getDerivedStateFromError and componentDidCatch lifecycles.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProperties,
  ErrorBoundaryState
> {
  constructor(properties: ErrorBoundaryProperties) {
    super(properties);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: Readonly<ErrorInfo>): void {
    // Log the error
    logger.error(
      'error-boundary',
      'ErrorBoundary caught an error',
      {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      'ErrorBoundary'
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState((previous) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetCount: previous.resetCount + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      // Default fallback UI
      const { error, errorInfo } = this.state;

      // A failed dynamic import (lazy route chunk) cannot be recovered by remounting: the module registry caches the rejected import for the session, so offer the one action that actually works, a full reload.
      if (isChunkLoadError(error)) {
        return (
          <Container size="md" py="xl" className={clsx(this.props.className)}>
            <Stack gap="md" align="center">
              <Alert
                icon={<IconAlertTriangle size={ICON_SIZE.XL} />}
                title={CHUNK_LOAD_ERROR_TITLE}
                color="orange"
                variant="light"
              >
                <Text size="sm">
                  Part of the app failed to download. Check your connection, then reload the page.
                </Text>
              </Alert>
              <Group>
                <Button
                  leftSection={<IconRefresh size={ICON_SIZE.MD} />}
                  onClick={() => { window.location.reload(); }}
                  variant="filled"
                >
                  Reload
                </Button>
                <Button
                  leftSection={<IconHome size={ICON_SIZE.MD} />}
                  component="a"
                  href="#/"
                  variant="light"
                >
                  Go Home
                </Button>
              </Group>
            </Stack>
          </Container>
        );
      }

      return (
        <Container
          size="md"
          py="xl"
          className={clsx(this.props.className)}
        >
          <Stack gap="lg" align="center">
            <Alert
              icon={<IconAlertTriangle size={ICON_SIZE.XL} />}
              title="Something went wrong"
              color="red"
              variant="light"
            >
              <Text size="sm">
                An unexpected error occurred while rendering this component.
                The error has been logged for debugging purposes.
              </Text>
            </Alert>

            {error && (
              <Stack gap="xs" style={{ width: '100%' }}>
                <Title order={4}>Error Details</Title>
                <Text
                  size="sm"
                  c="red"
                  style={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {error.message}
                </Text>

                {error.stack !== undefined && (
                  <details>
                    <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                      <Text size="xs" c="dimmed">
                        Show stack trace
                      </Text>
                    </summary>
                    <Text
                      size="xs"
                      style={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        marginTop: '8px',
                        color: 'var(--mantine-color-dimmed)',
                      }}
                    >
                      {error.stack}
                    </Text>
                  </details>
                )}
              </Stack>
            )}

            {errorInfo && (
              <details>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                  <Text size="xs" c="dimmed">
                    Show component stack
                  </Text>
                </summary>
                <Text
                  size="xs"
                  style={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginTop: '8px',
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  {errorInfo.componentStack}
                </Text>
              </details>
            )}

            <Group>
              <Button
                leftSection={<IconRefresh size={ICON_SIZE.MD} />}
                onClick={this.handleReset}
                variant="filled"
              >
                Try Again
              </Button>
              <Button
                leftSection={<IconHome size={ICON_SIZE.MD} />}
                component="a"
                href="#/"
                variant="light"
              >
                Go Home
              </Button>
              <Button
                leftSection={<IconBug size={ICON_SIZE.MD} />}
                onClick={() => { window.location.reload(); }}
                variant="outline"
                color="gray"
              >
                Reload Page
              </Button>
            </Group>
          </Stack>
        </Container>
      );
    }

    return <React.Fragment key={this.state.resetCount}>{this.props.children}</React.Fragment>;
  }
}

/**
 * Functional wrapper for easier usage
 */
export const withErrorBoundary = <P extends object>(
  WrappedComponentType: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProperties, 'children'>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (properties) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponentType {...properties} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${WrappedComponentType.displayName ?? WrappedComponentType.name})`;

  return WrappedComponent;
};

