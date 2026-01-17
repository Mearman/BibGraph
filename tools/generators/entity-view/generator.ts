import { readProjectConfiguration, Tree, updateProjectConfiguration } from '@nx/devkit'

import { EntityViewGeneratorOptions, NormalizedEntityViewOptions } from '../base/entity-view-types'
import { EntityViewBase } from '../base/EntityViewBase'

interface OpenAlexEntityViewNormalizedOptions extends NormalizedEntityViewOptions {
  entityCamel: string
  routesDirectory: string
  componentsDirectory: string
  hooksDirectory: string
  testsDirectory: string
  mocksDirectory: string
}

/**
 * OpenAlex entity view generator
 */
class OpenAlexEntityView extends EntityViewBase {
  declare protected normalizedOptions: OpenAlexEntityViewNormalizedOptions

  protected normalizeOptions(): OpenAlexEntityViewNormalizedOptions {
    const baseOptions = super.normalizeOptions()
    const entityNames = this.names
    const entityPlural = entityNames.propertyName + "s"
    const entityCamel = entityNames.propertyName

    const projectRoot =
      this.options.project === "web"
        ? "apps/web"
        : (this.options.project?.startsWith("@")
        ? `packages/${this.options.project.replace("@bibgraph/", "")}`
        : `packages/${this.options.project || "web"}`)

    const routesDirectory = `${projectRoot}/src/routes/${entityPlural}`
    const componentsDirectory = `${projectRoot}/src/components/entities/${entityPlural}`
    const hooksDirectory = `${projectRoot}/src/hooks/${entityPlural}`
    const testsDirectory = `${projectRoot}/src/test/${entityPlural}`
    const mocksDirectory = `${projectRoot}/src/mocks/${entityPlural}`

    return {
      ...baseOptions,
      entityCamel,
      routesDirectory,
      componentsDirectory,
      hooksDirectory,
      testsDirectory,
      mocksDirectory,
    }
  }

  protected generateMainViewComponent(): string {
    return this.generateDetailViewComponent()
  }

  protected generateEntityHook(): string {
    const { entityName, entityNameCapitalized } = this.normalizedOptions

    return `import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { cachedOpenAlex } from '@bibgraph/client'
import { logger } from '@/lib/logger'

/**
 * Hook for fetching single ${entityName} by ID
 */
export function use${entityNameCapitalized}(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['${entityName}', id],
    queryFn: async () => {
      logger.debug('api', \`Fetching \${id} for ${entityName}\`)
      const response = await cachedOpenAlex.${entityName}s({
        select: ['id', 'display_name', 'created_date'],
        'filter.id': id,
      })

      if (!response.results || response.results.length === 0) {
        throw new Error(\`${entityName} not found: \${id}\`)
      }

      return response.results[0]
    },
    enabled: options?.enabled !== false && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Suspense version for use in route loaders
 */
export function use${entityNameCapitalized}Suspense(id: string) {
  return useSuspenseQuery({
    queryKey: ['${entityName}', id],
    queryFn: async () => {
      logger.debug('api', \`Fetching \${id} for ${entityName} (suspense)\`)
      const response = await cachedOpenAlex.${entityName}s({
        select: ['id', 'display_name', 'created_date'],
        'filter.id': id,
      })

      if (!response.results || response.results.length === 0) {
        throw new Error(\`${entityName} not found: \${id}\`)
      }

      return response.results[0]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for searching ${entityName}s
 */
export function use${entityNameCapitalized}Search(params: {
  query?: string
  page?: number
  per_page?: number
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['${entityName}s', 'search', params],
    queryFn: async () => {
      logger.debug('api', \`Searching ${entityName}s with params:\`, params)

      const searchParams: any = {
        select: ['id', 'display_name', 'created_date'],
        'per-page.default': params.per_page || 25,
      }

      if (params.query) {
        searchParams['filter.display_name.search'] = params.query
      }

      if (params.page && params.page > 1) {
        searchParams.page = params.page
      }

      const response = await cachedOpenAlex.${entityName}s(searchParams)
      return response
    },
    enabled: params.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
`
  }

