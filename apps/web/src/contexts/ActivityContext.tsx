/**
 * Activity Context
 *
 * Provides activity tracking and feed management for the entire application.
 * Tracks user actions like create, update, delete, navigate, search, export, import.
 */

import React, { createContext, use, useCallback, useState } from 'react';

import type { Activity, ActivityCategory, ActivityFilter } from '@/types/activity';

interface ActivityContextValue {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;
  filteredActivities: (filter: ActivityFilter) => Activity[];
  getActivityCount: (category?: ActivityCategory) => number;
}

const MAX_ACTIVITIES = 1000; // Keep last 1000 activities

const ActivityContext = createContext<ActivityContextValue | null>(null);

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    } as Activity;

    setActivities((prev) => {
      const updated = [newActivity, ...prev];
      // Keep only last MAX_ACTIVITIES
      return updated.slice(0, MAX_ACTIVITIES);
    });
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const filteredActivities = useCallback((filter: ActivityFilter): Activity[] => {
    let filtered = [...activities];

    // Filter by category
    if (filter.categories && filter.categories.length > 0) {
      filtered = filtered.filter((a) => filter.categories!.includes(a.category));
    }

    // Filter by date range
    if (filter.dateRange) {
      filtered = filtered.filter((a) => {
        const timestamp = a.timestamp.getTime();
        return (
          timestamp >= filter.dateRange!.start.getTime() &&
          timestamp <= filter.dateRange!.end.getTime()
        );
      });
    }

    // Filter by search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities]);

  const getActivityCount = useCallback((category?: ActivityCategory): number => {
    if (category) {
      return activities.filter((a) => a.category === category).length;
    }
    return activities.length;
  }, [activities]);

  const value: ActivityContextValue = {
    activities,
    addActivity,
    clearActivities,
    filteredActivities,
    getActivityCount,
  };

  return (
    <ActivityContext value={value}>
      {children}
    </ActivityContext>
  );
};

export const useActivity = (): ActivityContextValue => {
  const context = use(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};

export default ActivityContext;
