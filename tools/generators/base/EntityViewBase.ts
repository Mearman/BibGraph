import { join } from 'node:path'

import { GeneratorCallback, names } from '@nx/devkit'

import { BaseGenerator } from './BaseGenerator'
import {
  generateContentComponent,
  generateDataHook,
  generateErrorComponent,
  generateHeaderComponent,
  generateListViewComponent,
  generateLoadingSkeletonComponent,
  generateMockData,
} from './entity-view-component-generators'
import {
  generateDetailRoute,
  generateIndexRoute,
  generateLazyDetailRoute,
  generateLazyIndexRoute,
} from './entity-view-route-generators'
import {
  generateE2ETest,
  generateIntegrationTest,
  generateUnitTest,
} from './entity-view-test-generators'
import {
  ENTITY_CONFIGS,
  EntityViewGeneratorOptions,
  NormalizedEntityViewOptions,
} from './entity-view-types'

// Types exported from generators/index.ts barrel

/**
 * Base class for OpenAlex entity view generators
 * Provides standardized entity view creation patterns
 */
export abstract class EntityViewBase extends BaseGenerator<EntityViewGeneratorOptions> {
  declare protected normalizedOptions: NormalizedEntityViewOptions

  /**
   * Normalize entity view generator options
   */
  protected normalizeOptions(): NormalizedEntityViewOptions {
    const entity = this.options.entity.toLowerCase()
    const entityConfig = ENTITY_CONFIGS[entity]

    if (!entityConfig) {
      throw new Error(
        `Unsupported entity type: ${entity}. Supported types: ${Object.keys(ENTITY_CONFIGS).join(', ')}`
      )
    }

    const entityNames = names(entity)
    const entityName = entityNames.fileName
    const entityNameCapitalized = entityNames.className
    const entityPlural = entityConfig.plural
    const entityPluralCapitalized = names(entityPlural).className

    const project = this.options.project ?? 'web'
    const componentDirectory = `entity-views/${entityName}`
    const routeDirectory = `entity-views/${entityPlural}`

    const projectRoot = `apps/web/src/components/${componentDirectory}`

    return {
      projectName: `${project}-${entityName}-view`,
      projectRoot,
      projectDirectory: componentDirectory,
      parsedTags: ['type:component', 'scope:entity-view', `entity:${entityName}`],
      importPath: `@bibgraph/web/components/${componentDirectory}`,
      className: entityNameCapitalized,
      fileName: entityName,
      entityName,
      entityNameCapitalized,
      entityPlural,
      entityPluralCapitalized,
      targetProject: project,
      componentDirectory,
      routeDirectory,
      createMocks: this.options.withMocks ?? true,
      createIntegration: this.options.withIntegration ?? true,
      createE2E: this.options.withE2E ?? true,
      useLazyLoading: this.options.withLazyLoading ?? true,
      includeErrorHandling: this.options.withErrorHandling ?? true,
      skipTests: this.options.skipTests ?? false,
    }
  }

  /**
   * Generate main entity view component
   */
  protected abstract generateMainViewComponent(): string

  /**
   * Generate entity header component
   */
  protected generateHeaderComponent(): string {
    return generateHeaderComponent(this.normalizedOptions)
  }

  /**
   * Generate entity content component
   */
  protected generateContentComponent(): string {
    return generateContentComponent(this.normalizedOptions)
  }

  /**
   * Generate loading skeleton component
   */
  protected generateLoadingSkeletonComponent(): string {
    return generateLoadingSkeletonComponent(this.normalizedOptions)
  }

  /**
   * Generate error component
   */
  protected generateErrorComponent(): string {
    return generateErrorComponent(this.normalizedOptions)
  }

  /**
   * Generate list view component
   */
  protected generateListViewComponent(): string {
    return generateListViewComponent(this.normalizedOptions)
  }

  /**
   * Generate data hook
   */
  protected generateDataHook(): string {
    return generateDataHook(this.normalizedOptions)
  }

  /**
   * Generate mock data
   */
  protected generateMockData(): string {
    return generateMockData(this.normalizedOptions)
  }