  protected generateEntityTypes(): string {
    const { entityName, entityNameCapitalized } = this.normalizedOptions

    return `import { z } from 'zod'

/**
 * OpenAlex ${entityName} schema
 */
export const ${entityName}Schema = z.object({
  id: z.string(),
  display_name: z.string(),
  created_date: z.string().optional(),
})

/**
 * Type for OpenAlex ${entityName}
 */
export type ${entityNameCapitalized} = z.infer<typeof ${entityName}Schema>

/**
 * ${entityNameCapitalized} search results
 */
export interface ${entityNameCapitalized}SearchResult {
  results: ${entityNameCapitalized}[]
  meta: {
    count: number
    page: number
    per_page: number
    pages: number
  }
}

/**
 * ${entityNameCapitalized} view props
 */
export interface ${entityNameCapitalized}ViewProps {
  id: string
  className?: string
}

/**
 * ${entityNameCapitalized} list view props
 */
export interface ${entityNameCapitalized}ListViewProps {
  query?: string
  page?: number
  className?: string
}
`
  }

  protected generateIndexRoute(): string {
    const { entityPlural, entityPluralCapitalized } = this.normalizedOptions

    return `import { createFileRoute } from '@tanstack/react-router'
import { ${entityPluralCapitalized}ListView } from '../../components/entities/${entityPlural}/${entityPlural}-list-view'

export const Route = createFileRoute('/entity-views/${entityPlural}/')({
  component: ${entityPluralCapitalized}ListView,
})
`
  }

  protected generateDetailRoute(): string {
    const { entityName, entityNameCapitalized } = this.normalizedOptions

    return `import { createFileRoute } from '@tanstack/react-router'
import { ${entityNameCapitalized}View } from '../../components/entities/${entityName}s/${entityName}-view'

export const Route = createFileRoute('/entity-views/${entityName}s/$entityId')({
  component: ${entityNameCapitalized}View,
  loader: ({ params }) => ({
    crumb: \`${entityNameCapitalized}: \${params.entityId}\`,
  }),
})
`
  }

  protected generateListViewComponent(): string {
    const { entityPlural, entityPluralCapitalized } = this.normalizedOptions

    return `import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ${entityPluralCapitalized}SearchResult } from '../types/${entityPlural}.types'
import { use${entityPluralCapitalized}Search } from '../hooks/${entityPlural}/${entityPlural}-hooks'
import { logger } from '@/lib/logger'

export function ${entityPluralCapitalized}ListView({
  query = '',
  page = 1,
  className
}: {
  query?: string
  page?: number
  className?: string
}) {
  const [searchQuery, setSearchQuery] = useState(query)
  const [currentPage, setCurrentPage] = useState(page)

  const { data, isLoading, error } = use${entityPluralCapitalized}Search({
    query: searchQuery,
    page: currentPage,
    per_page: 25,
  })

  const handleSearch = (newQuery: string) => {
    setSearchQuery(newQuery)
    setCurrentPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  if (error) {
    logger.error('ui', 'Error loading ${entityPlural}', { error })
    return (
      <div className={className}>
        <h2>${entityPluralCapitalized} List</h2>
        <p>Error loading ${entityPlural}. Please try again.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">${entityPluralCapitalized}</h1>
      </div>

      {/* Search UI */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search ${entityPlural}..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <p>Loading ${entityPlural}...</p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Found {data.meta.count} ${entityPlural}
          </div>

          <div className="grid gap-4">
            {data.results.map((entity) => (
              <div
                key={entity.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <Link
                  to="/entity-views/${entityPlural}/$entityId"
                  params={{ entityId: entity.id }}
                  className="block"
                >
                  <h3 className="font-medium text-lg mb-1">
                    {entity.display_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    ID: {entity.id}
                  </p>
                  {entity.created_date && (
                    <p className="text-sm text-gray-500">
                      Created: {new Date(entity.created_date).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.meta.pages > 1 && (
            <div className="flex justify-center space-x-2 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {currentPage} of {data.meta.pages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= data.meta.pages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
`
  }

