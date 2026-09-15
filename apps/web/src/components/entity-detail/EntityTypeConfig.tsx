/**
 * Configuration for different entity types
 * Uses the Vanilla Extract theme colors defined in theme.css.ts
 */

import type { EntityType } from '@bibgraph/types';

export interface EntityTypeConfig {
  name: string;
  icon: React.ReactNode;
  colorKey: string; // Maps to vars.color[colorKey] in theme
}

/**
 * Maps entity types to Mantine color names for UI components
 * This is the SINGLE SOURCE OF TRUTH for entity type colors in Mantine components
 */
const ENTITY_MANTINE_COLORS: Record<EntityType, string> = {
  authors: 'blue',
  works: 'violet',
  institutions: 'orange',
  sources: 'teal',
  concepts: 'yellow',
  topics: 'pink',
  publishers: 'indigo',
  funders: 'lime',
  domains: 'gray',
  fields: 'cyan',
  subfields: 'grape',
  keywords: 'red',
};

/**
 * Get Mantine color name for an entity type
 * Used for Badge, Loader, Progress, and other Mantine components
 */
export const getMantineColor = (entityType: EntityType): string => {
  return ENTITY_MANTINE_COLORS[entityType] || 'blue';
};

export const ENTITY_TYPE_CONFIGS: Record<EntityType, EntityTypeConfig> = {
  authors: {
    name: "AUTHOR",
    colorKey: "author",
    icon: (
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
    ),
  },
  works: {
    name: "WORK",
    colorKey: "work",
    icon: (
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    ),
  },
  institutions: {
    name: "INSTITUTION",
    colorKey: "institution",
    icon: (
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
        clipRule="evenodd"
      />
    ),
  },
  sources: {
    name: "SOURCE",
    colorKey: "source",
    icon: (
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    ),
  },
  concepts: {
    name: "CONCEPT",
    colorKey: "concept",
    icon: (
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
  },
  funders: {
    name: "FUNDER",
    colorKey: "funder",
    icon: (
      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  publishers: {
    name: "PUBLISHER",
    colorKey: "publisher",
    icon: (
      <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    ),
  },
  topics: {
    name: "TOPIC",
    colorKey: "topic",
    icon: (
      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    ),
  },
  domains: {
    name: "DOMAIN",
    colorKey: "topic",
    icon: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  fields: {
    name: "FIELD",
    colorKey: "topic",
    icon: (
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    ),
  },
  subfields: {
    name: "SUBFIELD",
    colorKey: "topic",
    icon: (
      <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    ),
  },
  keywords: {
    name: "KEYWORD",
    colorKey: "topic",
    icon: (
      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    ),
  },
};
