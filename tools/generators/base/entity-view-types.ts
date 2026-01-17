import { NormalizedOptions } from './BaseGenerator'

export interface EntityViewGeneratorOptions extends Record<string, unknown> {
  entity: string
  name?: string
  project?: string
  withMocks?: boolean
  withIntegration?: boolean
  withE2E?: boolean
  withLazyLoading?: boolean
  withErrorHandling?: boolean
  skipTests?: boolean
  skipFormat?: boolean
}

export interface NormalizedEntityViewOptions extends NormalizedOptions {
  entityName: string
  entityNameCapitalized: string
  entityPlural: string
  entityPluralCapitalized: string
  targetProject: string
  componentDirectory: string
  routeDirectory: string
  createMocks: boolean
  createIntegration: boolean
  createE2E: boolean
  useLazyLoading: boolean
  includeErrorHandling: boolean
  skipTests: boolean
}

export interface EntityConfig {
  plural: string
  icon: string
}

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  works: { plural: 'works', icon: '📄' },
  authors: { plural: 'authors', icon: '👤' },
  sources: { plural: 'sources', icon: '📰' },
  institutions: { plural: 'institutions', icon: '🏛️' },
  topics: { plural: 'topics', icon: '🏷️' },
  publishers: { plural: 'publishers', icon: '📚' },
  funders: { plural: 'funders', icon: '💰' },
}

export const getEntityIcon = (entityName: string): string => ENTITY_CONFIGS[entityName]?.icon ?? '📄';