  /**
   * Generate route files
   */
  protected async generateRoutes(): Promise<void> {
    const routesDir = `apps/web/src/routes/${this.normalizedOptions.routeDirectory}`

    this.tree.write(join(routesDir, 'index.tsx'), generateIndexRoute(this.normalizedOptions))
    this.tree.write(join(routesDir, '$entityId.tsx'), generateDetailRoute(this.normalizedOptions))

    if (this.normalizedOptions.useLazyLoading) {
      this.tree.write(
        join(routesDir, 'index.lazy.tsx'),
        generateLazyIndexRoute(this.normalizedOptions)
      )
      this.tree.write(
        join(routesDir, '$entityId.lazy.tsx'),
        generateLazyDetailRoute(this.normalizedOptions)
      )
    }
  }

  /**
   * Generate unit test
   */
  protected generateUnitTest(): string {
    return generateUnitTest(this.normalizedOptions)
  }

  /**
   * Generate integration test
   */
  protected generateIntegrationTest(): string {
    return generateIntegrationTest(this.normalizedOptions)
  }

  /**
   * Generate E2E test
   */
  protected generateE2ETest(): string {
    return generateE2ETest(this.normalizedOptions)
  }

  /**
   * Generate complete entity view
   */
  protected async generateEntityView(): Promise<void> {
    const componentDir = this.normalizedOptions.projectRoot
    this.tree.write(join(componentDir, '.gitkeep'), '')

    // Generate main view component
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-view.tsx`),
      this.generateMainViewComponent()
    )

    // Generate sub-components
    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-header.tsx`),
      this.generateHeaderComponent()
    )

    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-content.tsx`),
      this.generateContentComponent()
    )

    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-loading-skeleton.tsx`),
      this.generateLoadingSkeletonComponent()
    )

    if (this.normalizedOptions.includeErrorHandling) {
      this.tree.write(
        join(componentDir, `${this.normalizedOptions.fileName}-error.tsx`),
        this.generateErrorComponent()
      )
    }

    this.tree.write(
      join(componentDir, `${this.normalizedOptions.fileName}-list-view.tsx`),
      this.generateListViewComponent()
    )

    // Generate hooks
    this.tree.write(
      join(componentDir, `use-${this.normalizedOptions.fileName}.ts`),
      this.generateDataHook()
    )

    // Generate mock data
    if (this.normalizedOptions.createMocks) {
      this.tree.write(
        join(componentDir, `${this.normalizedOptions.fileName}-mocks.ts`),
        this.generateMockData()
      )
    }

    // Generate routes
    await this.generateRoutes()

    // Generate tests
    if (!this.normalizedOptions.skipTests) {
      await this.generateTests()
    }

    // Generate index file
    this.createIndexFile([
      `./${this.normalizedOptions.fileName}-view`,
      `./${this.normalizedOptions.fileName}-header`,
      `./${this.normalizedOptions.fileName}-content`,
      `./${this.normalizedOptions.fileName}-loading-skeleton`,
      `./${this.normalizedOptions.fileName}-list-view`,
      `use-${this.normalizedOptions.fileName}`,
    ])

    // Format files
    await this.format()
  }

  /**
   * Generate tests
   */
  protected async generateTests(): Promise<void> {
    this.tree.write(
      join(
        this.normalizedOptions.projectRoot,
        `${this.normalizedOptions.fileName}-view.unit.test.tsx`
      ),
      this.generateUnitTest()
    )

    if (this.normalizedOptions.createIntegration) {
      this.tree.write(
        join(
          this.normalizedOptions.projectRoot,
          `${this.normalizedOptions.fileName}-view.integration.test.tsx`
        ),
        this.generateIntegrationTest()
      )
    }

    if (this.normalizedOptions.createE2E) {
      this.tree.write(
        join(`apps/web`, `e2e/${this.normalizedOptions.entityPlural}.e2e.test.ts`),
        this.generateE2ETest()
      )
    }
  }

  /**
   * Generate complete entity view
   */
  async generate(): Promise<GeneratorCallback> {
    await this.generateEntityView()
    this.logCompletion('Entity View')

    return async () => {
      // Post-generation callback if needed
    }
  }
}