  protected generateDetailViewComponent(): string {
    const { entityName, entityNameCapitalized } = this.normalizedOptions

    return `import { use${entityNameCapitalized} } from '../hooks/${entityName}s/${entityName}-hooks'
import { logger } from '@/lib/logger'

export function ${entityNameCapitalized}View({ id, className }: { id: string; className?: string }) {
  const { data: entity, isLoading, error } = use${entityNameCapitalized}(id)

  if (error) {
    logger.error('ui', \`Error loading ${entityName} \${id}\`, { error })
    return (
      <div className={className}>
        <h2>${entityNameCapitalized}</h2>
        <p>Error loading ${entityName}. Please try again.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={className}>
        <h2>${entityNameCapitalized}</h2>
        <p>Loading ${entityName}...</p>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className={className}>
        <h2>${entityNameCapitalized}</h2>
        <p>${entityNameCapitalized} not found.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{entity.display_name}</h1>
        <p className="text-gray-600">ID: {entity.id}</p>
      </div>

      {/* Basic information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        <div className="space-y-3">
          <div>
            <span className="font-medium">Display Name:</span> {entity.display_name}
          </div>
          <div>
            <span className="font-medium">OpenAlex ID:</span> {entity.id}
          </div>
          {entity.created_date && (
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(entity.created_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* TODO: Add more sections as needed for this entity type */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-2">TODO: Entity-Specific Fields</h3>
        <p className="text-gray-700">
          Add entity-specific fields and sections here based on the OpenAlex API response
          for ${entityName}s. Common patterns include:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
          <li>Related entities (works, authors, institutions, etc.)</li>
          <li>Statistics and metrics</li>
          <li>External identifiers and links</li>
          <li>Classification and topic information</li>
        </ul>
      </div>
    </div>
  )
}
`
  }

  protected generateUnitTests(): string {
    const { entityName, entityPlural, entityNameCapitalized } = this.normalizedOptions

    return `import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { use${entityNameCapitalized}, use${entityNameCapitalized}Search } from '../hooks/${entityPlural}/${entityPlural}-hooks'
import { ${entityNameCapitalized}Schema } from '../types/${entityPlural}.types'

// Mock the OpenAlex client
jest.mock('@bibgraph/client', () => ({
  cachedOpenAlex: {
    ${entityName}s: jest.fn(),
  },
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('${entityPlural} Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('use${entityNameCapitalized}', () => {
    it('should fetch ${entityName} by ID', async () => {
      const mock${entityNameCapitalized} = ${entityNameCapitalized}Schema.parse({
        id: 'A123456789',
        display_name: 'Test ${entityNameCapitalized}',
        created_date: '2023-01-01',
      })

      const { cachedOpenAlex } = require('@bibgraph/client')
      cachedOpenAlex.${entityName}s.mockResolvedValue({
        results: [mock${entityNameCapitalized}],
      })

      const { result } = renderHook(() => use${entityNameCapitalized}('A123456789'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toEqual(mock${entityNameCapitalized})
      })

      expect(cachedOpenAlex.${entityName}s).toHaveBeenCalledWith({
        select: ['id', 'display_name', 'created_date'],
        'filter.id': 'A123456789',
      })
    })

    it('should handle not found error', async () => {
      const { cachedOpenAlex } = require('@bibgraph/client')
      cachedOpenAlex.${entityName}s.mockResolvedValue({
        results: [],
      })

      const { result } = renderHook(() => use${entityNameCapitalized}('nonexistent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(result.current.error?.message).toBe('${entityName} not found: nonexistent')
    })
  })

  describe('use${entityNameCapitalized}Search', () => {
    it('should search ${entityName}s', async () => {
      const mockResults = [
        ${entityNameCapitalized}Schema.parse({
          id: 'A123456789',
          display_name: 'Test ${entityNameCapitalized} 1',
        }),
        ${entityNameCapitalized}Schema.parse({
          id: 'A987654321',
          display_name: 'Test ${entityNameCapitalized} 2',
        }),
      ]

      const { cachedOpenAlex } = require('@bibgraph/client')
      cachedOpenAlex.${entityName}s.mockResolvedValue({
        results: mockResults,
        meta: {
          count: 2,
          page: 1,
          per_page: 25,
          pages: 1,
        },
      })

      const { result } = renderHook(
        () => use${entityNameCapitalized}Search({ query: 'test' }),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => {
        expect(result.current.data?.results).toEqual(mockResults)
      })

      expect(cachedOpenAlex.${entityName}s).toHaveBeenCalledWith({
        select: ['id', 'display_name', 'created_date'],
        'per-page.default': 25,
        'filter.display_name.search': 'test',
      })
    })

    it('should handle pagination', async () => {
      const { cachedOpenAlex } = require('@bibgraph/client')
      cachedOpenAlex.${entityName}s.mockResolvedValue({
        results: [],
        meta: { count: 0, page: 2, per_page: 25, pages: 1 },
      })

      renderHook(
        () => use${entityNameCapitalized}Search({ query: 'test', page: 2 }),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => {
        expect(cachedOpenAlex.${entityName}s).toHaveBeenCalledWith({
          select: ['id', 'display_name', 'created_date'],
          'per-page.default': 25,
          'filter.display_name.search': 'test',
          page: 2,
        })
      })
    })
  })
})
`
  }

