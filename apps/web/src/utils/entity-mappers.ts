import type {
  Author,
  AutocompleteResult,
  Concept,
  EntityType,
  Funder,
  InstitutionEntity,
  Publisher,
  Source,
  Topic,
  Work,
} from "@bibgraph/types"

export interface EntityGridItem {
  id: string
  displayName: string
  entityType: EntityType
  worksCount?: number
  citedByCount?: number
  description?: string
  tags?: Array<{ label: string; color?: string }>
}

// EntityListItem type alias for EntityGridItem
export type EntityListItem = EntityGridItem

/**
 * Base entity mapper that provides common transformation logic
 * @param entity
 * @param entityType
 */
export const createBaseEntityMapper = <T extends Work | Author | InstitutionEntity | Source | Publisher | Funder | Topic | Concept>(entity: T, entityType: EntityType): EntityGridItem => {
  const baseItem = {
    id: entity.id.replace("https://openalex.org/", ""),
    displayName: entity.display_name,
    entityType,
    worksCount: (entity as { works_count?: number }).works_count, // Some entities like Concept don't have works_count
    citedByCount: entity.cited_by_count,
  }

  return baseItem
};

/**
 * Specialized entity mappers for each type
 */
export const entityMappers = {
  works: (entity: Work): EntityGridItem => {
    const base = createBaseEntityMapper(entity, "works")
    return {
      ...base,
      description: entity.abstract_inverted_index ? "Abstract available" : undefined,
    }
  },

  authors: (entity: Author): EntityGridItem => {
    const base = createBaseEntityMapper(entity, "authors")
    return {
      ...base,
      description: entity.orcid ? `ORCID: ${entity.orcid}` : undefined,
      tags: entity.orcid ? [{ label: "ORCID", color: "green" }] : undefined,
    }
  },

  institutions: (entity: InstitutionEntity): EntityGridItem => {
    return createBaseEntityMapper(entity, "institutions")
  },

  sources: (entity: Source): EntityGridItem => {
    const base = createBaseEntityMapper(entity, "sources")
    const tags: Array<{ label: string; color?: string }> = []

    if (entity.is_oa) {
      tags.push({ label: "Open Access", color: "green" })
    }
    if (entity.type) {
      tags.push({ label: entity.type, color: "gray" })
    }

    return {
      ...base,
      description: entity.publisher ? `Publisher: ${entity.publisher}` : undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
  },

  publishers: (entity: Publisher): EntityGridItem => {
    return createBaseEntityMapper(entity, "publishers")
  },

  funders: (entity: Funder): EntityGridItem => {
    return createBaseEntityMapper(entity, "funders")
  },

  topics: (entity: Topic): EntityGridItem => {
    return createBaseEntityMapper(entity, "topics")
  },

  concepts: (entity: Concept): EntityGridItem => {
    return createBaseEntityMapper(entity, "concepts")
  },
} as const

/**
 * Generic entity transformation function
 * @param entity
 * @param entityType
 */
export const transformEntityToGridItem = <T extends Work | Author | InstitutionEntity | Source | Publisher | Funder | Topic | Concept>(entity: T, entityType: EntityType): EntityGridItem => {
  const mapper = entityMappers[entityType as keyof typeof entityMappers]
  if (!mapper) {
    throw new Error(`Unsupported entity type: ${entityType}`)
  }
  // Use type assertion with `any` as intermediate to avoid type mismatch
  // The mapper functions are properly typed but TypeScript can't narrow the union type
  return mapper(entity as never)
};

/**
 * Transform entity to list item (currently same as grid item)
 * @param entity
 * @param entityType
 */
export const transformEntityToListItem = <T extends Work | Author | InstitutionEntity | Source | Publisher | Funder | Topic | Concept>(entity: T, entityType: EntityType): EntityListItem => transformEntityToGridItem(entity, entityType);

/**
 * Map from singular entity_type (autocomplete) to plural EntityType
 */
const singularToPluralEntityType: Record<string, EntityType> = {
  work: "works",
  author: "authors",
  source: "sources",
  institution: "institutions",
  topic: "topics",
  publisher: "publishers",
  funder: "funders",
  concept: "concepts",
  keyword: "keywords",
  domain: "domains",
  field: "fields",
  subfield: "subfields",
}

/**
 * Transform AutocompleteResult to EntityGridItem for use in grid/list views
 * @param result
 */
export const transformAutocompleteResultToGridItem = (result: AutocompleteResult): EntityGridItem => {
  const entityType = singularToPluralEntityType[result.entity_type] || (result.entity_type as EntityType)

  // Extract ID from OpenAlex URL, removing the base URL
  let id = result.id.replace("https://openalex.org/", "")

  // For entity types where the ID includes the type prefix (e.g., "keywords/machine-learning"),
  // strip it since EntityCard will add it back via entityType
  if (id.includes("/")) {
    const parts = id.split("/")
    // Check if first part matches a known entity type plural
    const knownPrefixes = ["keywords", "domains", "fields", "subfields"]
    if (knownPrefixes.includes(parts[0])) {
      id = parts.slice(1).join("/")
    }
  }

  return {
    id,
    displayName: result.display_name,
    entityType,
    worksCount: result.works_count,
    citedByCount: result.cited_by_count,
    description: result.hint,
  }
};