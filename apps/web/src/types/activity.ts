/**
 * Activity Types
 *
 * Types for activity feed tracking user actions throughout the application.
 */

export type ActivityCategory = 'create' | 'update' | 'delete' | 'navigate' | 'search' | 'export' | 'import';

export interface Activity {
  id: string;
  timestamp: Date;
  category: ActivityCategory;
  description: string;
  // Optional properties for different activity types
  entityType?: string;
  entityId?: string;
  entityName?: string;
  changes?: string[];
  fromPath?: string;
  toPath?: string;
  query?: string;
  resultCount?: number;
  listName?: string;
  format?: string;
  itemCount?: number;
  source?: string;
}

export interface ActivityFilter {
  categories?: ActivityCategory[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}