  protected generateMockData(): string {
    const { entityName, entityNameCapitalized } = this.normalizedOptions

    return `import { ${entityNameCapitalized} } from '../types/${entityName}s/${entityName}s.types'

/**
 * Mock ${entityName} data for testing
 */
export const mock${entityNameCapitalized}: ${entityNameCapitalized} = {
  id: 'A5017898742',
  display_name: 'Test ${entityNameCapitalized}',
  created_date: '2023-01-15T00:00:00Z',
}

/**
 * Array of mock ${entityName}s
 */
export const mock${entityName}s: ${entityNameCapitalized}[] = [
  {
    id: 'A5017898742',
    display_name: 'Test ${entityNameCapitalized} 1',
    created_date: '2023-01-15T00:00:00Z',
  },
  {
    id: 'A1234567890',
    display_name: 'Test ${entityNameCapitalized} 2',
    created_date: '2023-02-20T00:00:00Z',
  },
  {
    id: 'A9876543210',
    display_name: 'Test ${entityNameCapitalized} 3',
    created_date: '2023-03-25T00:00:00Z',
  },
]

/**
 * Mock search results
 */
export const mock${entityName}SearchResult = {
  results: mock${entityName}s,
  meta: {
    count: mock${entityName}s.length,
    page: 1,
    per_page: 25,
    pages: 1,
  },
}
`
  }

  protected updateProjectConfig(): void {
    const projectName = this.options.project || "web"
    const projectConfig = readProjectConfiguration(this.tree, projectName)

    // Add new targets for entity view if not exists
    if (!projectConfig.targets) {
      projectConfig.targets = {}
    }

    const { entityName, testsDirectory } = this.normalizedOptions

    projectConfig.targets[`test:${entityName}`] = {
      executor: "@nx/vite:test",
      options: {
        config: `${this.normalizedOptions.projectRoot}/vitest.config.ts`,
        include: [`${testsDirectory}/**/*.unit.test.ts`],
        passWithNoTests: true,
        reportsDirectory: `coverage/${this.normalizedOptions.projectRoot}/${entityName}/unit`,
      },
      cache: true,
    }

    if (this.options.withIntegration) {
      projectConfig.targets[`test:${entityName}:integration`] = {
        executor: "@nx/vite:test",
        options: {
          config: `${this.normalizedOptions.projectRoot}/vitest.config.ts`,
          include: [`${testsDirectory}/**/*.integration.test.ts`],
          passWithNoTests: true,
          reportsDirectory: `coverage/${this.normalizedOptions.projectRoot}/${entityName}/integration`,
        },
        cache: true,
      }
    }

    updateProjectConfiguration(this.tree, projectName, projectConfig)
  }
}

/**
 * Entity view generator factory
 * @param tree
 * @param options
 */
// eslint-disable-next-line import/no-default-export -- Nx generator convention
export default async function entityViewGenerator(
  tree: Tree,
  options: EntityViewGeneratorOptions
) {
  const generator = new OpenAlexEntityView(tree, options)
  return generator.generate()
}