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
  tags?: { label: string; color?: string }[]
}

// EntityListItem type alias for EntityGridItem
export type EntityListItem = EntityGridItem

// Every entity type that can be rendered as a grid/list item. Kept as a single union (rather than a generic type parameter) so entityMappers below can share one function signature and be indexed/called without a type assertion.
type MappableEntity = Work | Author | InstitutionEntity | Source | Publisher | Funder | Topic | Concept

/**
 * Base entity mapper that provides common transformation logic
 */
export const createBaseEntityMapper = (entity: Readonly<MappableEntity>, entityType: EntityType): EntityGridItem => {
  // Some entities (e.g. Concept) don't carry a works_count field at all
  const worksCount = 'works_count' in entity && typeof entity.works_count === 'number' ? entity.works_count : undefined

  return {
    id: entity.id.replace("https://openalex.org/", ""),
    displayName: entity.display_name,
    entityType,
    worksCount,
    citedByCount: entity.cited_by_count,
  }
};

/**
 * Specialized entity mappers for each type
 */
export const entityMappers: Record<Extract<EntityType, "works" | "authors" | "institutions" | "sources" | "publishers" | "funders" | "topics" | "concepts">, (entity: Readonly<MappableEntity>) => EntityGridItem> = {
  works: (entity) => {
    const base = createBaseEntityMapper(entity, "works")
    const hasAbstract = 'abstract_inverted_index' in entity && entity.abstract_inverted_index !== undefined
    return {
      ...base,
      description: hasAbstract ? "Abstract available" : undefined,
    }
  },

  authors: (entity) => {
    const base = createBaseEntityMapper(entity, "authors")
    const orcid = 'orcid' in entity ? entity.orcid : undefined
    if (orcid === undefined || orcid === '') {
      return base
    }
    return {
      ...base,
      description: `ORCID: ${orcid}`,
      tags: [{ label: "ORCID", color: "green" }],
    }
  },

  institutions: (entity) => {
    return createBaseEntityMapper(entity, "institutions")
  },

  sources: (entity) => {
    const base = createBaseEntityMapper(entity, "sources")
    const tags: { label: string; color?: string }[] = []

    if ('is_oa' in entity && entity.is_oa) {
      tags.push({ label: "Open Access", color: "green" })
    }
    const sourceType = 'type' in entity ? entity.type : undefined
    if (sourceType !== undefined && sourceType !== '') {
      tags.push({ label: sourceType, color: "gray" })
    }
    const publisher = 'publisher' in entity ? entity.publisher : undefined

    return {
      ...base,
      description: publisher !== undefined && publisher !== '' ? `Publisher: ${publisher}` : undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
  },

  publishers: (entity) => {
    return createBaseEntityMapper(entity, "publishers")
  },

  funders: (entity) => {
    return createBaseEntityMapper(entity, "funders")
  },

  topics: (entity) => {
    return createBaseEntityMapper(entity, "topics")
  },

  concepts: (entity) => {
    return createBaseEntityMapper(entity, "concepts")
  },
}

const isMappableEntityType = (entityType: EntityType): entityType is keyof typeof entityMappers => entityType in entityMappers

/**
 * Generic entity transformation function
 */
export const transformEntityToGridItem = (entity: Readonly<MappableEntity>, entityType: EntityType): EntityGridItem => {
  if (!isMappableEntityType(entityType)) {
    throw new Error(`Unsupported entity type: ${entityType}`)
  }
  const mapper = entityMappers[entityType]
  return mapper(entity)
};

/**
 * Transform entity to list item (currently same as grid item)
 */
export const transformEntityToListItem = (entity: Readonly<MappableEntity>, entityType: EntityType): EntityListItem => transformEntityToGridItem(entity, entityType);

/**
 * Map from singular entity_type (autocomplete) to plural EntityType
 */
const singularToPluralEntityType: Record<AutocompleteResult["entity_type"], EntityType> = {
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
 */
export const transformAutocompleteResultToGridItem = (result: Readonly<AutocompleteResult>): EntityGridItem => {
  const entityType = singularToPluralEntityType[result.entity_type]

  // Extract ID from OpenAlex URL, removing the base URL
  let id = result.id.replace("https://openalex.org/", "")

  // For entity types where the ID includes the type prefix (e.g., "keywords/machine-learning"), strip it since EntityCard will add it back via entityType
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
