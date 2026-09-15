/**
 * Toast Notification System
 *
 * Provides a flexible toast notification system with different
 * variants, positioning, and auto-dismiss functionality.
 */

import type { NotificationData} from '@mantine/notifications';
import {notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import { useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastOptions extends Omit<NotificationData, 'message'> {
  variant?: ToastVariant;
  autoClose?: number | boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_AUTO_CLOSE = 5000;
const IS_LOADING_AUTO_CLOSE = false;

/**
 * Get notification configuration for variant
 */
const getNotificationConfig = (variant: ToastVariant = 'info') => {
  const configs = {
    success: {
      color: 'green',
      icon: <IconCheck size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    error: {
      color: 'red',
      icon: <IconX size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    warning: {
      color: 'orange',
      icon: <IconAlertTriangle size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    info: {
      color: 'blue',
      icon: <IconInfoCircle size={20} />,
      autoClose: DEFAULT_AUTO_CLOSE,
    },
    loading: {
      color: 'blue',
      icon: <IconLoader size={20} className="rotate" />,
      autoClose: IS_LOADING_AUTO_CLOSE,
      loading: true,
    },
  };

  return configs[variant];
};

/**
 * Show a success toast notification
 */
export const showSuccessToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('success');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show an error toast notification
 */
export const showErrorToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('error');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show a warning toast notification
 */
export const showWarningToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('warning');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show an info toast notification
 */
export const showInfoToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('info');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show a loading toast notification
 */
export const showLoadingToast = (
  message: string,
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig('loading');
  return notifications.show({
    message,
    ...config,
    ...options,
  });
};

/**
 * Show a custom toast with specific configuration
 */
export const showToast = (
  title: string,
  message: string,
  variant: ToastVariant = 'info',
  options?: Omit<ToastOptions, 'variant'>
): string => {
  const config = getNotificationConfig(variant);
  return notifications.show({
    title,
    message,
    ...config,
    ...options,
  });
};

/**
 * Hide a specific toast notification
 */
export const hideToast = (id: string): void => {
  notifications.hide(id);
};

/**
 * Hide all toast notifications
 */
export const hideAllToasts = (): void => {
  notifications.clean();
};

// Module-scoped state backing ToastManager below - there's exactly one toast registry for the whole app, so a plain object of functions replaces what would otherwise be a class with only static members.
let managedToastIds: string[] = [];

/**
 * Show operation success toast
 */
const showOperationSuccess = (operation: string, details?: string): string => {
  const message = details !== undefined ? `${operation}: ${details}` : operation;
  const id = showSuccessToast(message);
  managedToastIds.push(id);
  return id;
};

/**
 * Show operation error toast
 */
const showOperationError = (operation: string, error?: string | Error): string => {
  const errorMessage = error instanceof Error ? error.message : error ?? 'Unknown error';
  const message = `${operation} failed: ${errorMessage}`;
  const id = showErrorToast(message, {
    autoClose: 8000, // Show errors longer
  });
  managedToastIds.push(id);
  return id;
};

/**
 * Show operation loading toast
 */
const showOperationLoading = (operation: string): string => {
  const message = `${operation}...`;
  const id = showLoadingToast(message);
  managedToastIds.push(id);
  return id;
};

/**
 * Update loading toast to success
 */
const updateLoadingToSuccess = (loadingId: string, operation: string, details?: string): void => {
  notifications.update({
    id: loadingId,
    color: 'green',
    icon: <IconCheck size={20} />,
    message: details !== undefined ? `${operation}: ${details}` : operation,
    loading: false,
    autoClose: DEFAULT_AUTO_CLOSE,
  });
};

/**
 * Update loading toast to error
 */
const updateLoadingToError = (loadingId: string, operation: string, error?: string | Error): void => {
  const errorMessage = error instanceof Error ? error.message : error ?? 'Unknown error';
  const message = `${operation} failed: ${errorMessage}`;
  notifications.update({
    id: loadingId,
    color: 'red',
    icon: <IconX size={20} />,
    message,
    loading: false,
    autoClose: 8000,
  });
};

/**
 * Show network error toast
 */
const showNetworkError = (error = 'Network error occurred. Please check your connection.'): string => {
  return showErrorToast(error, {
    title: 'Network Error',
    autoClose: 10000,
  });
};

/**
 * Show validation error toast
 */
const showValidationError = (errors: readonly string[]): string => {
  const message = `Please fix the following errors: ${errors.join(', ')}`;
  return showWarningToast(message, {
    title: 'Validation Error',
    autoClose: 10000,
  });
};

/**
 * Show permission error toast
 */
const showPermissionError = (action: string): string => {
  const message = `You don't have permission to ${action}.`;
  return showWarningToast(message, {
    title: 'Permission Denied',
    autoClose: 8000,
  });
};

/**
 * Clear all toasts managed by this instance
 */
const clearAll = (): void => {
  for (const id of managedToastIds) {
    hideToast(id);
  }
  managedToastIds = [];
};

/**
 * Toast utility for common application scenarios
 */
export const ToastManager = {
  showOperationSuccess,
  showOperationError,
  showOperationLoading,
  updateLoadingToSuccess,
  updateLoadingToError,
  showNetworkError,
  showValidationError,
  showPermissionError,
  clearAll,
};

/**
 * React hook for toast management
 */
export const useToast = () => {
  // Use useCallback to stabilize function references if React hooks are needed
  const success = useCallback(showSuccessToast, []);
  const error = useCallback(showErrorToast, []);
  const warning = useCallback(showWarningToast, []);
  const info = useCallback(showInfoToast, []);
  const loading = useCallback(showLoadingToast, []);
  const hide = useCallback(hideToast, []);
  const clearAllToasts = useCallback(hideAllToasts, []);

  return {
    success,
    error,
    warning,
    info,
    loading,
    hide,
    clearAll: clearAllToasts,
    manager: ToastManager,
  };
};

// No default export - use the named exports above