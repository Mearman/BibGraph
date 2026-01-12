/**
 * Notification Context
 *
 * Provides centralized notification state management for the entire application.
 * Supports toast notifications and persistent notification center.
 */

import { type NotificationData, notifications } from '@mantine/notifications';
import React, { createContext, useCallback, useContext, useState } from 'react';

export type NotificationCategory = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  showNotification: (notification: {
    title: string;
    message: string;
    category: NotificationCategory;
  }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const NOTIFICATION_AUTO_CLOSE_MS = 3000; // User decision: 3 seconds
const MAX_NOTIFICATIONS = 50; // Keep last 50 notifications

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);

  const showNotification = useCallback(
    ({ title, message, category }: { title: string; message: string; category: NotificationCategory }) => {
      const id = crypto.randomUUID();

      // Add to persistent list
      const notification: AppNotification = {
        id,
        title,
        message,
        category,
        timestamp: new Date(),
        read: false,
      };

      setAppNotifications((prev) => {
        const updated = [notification, ...prev];
        // Keep only last MAX_NOTIFICATIONS
        return updated.slice(0, MAX_NOTIFICATIONS);
      });

      // Show toast notification
      const mantelNotification: NotificationData = {
        id,
        title,
        message,
        color: category === 'error' ? 'red' : category === 'warning' ? 'orange' : category === 'success' ? 'green' : 'blue',
        autoClose: NOTIFICATION_AUTO_CLOSE_MS,
      };

      notifications.show(mantelNotification);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setAppNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setAppNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setAppNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setAppNotifications([]);
  }, []);

  const unreadCount = appNotifications.filter((n) => !n.read).length;

  const value: NotificationContextValue = {
    notifications: appNotifications,
    unreadCount,
    showNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
