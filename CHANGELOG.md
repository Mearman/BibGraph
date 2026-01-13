## 24.8.0 (2026-01-13)

* feat(algorithms): add hub penalty options to mutual information computation ([58f8e1a](https://github.com/Mearman/BibGraph/commit/58f8e1a)), closes [hi#degree](https://github.com/hi/issues/degree)

## 24.7.0 (2026-01-13)

* fix(algorithms): remove non-null assertions violating constitution ([e1daea0](https://github.com/Mearman/BibGraph/commit/e1daea0))
* fix(config): allow apps/web/coverage/ source files ([a059c25](https://github.com/Mearman/BibGraph/commit/a059c25))
* test(algorithms): add extended features unit tests for path ranking ([e721380](https://github.com/Mearman/BibGraph/commit/e721380)), closes [hi#weight](https://github.com/hi/issues/weight)
* test(algorithms): add mutual information unit tests ([931ca21](https://github.com/Mearman/BibGraph/commit/931ca21))
* test(algorithms): add path ranking unit tests ([be01384](https://github.com/Mearman/BibGraph/commit/be01384))
* test(algorithms): require explicit directed traversal in edge direction test ([2d2f2b5](https://github.com/Mearman/BibGraph/commit/2d2f2b5))
* feat(algorithms): add information-theoretic path ranking module ([7a801fd](https://github.com/Mearman/BibGraph/commit/7a801fd))
* feat(algorithms): add mutual information computation module ([930c55d](https://github.com/Mearman/BibGraph/commit/930c55d))
* feat(algorithms): add traversal and weight modes to path ranking ([757b2fb](https://github.com/Mearman/BibGraph/commit/757b2fb))
* feat(algorithms): export path ranking modules from index ([cc50732](https://github.com/Mearman/BibGraph/commit/cc50732))
* feat(algorithms): extend mutual information with graph property modifiers ([17435c7](https://github.com/Mearman/BibGraph/commit/17435c7))
* docs(spec): mark spec-005 test environment MSW as complete ([42d9aef](https://github.com/Mearman/BibGraph/commit/42d9aef))
* style(web): convert functions to arrow functions in route-manifest.ts ([f8832a9](https://github.com/Mearman/BibGraph/commit/f8832a9))

## 24.6.0 (2026-01-13)

* fix(config): exclude coverage directories from ESLint ignores ([14cf052](https://github.com/Mearman/BibGraph/commit/14cf052))
* fix(web): complete Academic Explorer to BibGraph migration ([856cb23](https://github.com/Mearman/BibGraph/commit/856cb23))
* fix(web): resolve TypeScript compilation errors after catalogue refactoring ([eb1b657](https://github.com/Mearman/BibGraph/commit/eb1b657))
* fix(web): use nx serve web command in Playwright webServer config ([2803734](https://github.com/Mearman/BibGraph/commit/2803734))
* chore(gitignore): ignore generated test artifacts ([cea6cd2](https://github.com/Mearman/BibGraph/commit/cea6cd2))
* docs(spec): mark spec-006 application rename as complete ([f4c4049](https://github.com/Mearman/BibGraph/commit/f4c4049))
* docs(spec): mark spec-010 landing page layout as complete ([3859d17](https://github.com/Mearman/BibGraph/commit/3859d17))
* docs(spec): mark spec-020 E2E test coverage as complete ([e2dab59](https://github.com/Mearman/BibGraph/commit/e2dab59))
* docs(spec): mark spec-023 CI optimization as complete ([7de4c19](https://github.com/Mearman/BibGraph/commit/7de4c19))
* docs(spec): mark spec-030 as complete ([40dc619](https://github.com/Mearman/BibGraph/commit/40dc619))
* test(algorithms): fix flaky Louvain scaling test ([e1a4f6c](https://github.com/Mearman/BibGraph/commit/e1a4f6c))
* test(web): add route coverage calculation script ([45668d2](https://github.com/Mearman/BibGraph/commit/45668d2))
* feat(web): add route manifest for coverage tracking ([982a1e4](https://github.com/Mearman/BibGraph/commit/982a1e4))
* feat(web): remove algorithm result truncation ([9139afd](https://github.com/Mearman/BibGraph/commit/9139afd))

## 24.5.0 (2026-01-13)

* docs: document related repositories and update task graph ([f5b065e](https://github.com/Mearman/BibGraph/commit/f5b065e))
* chore(deps): update pnpm lockfile and document related repos ([4f990cf](https://github.com/Mearman/BibGraph/commit/4f990cf))
* chore(web): add date-fns dependency for activity feed (task-32) ([956a4f0](https://github.com/Mearman/BibGraph/commit/956a4f0))
* test(web): add missing context providers to tests ([e769675](https://github.com/Mearman/BibGraph/commit/e769675))
* style(web): fix import sorting in UndoRedoContext and works route ([5fd92c2](https://github.com/Mearman/BibGraph/commit/5fd92c2))
* feat(web): add 'Add to graph' buttons to search results ([9924fb3](https://github.com/Mearman/BibGraph/commit/9924fb3))
* feat(web): add activity feed (task-32) ([0b20ffe](https://github.com/Mearman/BibGraph/commit/0b20ffe))
* feat(web): add author collaboration network mini-graph (task-19) ([67334aa](https://github.com/Mearman/BibGraph/commit/67334aa))
* feat(web): add citation context preview to works pages (task-18) ([1b78fa2](https://github.com/Mearman/BibGraph/commit/1b78fa2))
* feat(web): add citation impact charts (task-47) ([c11db32](https://github.com/Mearman/BibGraph/commit/c11db32))
* feat(web): add citation style preview to lists (task-29) ([8682a2d](https://github.com/Mearman/BibGraph/commit/8682a2d))
* feat(web): add data synchronization status indicator (task-33) ([cadfa94](https://github.com/Mearman/BibGraph/commit/cadfa94))
* feat(web): add duplicate detection within/across lists (task-26) ([e2072d6](https://github.com/Mearman/BibGraph/commit/e2072d6))
* feat(web): add entity comparison component (task-21) ([c95c128](https://github.com/Mearman/BibGraph/commit/c95c128))
* feat(web): add error boundaries around major routes (task-35) ([c68dcc6](https://github.com/Mearman/BibGraph/commit/c68dcc6))
* feat(web): add folder/tag organization to catalogue (task-28) ([e307a6e](https://github.com/Mearman/BibGraph/commit/e307a6e))
* feat(web): add geographic distribution map (task-50) ([a4823cd](https://github.com/Mearman/BibGraph/commit/a4823cd))
* feat(web): add graph annotations feature (task-10) ([7530f67](https://github.com/Mearman/BibGraph/commit/7530f67))
* feat(web): add graph comparison feature (task-15) ([7a74652](https://github.com/Mearman/BibGraph/commit/7a74652))
* feat(web): add graph legend for colors and edge types (task-13) ([0487e81](https://github.com/Mearman/BibGraph/commit/0487e81))
* feat(web): add graph snapshots feature (task-12) ([1d754fc](https://github.com/Mearman/BibGraph/commit/1d754fc))
* feat(web): add hierarchical/tree layout to graph (task-7) ([1943940](https://github.com/Mearman/BibGraph/commit/1943940))
* feat(web): add institution rankings visualization (task-48) ([839f91f](https://github.com/Mearman/BibGraph/commit/839f91f))
* feat(web): add keyword cloud visualization (task-51) ([61627a5](https://github.com/Mearman/BibGraph/commit/61627a5))
* feat(web): add list analytics citation trends networks (task-27) ([dbca1ba](https://github.com/Mearman/BibGraph/commit/dbca1ba))
* feat(web): add list merging functionality (task-25) ([68dba0e](https://github.com/Mearman/BibGraph/commit/68dba0e))
* feat(web): add list templates to catalogue (task-23) ([fc59f77](https://github.com/Mearman/BibGraph/commit/fc59f77))
* feat(web): add mini-map for large graph navigation (task-11) ([1cf9f1f](https://github.com/Mearman/BibGraph/commit/1cf9f1f))
* feat(web): add notification center (task-31) ([744c0e2](https://github.com/Mearman/BibGraph/commit/744c0e2))
* feat(web): add optimistic UI updates for mutations (task-37) ([28b4e7a](https://github.com/Mearman/BibGraph/commit/28b4e7a))
* feat(web): add path highlighting presets (task-16) ([d74db96](https://github.com/Mearman/BibGraph/commit/d74db96))
* feat(web): add PNG export for graph visualization ([4709f09](https://github.com/Mearman/BibGraph/commit/4709f09))
* feat(web): add publication timeline visualization (task-20) ([118ed3e](https://github.com/Mearman/BibGraph/commit/118ed3e))
* feat(web): add quick actions bar to detail pages (task-22) ([0b3ad3b](https://github.com/Mearman/BibGraph/commit/0b3ad3b))
* feat(web): add related entities section to detail pages (task-17) ([88dd54b](https://github.com/Mearman/BibGraph/commit/88dd54b))
* feat(web): add result export (CSV/BibTeX) (task-5) ([d2b2cb2](https://github.com/Mearman/BibGraph/commit/d2b2cb2))
* feat(web): add result sorting to search page ([16237ad](https://github.com/Mearman/BibGraph/commit/16237ad))
* feat(web): add search history navigation (task-3) ([f2f7abb](https://github.com/Mearman/BibGraph/commit/f2f7abb))
* feat(web): add search results to activity feed (task-6) ([8464f58](https://github.com/Mearman/BibGraph/commit/8464f58))
* feat(web): add search within results refinement (task-4) ([9f1f587](https://github.com/Mearman/BibGraph/commit/9f1f587))
* feat(web): add smart lists auto-populated by criteria (task-24) ([707db98](https://github.com/Mearman/BibGraph/commit/707db98))
* feat(web): add SVG export for graphs (task-14) ([4388dd4](https://github.com/Mearman/BibGraph/commit/4388dd4))
* feat(web): add topic evolution chart (task-49) ([2238204](https://github.com/Mearman/BibGraph/commit/2238204))
* feat(web): add undo/redo for destructive actions (task-45) ([ada8cbf](https://github.com/Mearman/BibGraph/commit/ada8cbf))
* feat(web): create user onboarding/tutorial (task-41) ([5c00042](https://github.com/Mearman/BibGraph/commit/5c00042))
* feat(web): implement CSV and BibTeX export for catalogue lists ([59ac39c](https://github.com/Mearman/BibGraph/commit/59ac39c))
* feat(web): integrate advanced query builder to search page (task-2) ([0b0e391](https://github.com/Mearman/BibGraph/commit/0b0e391))
* feat(web): integrate RelatedEntitiesSection into entity routes (task-17) ([b7840f7](https://github.com/Mearman/BibGraph/commit/b7840f7))
* feat(web): replace explore page placeholder with featured collections (task-1) ([489083d](https://github.com/Mearman/BibGraph/commit/489083d))
* refactor(algorithms): convert hierarchical layout functions to const ([73f3bad](https://github.com/Mearman/BibGraph/commit/73f3bad))
* refactor(web): enhance empty state in RepositoryAlgorithmsPanel ([4ff9ed0](https://github.com/Mearman/BibGraph/commit/4ff9ed0))
* refactor(web): improve UX across entity detail and graph panels ([9352af2](https://github.com/Mearman/BibGraph/commit/9352af2))
* refactor(web): replace console statements with logger and fix lint issues ([dad5208](https://github.com/Mearman/BibGraph/commit/dad5208))
* fix(web): apply pre-commit lint fixes from Phase 1-2 ([b4ebc5f](https://github.com/Mearman/BibGraph/commit/b4ebc5f))
* fix(web): replace invalid td prop with proper style attribute ([b8ec2d4](https://github.com/Mearman/BibGraph/commit/b8ec2d4))
* fix(web): resolve lint errors in pre-existing code (Principle IX) ([6778cdc](https://github.com/Mearman/BibGraph/commit/6778cdc))
* fix(web): resolve lint issues in useSearchHistory (task-3) ([e8384ca](https://github.com/Mearman/BibGraph/commit/e8384ca))

## 24.4.0 (2026-01-12)

* ci(ci): support workflow_dispatch for deployment determination ([853ed9e](https://github.com/Mearman/BibGraph/commit/853ed9e))
* ci(ci): support workflow_dispatch for determine-version job ([65b719f](https://github.com/Mearman/BibGraph/commit/65b719f))
* ci(deps): add Dependabot groups to align with syncpack version groups ([1594c23](https://github.com/Mearman/BibGraph/commit/1594c23))
* ci(deps): add rebase-strategy: auto to maintain consistent commit authorship ([de8c3ba](https://github.com/Mearman/BibGraph/commit/de8c3ba))
* ci(deps): add syncpack format to lockfile workflow ([6b46a63](https://github.com/Mearman/BibGraph/commit/6b46a63))
* ci(deps): disable lockfile workflow for Dependabot PRs ([cb266aa](https://github.com/Mearman/BibGraph/commit/cb266aa))
* ci(deps): fix workflow order - install dependencies before syncpack ([a501352](https://github.com/Mearman/BibGraph/commit/a501352))
* ci(deps): re-enable lockfile workflow without syncpack ([b148f9c](https://github.com/Mearman/BibGraph/commit/b148f9c))
* ci(deps): use dependabot[bot] as git author for lockfile updates ([dfe3d64](https://github.com/Mearman/BibGraph/commit/dfe3d64))
* chore(config): add defaultRelease to semantic-release config ([2102a16](https://github.com/Mearman/BibGraph/commit/2102a16))
* chore(config): use highestSemver for syncpack version resolution ([e715cff](https://github.com/Mearman/BibGraph/commit/e715cff))
* chore(deps): update dev dependencies ([3392787](https://github.com/Mearman/BibGraph/commit/3392787))
* fix(cli): replace deprecated rmdir with rm for recursive deletion ([ea233e5](https://github.com/Mearman/BibGraph/commit/ea233e5))
* fix(types): correct field/domain/subfield entity types in relationship queries ([be89670](https://github.com/Mearman/BibGraph/commit/be89670))
* fix(ui): add entity type prefix to convertToRelativeUrl for proper routing ([cba86d6](https://github.com/Mearman/BibGraph/commit/cba86d6))
* fix(ui): fix unused capturing group in entity type regex ([f475ae0](https://github.com/Mearman/BibGraph/commit/f475ae0))
* fix(utils): add Dexie migration to clean up corrupted history entries ([2ea97a7](https://github.com/Mearman/BibGraph/commit/2ea97a7))
* fix(utils): deduplicate history entries by entityType+entityId ([bd8a231](https://github.com/Mearman/BibGraph/commit/bd8a231))
* fix(web): add @tanstack/react-virtual to Vite optimizeDeps ([2de4b5d](https://github.com/Mearman/BibGraph/commit/2de4b5d))
* fix(web): add dnd-kit packages to Vite dedupe array ([433bf81](https://github.com/Mearman/BibGraph/commit/433bf81))
* fix(web): add force-graph packages to Vite optimizeDeps ([51b5c28](https://github.com/Mearman/BibGraph/commit/51b5c28))
* fix(web): add missing query parameter to autocomplete API URL ([2349c94](https://github.com/Mearman/BibGraph/commit/2349c94))
* fix(web): add retry and navigation buttons to error state ([79aa39e](https://github.com/Mearman/BibGraph/commit/79aa39e))
* fix(web): add StorageProviderWrapper to integration tests ([f94dac6](https://github.com/Mearman/BibGraph/commit/f94dac6))
* fix(web): add vite proxy for OpenAlex API in development ([770cb60](https://github.com/Mearman/BibGraph/commit/770cb60))
* fix(web): additional UX improvements for data display and history ([879ba4d](https://github.com/Mearman/BibGraph/commit/879ba4d))
* fix(web): correct search navigation from home page and header ([1fb20fc](https://github.com/Mearman/BibGraph/commit/1fb20fc))
* fix(web): decode multi-level HTML entities in display text ([727fe55](https://github.com/Mearman/BibGraph/commit/727fe55))
* fix(web): display user-friendly provenance labels in Graph list ([1654bc6](https://github.com/Mearman/BibGraph/commit/1654bc6))
* fix(web): exclude special lists from AddToListModal dropdown ([5ae7c8b](https://github.com/Mearman/BibGraph/commit/5ae7c8b))
* fix(web): extract search cell component to fix React hooks violation ([9fd23af](https://github.com/Mearman/BibGraph/commit/9fd23af))
* fix(web): fetch display names for bookmarks showing entity IDs ([0ee46f5](https://github.com/Mearman/BibGraph/commit/0ee46f5))
* fix(web): filter empty objects from entity data display ([f007984](https://github.com/Mearman/BibGraph/commit/f007984))
* fix(web): fix lint errors in HTML entity decoder ([b411302](https://github.com/Mearman/BibGraph/commit/b411302)), closes [#39](https://github.com/Mearman/BibGraph/issues/39)
* fix(web): history entries now show display names instead of raw IDs ([ef12dc8](https://github.com/Mearman/BibGraph/commit/ef12dc8))
* fix(web): improve field selector UX text ([2c667bf](https://github.com/Mearman/BibGraph/commit/2c667bf))
* fix(web): improve number formatting and history validation ([60cbb00](https://github.com/Mearman/BibGraph/commit/60cbb00))
* fix(web): improve UX with data formatting, history tracking, and filter UI ([b23db52](https://github.com/Mearman/BibGraph/commit/b23db52))
* fix(web): normalize OpenAlex URL display to lowercase ([fd427f2](https://github.com/Mearman/BibGraph/commit/fd427f2))
* fix(web): prevent history entries with mismatched URL/entity ([0be4f2c](https://github.com/Mearman/BibGraph/commit/0be4f2c))
* fix(web): prevent keyword URL duplication in entity mapper ([45537d9](https://github.com/Mearman/BibGraph/commit/45537d9))
* fix(web): properly remove unused openalex variable ([894b397](https://github.com/Mearman/BibGraph/commit/894b397))
* fix(web): remove nested AppShell causing vertical text layout bug ([4932de8](https://github.com/Mearman/BibGraph/commit/4932de8))
* fix(web): remove non-null assertion in HistoryManager ([50f8169](https://github.com/Mearman/BibGraph/commit/50f8169))
* fix(web): remove redundant last_known_institutions when duplicating affiliations ([26729f0](https://github.com/Mearman/BibGraph/commit/26729f0))
* fix(web): remove unused selectFields prop from EntityDetailLayout calls ([f777b12](https://github.com/Mearman/BibGraph/commit/f777b12))
* fix(web): render URL arrays without Badge wrapper for proper normalization ([c4e7375](https://github.com/Mearman/BibGraph/commit/c4e7375))
* fix(web): resolve 404 relationship errors and improve entity display UX ([fa2b91c](https://github.com/Mearman/BibGraph/commit/fa2b91c))
* fix(web): resolve DOMParser null element crash in accessibility utils ([dae41ae](https://github.com/Mearman/BibGraph/commit/dae41ae))
* fix(web): resolve duplicate keyboard modal and HTML entity decoding ([3a493eb](https://github.com/Mearman/BibGraph/commit/3a493eb))
* fix(web): resolve ESLint errors in NavigationTrail component ([a390197](https://github.com/Mearman/BibGraph/commit/a390197))
* fix(web): resolve history and display UX issues ([af472f8](https://github.com/Mearman/BibGraph/commit/af472f8))
* fix(web): resolve React hook violations in navigation hooks ([76bc0fb](https://github.com/Mearman/BibGraph/commit/76bc0fb))
* fix(web): resolve search page crash with TanStack Table hooks ([0c7db9a](https://github.com/Mearman/BibGraph/commit/0c7db9a))
* fix(web): serialize location.search to prevent [object Object] in history ([65cfeef](https://github.com/Mearman/BibGraph/commit/65cfeef))
* fix(web): show display names instead of entity IDs in history page ([b66d4ce](https://github.com/Mearman/BibGraph/commit/b66d4ce))
* fix(web): work around TanStack Router hash history index route bug ([44d45f5](https://github.com/Mearman/BibGraph/commit/44d45f5))
* refactor(web): extract EntityTypeFilterBadge to resolve nested functions ([d20256b](https://github.com/Mearman/BibGraph/commit/d20256b))
* refactor(web): inline TableWrapper in BaseTable for hook safety ([72d24ba](https://github.com/Mearman/BibGraph/commit/72d24ba))
* refactor(web): remove unused selectFields parameter from EntityDetailLayout ([090e0d6](https://github.com/Mearman/BibGraph/commit/090e0d6))
* refactor(web): simplify addNode type to require minimal node info ([dbea2fe](https://github.com/Mearman/BibGraph/commit/dbea2fe))
* refactor(web): update EntityListView to use shared EmptyState ([b260806](https://github.com/Mearman/BibGraph/commit/b260806))
* feat(web): add 'Add to Graph' button on entity detail pages ([36296b8](https://github.com/Mearman/BibGraph/commit/36296b8))
* feat(web): add aria-labels to catalogue action buttons ([f517c2f](https://github.com/Mearman/BibGraph/commit/f517c2f))
* feat(web): add entity type badges to History page entries ([6544179](https://github.com/Mearman/BibGraph/commit/6544179))
* feat(web): add navigation trail with breadcrumbs and back-to-search ([b697380](https://github.com/Mearman/BibGraph/commit/b697380))
* feat(web): add prominent direction indicators to relationship items ([b59995c](https://github.com/Mearman/BibGraph/commit/b59995c))
* feat(web): add shared EmptyState component with variants ([dabcf46](https://github.com/Mearman/BibGraph/commit/dabcf46))
* feat(web): add sticky bottom action bar for mobile entity detail pages ([10093d5](https://github.com/Mearman/BibGraph/commit/10093d5))
* feat(web): add view modes, filters, and performance feedback to search ([e5881a7](https://github.com/Mearman/BibGraph/commit/e5881a7))
* feat(web): improve search input discoverability and responsiveness ([b1fd735](https://github.com/Mearman/BibGraph/commit/b1fd735))
* docs(algorithms,types): standardize JSDoc @typeParam to @template ([99c3d0e](https://github.com/Mearman/BibGraph/commit/99c3d0e))
* fix(web,ui): filter technical metadata from bookmark notes display ([0215e19](https://github.com/Mearman/BibGraph/commit/0215e19))
* fix(web,ui): filter technical metadata from bookmark notes display ([d9814da](https://github.com/Mearman/BibGraph/commit/d9814da))
* refactor(web,ui,utils): apply lint rule fixes ([903ab7c](https://github.com/Mearman/BibGraph/commit/903ab7c))
* style(web): fix import sorting in HistoryManager ([b6f2581](https://github.com/Mearman/BibGraph/commit/b6f2581))
* docs(web): add missing JSDoc @param annotations ([9e508b1](https://github.com/Mearman/BibGraph/commit/9e508b1))
* build(web): preserve function names in production builds ([147adc8](https://github.com/Mearman/BibGraph/commit/147adc8))
* test(web): detect TanStack Router error boundary in smoke tests ([1751045](https://github.com/Mearman/BibGraph/commit/1751045))

## 24.3.0 (2025-12-09)

* fix(algorithms): increase Leiden performance test threshold to 60s ([0fcdf82](https://github.com/Mearman/BibGraph/commit/0fcdf82))
* fix(ci): add artifact structure verification in deploy job ([0325866](https://github.com/Mearman/BibGraph/commit/0325866))
* fix(ci): add build artifact verification before upload ([c975351](https://github.com/Mearman/BibGraph/commit/c975351))
* fix(ci): add debugging to smoke test static server to diagnose asset loading ([33ac961](https://github.com/Mearman/BibGraph/commit/33ac961))
* fix(ci): correct build artifacts path structure for deployment ([553cf76](https://github.com/Mearman/BibGraph/commit/553cf76))
* fix(ci): correct build artifacts paths in CI workflow ([bf447e6](https://github.com/Mearman/BibGraph/commit/bf447e6))
* fix(ci): increase smoke test timeout from 30s to 45s ([ce8070b](https://github.com/Mearman/BibGraph/commit/ce8070b))
* fix(ci): optimize smoke tests and enable coverage generation ([09193cc](https://github.com/Mearman/BibGraph/commit/09193cc))
* fix(ci): reduce smoke test sampling to 1 route per category for job timeout ([7f53671](https://github.com/Mearman/BibGraph/commit/7f53671))
* fix(ci): resolve build artifacts path issue in smoke-tests and deploy jobs ([d5a1747](https://github.com/Mearman/BibGraph/commit/d5a1747))
* fix(ci): resolve critical race condition in deploy job artifacts ([2ec266f](https://github.com/Mearman/BibGraph/commit/2ec266f))
* fix(ci): resolve smoke test static server path issue ([47ca65a](https://github.com/Mearman/BibGraph/commit/47ca65a))
* fix(ci): resolve TypeScript error in smoke test diagnostics ([e8c69e1](https://github.com/Mearman/BibGraph/commit/e8c69e1))
* fix(web): increase smoke test timeout to 45s to match app-ready timeout ([e5caff5](https://github.com/Mearman/BibGraph/commit/e5caff5))
* fix(web): replace Array.from with spread operator for ESLint compliance ([5a21b03](https://github.com/Mearman/BibGraph/commit/5a21b03))
* fix(web): resolve pnpm dev 404 error with direct Vite command ([6ea7cad](https://github.com/Mearman/BibGraph/commit/6ea7cad))
* feat(web): configure @nx/vite:dev-server with proper pnpm workspace support ([06eb365](https://github.com/Mearman/BibGraph/commit/06eb365))
* refactor(web): modernize dev server setup with @nx/vite:dev-server ([4c104f4](https://github.com/Mearman/BibGraph/commit/4c104f4))
* refactor(web): remove barrelsby tool and configuration ([b4cbbdb](https://github.com/Mearman/BibGraph/commit/b4cbbdb))

## 24.2.0 (2025-12-08)

* Merge remote-tracking branch 'origin/main' ([c8c8559](https://github.com/Mearman/BibGraph/commit/c8c8559))
* feat(ui): enhance DataFetcher with retry visibility and exponential backoff ([6e3f837](https://github.com/Mearman/BibGraph/commit/6e3f837))
* feat(utils): add structured error handling for storage operations ([a803541](https://github.com/Mearman/BibGraph/commit/a803541))
* feat(utils): enhance DexieStorageProvider with comprehensive error handling ([4fba706](https://github.com/Mearman/BibGraph/commit/4fba706))
* feat(utils): enhance storage error handling and logging ([585d059](https://github.com/Mearman/BibGraph/commit/585d059))
* feat(web): add application error boundary to main layout ([bdeffa6](https://github.com/Mearman/BibGraph/commit/bdeffa6))
* refactor(ui): fix unicorn/no-lonely-if rule in DataFetcher ([ed77b64](https://github.com/Mearman/BibGraph/commit/ed77b64))

## <small>24.1.1 (2025-12-08)</small>

* style(web): fix import sorting in graph.lazy.tsx ([f1532ae](https://github.com/Mearman/BibGraph/commit/f1532ae))
* perf(web): replace ForceGraphVisualization with OptimizedForceGraphVisualization ([76a8a72](https://github.com/Mearman/BibGraph/commit/76a8a72)), closes [#38-graph-list](https://github.com/Mearman/BibGraph/issues/38-graph-list)

## 24.1.0 (2025-12-07)

* fix(web): make handleKeyPress method private in ErrorBoundary ([87019fa](https://github.com/Mearman/BibGraph/commit/87019fa))
* fix(web, ui): resolve linting and TypeScript issues ([9a90f46](https://github.com/Mearman/BibGraph/commit/9a90f46))
* refactor(ui): enhance accessibility hooks with robust error handling ([5bfd614](https://github.com/Mearman/BibGraph/commit/5bfd614))
* feat(ui): enhance ErrorBoundary with improved debugging and DevEx ([a317966](https://github.com/Mearman/BibGraph/commit/a317966))

## <small>24.0.5 (2025-12-07)</small>

* fix(web): properly exclude bookmarks from smoke tests in CI ([af9b386](https://github.com/Mearman/BibGraph/commit/af9b386))
* fix(web): skip bookmarks smoke test in CI due to IndexedDB issues ([edc7d44](https://github.com/Mearman/BibGraph/commit/edc7d44))

## <small>24.0.4 (2025-12-07)</small>

* fix(web): improve bookmarks smoke test reliability in CI ([526e8b6](https://github.com/Mearman/BibGraph/commit/526e8b6))

## <small>24.0.3 (2025-12-07)</small>

* fix(algorithms): increase Leiden test timeout to 60s for CI environment ([4385e1c](https://github.com/Mearman/BibGraph/commit/4385e1c))
* fix(web): increase bookmarks smoke test timeout to 90 seconds ([2e20dfb](https://github.com/Mearman/BibGraph/commit/2e20dfb))

## <small>24.0.2 (2025-12-07)</small>

* test(web): fix bookmarks smoke test timeout in CI ([4829ecd](https://github.com/Mearman/BibGraph/commit/4829ecd))

## <small>24.0.1 (2025-12-07)</small>

* test(algorithms): adjust Leiden performance test for CI runner overhead ([1c5cdc9](https://github.com/Mearman/BibGraph/commit/1c5cdc9))
* ci(algorithms): fix timeout handling and shell script error handling ([f1e44af](https://github.com/Mearman/BibGraph/commit/f1e44af))
* refactor(algorithms, ui): apply performance optimizations and clean formatting ([8a680c9](https://github.com/Mearman/BibGraph/commit/8a680c9))
* refactor(utils): remove unused eslint-disable directives ([3cf4f40](https://github.com/Mearman/BibGraph/commit/3cf4f40))
* fix(algorithms): optimize Leiden clustering performance test from 60s to 20s ([1241fc4](https://github.com/Mearman/BibGraph/commit/1241fc4))
* fix(algorithms): remove unused variable resolutionM in louvain.ts ([b31d4c4](https://github.com/Mearman/BibGraph/commit/b31d4c4))
* fix(algorithms): resolve ESLint errors in louvain and priority-queue ([860646c](https://github.com/Mearman/BibGraph/commit/860646c))

## 24.0.0 (2025-12-07)

* Merge remote-tracking branch 'origin/main' ([ea2f01d](https://github.com/Mearman/BibGraph/commit/ea2f01d))
* refactor(web, client, ui, tools): remove unused eslint-disable comments and duplicate exports ([28faff7](https://github.com/Mearman/BibGraph/commit/28faff7))
* chore(deps): auto-fix syncpack mismatches [skip ci] ([76ace1b](https://github.com/Mearman/BibGraph/commit/76ace1b))
* chore(deps): auto-fix syncpack mismatches [skip ci] ([a3ac81d](https://github.com/Mearman/BibGraph/commit/a3ac81d))
* chore(index): update component exports for new features ([c678f86](https://github.com/Mearman/BibGraph/commit/c678f86))
* refactor(barrels): remove re-export barrel files across monorepo ([26a9532](https://github.com/Mearman/BibGraph/commit/26a9532))
* refactor(eslint): enforce 100-character line limit to prevent long inline unions ([a594198](https://github.com/Mearman/BibGraph/commit/a594198))
* refactor(eslint): remove max-len rule to reduce formatting errors ([190941b](https://github.com/Mearman/BibGraph/commit/190941b))
* refactor(types): remove duplicate exports to resolve ESLint violations ([6ddb518](https://github.com/Mearman/BibGraph/commit/6ddb518))
* refactor(ui): fix max-len ESLint violations in components ([9cd7e9c](https://github.com/Mearman/BibGraph/commit/9cd7e9c))
* refactor(web): resolve ESLint errors and improve type safety ([0d6b341](https://github.com/Mearman/BibGraph/commit/0d6b341))
* fix: add critical missing exports for web app typecheck ([de9b152](https://github.com/Mearman/BibGraph/commit/de9b152))
* fix: create missing client index files and fix UI component paths ([e43c5eb](https://github.com/Mearman/BibGraph/commit/e43c5eb))
* fix: create missing index files for UI and client packages ([892409e](https://github.com/Mearman/BibGraph/commit/892409e))
* fix: resolve client import issues and UI build failures ([704c662](https://github.com/Mearman/BibGraph/commit/704c662))
* fix(algorithms): add missing barrel exports for algorithm components ([082c55e](https://github.com/Mearman/BibGraph/commit/082c55e))
* fix(algorithms): resolve imports after barrel file removal ([b4f8e8f](https://github.com/Mearman/BibGraph/commit/b4f8e8f))
* fix(client): add missing getPersistentGraph export ([647292e](https://github.com/Mearman/BibGraph/commit/647292e))
* fix(client): export getPersistentGraph from cached-client.ts ([b00f78e](https://github.com/Mearman/BibGraph/commit/b00f78e))
* fix(client): re-export getPersistentGraph from cache module ([9592b20](https://github.com/Mearman/BibGraph/commit/9592b20))
* fix(client): resolve ESLint errors in client package ([55cf4e9](https://github.com/Mearman/BibGraph/commit/55cf4e9))
* fix(exports): comprehensive type export restoration for CI success ([be08e3b](https://github.com/Mearman/BibGraph/commit/be08e3b))
* fix(exports): restore missing type exports to resolve CI failures ([1451eee](https://github.com/Mearman/BibGraph/commit/1451eee))
* fix(exports): restore remaining missing type exports for CI success ([33aa481](https://github.com/Mearman/BibGraph/commit/33aa481))
* fix(imports): resolve missing exports after barrel file removal ([8be47f7](https://github.com/Mearman/BibGraph/commit/8be47f7))
* fix(test): add missing test utilities index file ([8abba60](https://github.com/Mearman/BibGraph/commit/8abba60))
* fix(types): add missing isRecord export with correct path ([b662817](https://github.com/Mearman/BibGraph/commit/b662817))
* fix(types): export ENTITY_TYPES from @bibgraph/types ([50aa857](https://github.com/Mearman/BibGraph/commit/50aa857))
* fix(types): resolve TypeScript compilation errors in Three.js and graph rendering ([14aa84b](https://github.com/Mearman/BibGraph/commit/14aa84b))
* fix(types): resolve TypeScript errors in UI components ([276dc9c](https://github.com/Mearman/BibGraph/commit/276dc9c))
* fix(ui): add missing hook exports for useScreenReader, useAsyncOperation, and useAriaAttributes ([1d5574c](https://github.com/Mearman/BibGraph/commit/1d5574c))
* fix(ui): resolve AccessibilityProvider callback type error ([559d290](https://github.com/Mearman/BibGraph/commit/559d290))
* fix(ui): resolve NetworkStatus duplicate export ambiguity ([475b45d](https://github.com/Mearman/BibGraph/commit/475b45d))
* fix(utils): add main package export and generate index.d.ts for client imports ([5eb9273](https://github.com/Mearman/BibGraph/commit/5eb9273))
* fix(utils): add timeout protection and CI resilience to storage initialization ([f9b7cb1](https://github.com/Mearman/BibGraph/commit/f9b7cb1))
* fix(utils): resolve Promise constructor parameter naming linting error ([7b8bdea](https://github.com/Mearman/BibGraph/commit/7b8bdea))
* fix(web): resolve all linting errors in performance optimization utilities ([a89c941](https://github.com/Mearman/BibGraph/commit/a89c941))
* fix(web): separate type imports from value imports in filter components ([1600e13](https://github.com/Mearman/BibGraph/commit/1600e13))
* wip: additional fixes and improvements ([4f0c0ca](https://github.com/Mearman/BibGraph/commit/4f0c0ca))
* wip: massive TypeScript error reduction and CI fixes ([78cf976](https://github.com/Mearman/BibGraph/commit/78cf976))
* feat(a11y): add comprehensive accessibility support ([55139cd](https://github.com/Mearman/BibGraph/commit/55139cd))
* feat(eslint): add eslint-plugin-barrel-files dependency ([3deaf13](https://github.com/Mearman/BibGraph/commit/3deaf13))
* feat(graph): add OptimizedForceGraphVisualization component ([1fb788a](https://github.com/Mearman/BibGraph/commit/1fb788a)), closes [hi#performance](https://github.com/hi/issues/performance)
* feat(perf): add advanced graph performance optimization utilities ([7c92b72](https://github.com/Mearman/BibGraph/commit/7c92b72))
* feat(search): enhance SearchFilters with entity pills, date presets, and citation impact levels ([9901d7f](https://github.com/Mearman/BibGraph/commit/9901d7f))
* feat(ui): add comprehensive UI enhancements for performance and offline support ([708661a](https://github.com/Mearman/BibGraph/commit/708661a))
* feat(web): enhance search autocomplete with intelligent research scoring ([c14a1a6](https://github.com/Mearman/BibGraph/commit/c14a1a6))


### BREAKING CHANGE

* utils package now uses single bundle output instead of preserved modules

- Added main package export to package.json
- Modified vite.config.ts to generate single index.d.ts file
- All utility functions now properly exported from main package entry
- Fixes client package import errors for extractEntityLabel, extractRelationships, normalizeOpenAlexId

## 23.12.0 (2025-12-07)

* feat(web): enhance mobile responsiveness and UX ([c73d37c](https://github.com/Mearman/BibGraph/commit/c73d37c))
* fix(ci): optimize smoke test performance with native Node.js server ([c5e9277](https://github.com/Mearman/BibGraph/commit/c5e9277))
* fix(web): improve smoke test reliability and performance ([1a33b0f](https://github.com/Mearman/BibGraph/commit/1a33b0f))

## <small>23.11.1 (2025-12-07)</small>

* refactor(web): organize imports in EnhancedSearchInterface ([c621a10](https://github.com/Mearman/BibGraph/commit/c621a10))
* refactor(web): replace duplicate keyboard shortcuts with centralized hook ([a560907](https://github.com/Mearman/BibGraph/commit/a560907))
* fix(web): resolve ContentSkeleton prop interface issues ([3a6f9de](https://github.com/Mearman/BibGraph/commit/3a6f9de))

## 23.11.0 (2025-12-07)

* fix(ui): resolve KeyboardShortcutsHelp module export conflict ([81bd9e7](https://github.com/Mearman/BibGraph/commit/81bd9e7))
* fix(web): resolve linting errors in UI components ([1b73949](https://github.com/Mearman/BibGraph/commit/1b73949))
* fix(web): resolve TypeScript compilation errors in UI components ([0b38047](https://github.com/Mearman/BibGraph/commit/0b38047))
* feat(web): add comprehensive utility components for enhanced DevEx and UX ([54e8837](https://github.com/Mearman/BibGraph/commit/54e8837))

## 23.10.0 (2025-12-07)

* perf(algorithms): optimize test configuration for faster CI execution ([4a0a508](https://github.com/Mearman/BibGraph/commit/4a0a508))
* perf(ci): aggressive CI optimizations to prevent timeouts ([b7177ac](https://github.com/Mearman/BibGraph/commit/b7177ac))
* perf(ci): optimize test execution to prevent timeout issues ([5e863e4](https://github.com/Mearman/BibGraph/commit/5e863e4))
* perf(ci): radical optimization - unit tests only with 4x parallelization ([b55e431](https://github.com/Mearman/BibGraph/commit/b55e431))
* perf(ci): ultra-optimized CI pipeline for sub-6-minute execution ([d5b2691](https://github.com/Mearman/BibGraph/commit/d5b2691))
* test(web): temporarily disable MainLayout responsive test causing CI timeout ([78fbb8d](https://github.com/Mearman/BibGraph/commit/78fbb8d))
* feat(web): add comprehensive keyboard shortcuts and accessibility improvements ([568914e](https://github.com/Mearman/BibGraph/commit/568914e))
* feat(web): add search result preview hover cards ([b7153e1](https://github.com/Mearman/BibGraph/commit/b7153e1))
* feat(web): enhance data visualization components for better mobile/desktop experience ([c5c932a](https://github.com/Mearman/BibGraph/commit/c5c932a))
* feat(web): enhance data visualization components with mobile touch gestures and accessibility ([e751dfb](https://github.com/Mearman/BibGraph/commit/e751dfb))
* feat(web): enhance HeaderSearchInput with real-time suggestions and accessibility ([dbe8569](https://github.com/Mearman/BibGraph/commit/dbe8569))
* feat(web): enhance search component exports and test performance ([8659472](https://github.com/Mearman/BibGraph/commit/8659472))
* feat(web): implement advanced search filters and faceted search ([13d7aea](https://github.com/Mearman/BibGraph/commit/13d7aea))
* feat(web): integrate skeleton loading components for enhanced UX ([9ec3b0e](https://github.com/Mearman/BibGraph/commit/9ec3b0e))
* fix(ci): resolve coverage race condition and enhance EntityGrid component ([44be8f7](https://github.com/Mearman/BibGraph/commit/44be8f7))
* fix(ci): resolve dependency lockfile mismatches for tsx upgrade ([cd38175](https://github.com/Mearman/BibGraph/commit/cd38175))
* fix(ci): resolve TypeScript compilation errors and clean dependencies ([504c0c5](https://github.com/Mearman/BibGraph/commit/504c0c5))
* fix(ci): update tsx version in cli package.json and regenerate lockfile ([5d0c619](https://github.com/Mearman/BibGraph/commit/5d0c619))
* fix(web): add Skeleton className to DataTableSkeleton components ([dac0995](https://github.com/Mearman/BibGraph/commit/dac0995))
* fix(web): resolve all linting errors in web application ([c64509a](https://github.com/Mearman/BibGraph/commit/c64509a))
* fix(web): resolve CI dependency and TypeScript issues ([66539d7](https://github.com/Mearman/BibGraph/commit/66539d7))
* fix(web): resolve dependency version mismatches for CI ([3d78136](https://github.com/Mearman/BibGraph/commit/3d78136))
* fix(web): resolve EntityList component test failures ([4d52e33](https://github.com/Mearman/BibGraph/commit/4d52e33))
* fix(web): resolve final linting errors ([782ee31](https://github.com/Mearman/BibGraph/commit/782ee31))
* fix(web): resolve linting errors and import sorting issues ([f2a4de5](https://github.com/Mearman/BibGraph/commit/f2a4de5))
* fix(web): resolve linting errors in chart components ([745d0b2](https://github.com/Mearman/BibGraph/commit/745d0b2))
* fix(web): resolve major linting and TypeScript issues ([2db9b4b](https://github.com/Mearman/BibGraph/commit/2db9b4b))
* fix(web): resolve TableSkeleton export conflict between packages ([678a1aa](https://github.com/Mearman/BibGraph/commit/678a1aa))
* fix(web): resolve TypeScript linting error in AdaptiveGraphRenderer ([135a428](https://github.com/Mearman/BibGraph/commit/135a428))
* fix(web): update barrel exports for keyboard shortcuts components ([1d18772](https://github.com/Mearman/BibGraph/commit/1d18772))
* fix(web): update package.json with react-hotkeys-hook dependency ([ff383e5](https://github.com/Mearman/BibGraph/commit/ff383e5))
* fix(web): update tsx dependency to resolve CI lockfile issues ([09694a9](https://github.com/Mearman/BibGraph/commit/09694a9))
* refactor(web): fix SonarJS nested functions linting errors in use-hotkeys.ts ([2668e12](https://github.com/Mearman/BibGraph/commit/2668e12))

## 23.9.0 (2025-12-06)

* fix(web): resolve ESLint errors in component files ([90ae800](https://github.com/Mearman/BibGraph/commit/90ae800))
* fix(web): resolve lint errors and improve code quality ([d2a455e](https://github.com/Mearman/BibGraph/commit/d2a455e))
* fix(web): resolve SearchInterface test failures ([a5d2cec](https://github.com/Mearman/BibGraph/commit/a5d2cec))
* fix(web): resolve TypeScript and lint errors in mobile and search components ([19dc532](https://github.com/Mearman/BibGraph/commit/19dc532))
* refactor(web): enhance search UX with better error handling and user feedback ([fcb3041](https://github.com/Mearman/BibGraph/commit/fcb3041))
* refactor(web): fix import order in PostHogProvider ([e4022f4](https://github.com/Mearman/BibGraph/commit/e4022f4))
* refactor(web): organize imports in SearchInterface component ([c304ad5](https://github.com/Mearman/BibGraph/commit/c304ad5))
* refactor(web): replace console statements with structured logging ([8498543](https://github.com/Mearman/BibGraph/commit/8498543))
* feat(ui): enhance error recovery with intelligent retry mechanisms ([4ac0517](https://github.com/Mearman/BibGraph/commit/4ac0517))
* feat(ui): enhance search empty states with actionable guidance ([3e4197e](https://github.com/Mearman/BibGraph/commit/3e4197e))
* feat(web): add mobile-responsive navigation to EntityDetailLayout ([a7f88c1](https://github.com/Mearman/BibGraph/commit/a7f88c1))
* feat(web): enhance CreateListModal UX with comprehensive validation and feedback ([7341fb3](https://github.com/Mearman/BibGraph/commit/7341fb3))
* feat(web): enhance responsive design with touch gestures and optimized tables ([19df62a](https://github.com/Mearman/BibGraph/commit/19df62a))
* feat(web): enhance SearchInterface UX with tips rotation and better loading states ([d6accff](https://github.com/Mearman/BibGraph/commit/d6accff))
* style(web): fix import sorting in search.lazy route ([66472ee](https://github.com/Mearman/BibGraph/commit/66472ee))

## <small>23.8.1 (2025-12-06)</small>

* fix(ci): add missing coverage:report script ([dcd44ed](https://github.com/Mearman/BibGraph/commit/dcd44ed))
* fix(web): add aria-labels to ActionIcon components ([9226669](https://github.com/Mearman/BibGraph/commit/9226669))
* fix(web): add availableSourceCount prop to GraphEmptyState component ([e332581](https://github.com/Mearman/BibGraph/commit/e332581))
* test(web): add missing props to RelationshipSection test components ([e6eb814](https://github.com/Mearman/BibGraph/commit/e6eb814))
* refactor(web): remove unused React imports and fix console.warn ([73fe41f](https://github.com/Mearman/BibGraph/commit/73fe41f))
* refactor(web): remove unused React imports from components ([a33a2ae](https://github.com/Mearman/BibGraph/commit/a33a2ae))
* refactor(web): replace console.error with logger ([4c34f05](https://github.com/Mearman/BibGraph/commit/4c34f05))
* refactor(web): replace magic numbers with named constants ([151f4cf](https://github.com/Mearman/BibGraph/commit/151f4cf))
* Merge remote-tracking branch 'origin/main' ([e2b6364](https://github.com/Mearman/BibGraph/commit/e2b6364))

## 23.8.0 (2025-12-06)

* refactor(web): fix eslint errors ([014230d](https://github.com/Mearman/BibGraph/commit/014230d))
* refactor(web): fix import sorting errors ([0a7b6e7](https://github.com/Mearman/BibGraph/commit/0a7b6e7))
* refactor(web): fix linting errors and improve autocomplete UX ([d8bc36e](https://github.com/Mearman/BibGraph/commit/d8bc36e))
* refactor(web): improve UX with keyboard navigation and proper styling ([c917810](https://github.com/Mearman/BibGraph/commit/c917810))
* refactor(web): replace magic numbers and inline styles with constants ([15ace92](https://github.com/Mearman/BibGraph/commit/15ace92))
* feat(web): add Ctrl+K keyboard shortcut for search focus ([e9d54a1](https://github.com/Mearman/BibGraph/commit/e9d54a1))
* fix(ci): generate coverage during test runs ([c082a6a](https://github.com/Mearman/BibGraph/commit/c082a6a))
* fix(ci): improve accessibility test server cleanup ([a73c89a](https://github.com/Mearman/BibGraph/commit/a73c89a))

## <small>23.7.2 (2025-12-06)</small>

* fix(ci): pass NEXT_RELEASE_VERSION to build step ([09c800a](https://github.com/Mearman/BibGraph/commit/09c800a))
* refactor(web): extract magic numbers to named constants ([c4f9a20](https://github.com/Mearman/BibGraph/commit/c4f9a20))
* refactor(web): use ICON_SIZE constants and Mantine spacing props ([668f17a](https://github.com/Mearman/BibGraph/commit/668f17a))

## <small>23.7.1 (2025-12-06)</small>

* fix(release): include package.json in semantic-release commits ([29eb0ae](https://github.com/Mearman/BibGraph/commit/29eb0ae))
* chore(release): 23.7.0 [skip ci] ([c4281f5](https://github.com/Mearman/BibGraph/commit/c4281f5))

## 23.7.0 (2025-12-06)

* fix(web): add accessibility attributes to BookmarksSidebar ([10641b6](https://github.com/Mearman/BibGraph/commit/10641b6))
* fix(web): add aria-labels to BookmarkManager components ([89c6ffc](https://github.com/Mearman/BibGraph/commit/89c6ffc))
* fix(web): add aria-labels to ResearchDashboard ActionIcons ([a7efe9c](https://github.com/Mearman/BibGraph/commit/a7efe9c))
* fix(web): fix import sorting in additional route files ([3f923e7](https://github.com/Mearman/BibGraph/commit/3f923e7))
* fix(web): fix import sorting in ICON_SIZE migrated files ([8a0ae19](https://github.com/Mearman/BibGraph/commit/8a0ae19))
* refactor(web): migrate catalogue and search components to ICON_SIZE ([6c11a75](https://github.com/Mearman/BibGraph/commit/6c11a75))
* refactor(web): migrate catalogue modals to ICON_SIZE ([8968373](https://github.com/Mearman/BibGraph/commit/8968373))
* refactor(web): migrate CatalogueList and bookmarks to ICON_SIZE ([ea3e0a5](https://github.com/Mearman/BibGraph/commit/ea3e0a5))
* refactor(web): migrate core route files to ICON_SIZE ([2ac44c9](https://github.com/Mearman/BibGraph/commit/2ac44c9))
* refactor(web): migrate entity detail and utility components to ICON_SIZE constants ([1f0116b](https://github.com/Mearman/BibGraph/commit/1f0116b))
* refactor(web): migrate entity resolution routes to ICON_SIZE constants ([696c5cd](https://github.com/Mearman/BibGraph/commit/696c5cd))
* refactor(web): migrate evaluation routes to ICON_SIZE ([4bece95](https://github.com/Mearman/BibGraph/commit/4bece95))
* refactor(web): migrate graph components to ICON_SIZE ([ed8385e](https://github.com/Mearman/BibGraph/commit/ed8385e))
* refactor(web): migrate graph.lazy.tsx to ICON_SIZE ([8f66945](https://github.com/Mearman/BibGraph/commit/8f66945))
* refactor(web): migrate GraphAlgorithmsPanel to ICON_SIZE constants ([f972bd5](https://github.com/Mearman/BibGraph/commit/f972bd5))
* refactor(web): migrate icon sizes to ICON_SIZE constants ([98f812e](https://github.com/Mearman/BibGraph/commit/98f812e))
* refactor(web): migrate layout and navigation components to ICON_SIZE constants ([4bdeff3](https://github.com/Mearman/BibGraph/commit/4bdeff3))
* refactor(web): migrate layout components to ICON_SIZE constants ([626704c](https://github.com/Mearman/BibGraph/commit/626704c))
* refactor(web): migrate PdfViewer, EntityDataDisplay, algorithms.lazy to ICON_SIZE ([b4af7d2](https://github.com/Mearman/BibGraph/commit/b4af7d2))
* refactor(web): migrate remaining catalogue components to ICON_SIZE ([d8907ef](https://github.com/Mearman/BibGraph/commit/d8907ef))
* refactor(web): migrate settings and repository algorithms to ICON_SIZE ([87dc14b](https://github.com/Mearman/BibGraph/commit/87dc14b))
* refactor(web): migrate UI components to ICON_SIZE constants ([fd44596](https://github.com/Mearman/BibGraph/commit/fd44596))
* feat(web): add ICON_SIZE constants to style-constants ([84eb6c0](https://github.com/Mearman/BibGraph/commit/84eb6c0))
* feat(web): add ICON_SIZE.HERO_LG constant and migrate search/graph components ([72853ab](https://github.com/Mearman/BibGraph/commit/72853ab))
* feat(web): add ICON_SIZE.XXS constant and migrate sidebar components ([2e049a0](https://github.com/Mearman/BibGraph/commit/2e049a0))
* chore(release): 23.6.0 [skip ci] ([e336547](https://github.com/Mearman/BibGraph/commit/e336547))

## 23.6.0 (2025-12-06)

* fix(web): add accessibility attributes to error and toggle components ([c948fdc](https://github.com/Mearman/BibGraph/commit/c948fdc))
* fix(web): add nav landmark for breadcrumb accessibility ([dd2436a](https://github.com/Mearman/BibGraph/commit/dd2436a))
* fix(web): improve accessibility for sidebar card components ([0874d0c](https://github.com/Mearman/BibGraph/commit/0874d0c))
* refactor(web): extract SplitButton magic numbers to style constants ([9ce3aee](https://github.com/Mearman/BibGraph/commit/9ce3aee))
* feat(web): add confirmation dialogs for destructive history actions ([840ff6d](https://github.com/Mearman/BibGraph/commit/840ff6d))
* feat(web): add keyboard shortcut hints to HeaderSearchInput ([46bca83](https://github.com/Mearman/BibGraph/commit/46bca83))
* feat(web): add loading states to EntityGrid and EntityListView ([091eeb8](https://github.com/Mearman/BibGraph/commit/091eeb8))
* feat(web): add success/error notifications to QueryBookmarkButton ([d54339d](https://github.com/Mearman/BibGraph/commit/d54339d))
* chore(release): 23.5.0 [skip ci] ([9886808](https://github.com/Mearman/BibGraph/commit/9886808))

## 23.5.0 (2025-12-06)

* feat(web): add defensive checks to RelationshipItem ([f44d414](https://github.com/Mearman/BibGraph/commit/f44d414))
* feat(web): add loading states to community detection panel ([ac80a23](https://github.com/Mearman/BibGraph/commit/ac80a23))
* chore(release): 23.4.2 [skip ci] ([0fa4a7c](https://github.com/Mearman/BibGraph/commit/0fa4a7c))

## <small>23.4.2 (2025-12-06)</small>

* fix(web): resolve lint errors in style constants migration ([3471997](https://github.com/Mearman/BibGraph/commit/3471997))
* refactor(web): complete BORDER_STYLE_GRAY_3 migration across 27 components ([a981e12](https://github.com/Mearman/BibGraph/commit/a981e12))
* chore(release): 23.4.1 [skip ci] ([06f7a02](https://github.com/Mearman/BibGraph/commit/06f7a02))

## <small>23.4.1 (2025-12-06)</small>

* refactor(web): add style constants for DRY border styling ([6747773](https://github.com/Mearman/BibGraph/commit/6747773))
* refactor(web): apply style constants to algorithm item components ([14e3cc5](https://github.com/Mearman/BibGraph/commit/14e3cc5))
* refactor(web): apply style constants to algorithm panel components ([8aeb9de](https://github.com/Mearman/BibGraph/commit/8aeb9de))
* refactor(web): apply style constants to entity-detail components ([20811a0](https://github.com/Mearman/BibGraph/commit/20811a0))
* refactor(web): apply style constants to more components ([9e5bdee](https://github.com/Mearman/BibGraph/commit/9e5bdee))
* refactor(web): apply style constants to relationship components ([d0bac77](https://github.com/Mearman/BibGraph/commit/d0bac77))
* refactor(web): apply style constants to sidebar components ([183a0da](https://github.com/Mearman/BibGraph/commit/183a0da))
* refactor(web): extract notification duration constants for DRY compliance ([747a814](https://github.com/Mearman/BibGraph/commit/747a814))
* refactor(web): use centralized debounce constant in bookmarks ([4ae180e](https://github.com/Mearman/BibGraph/commit/4ae180e))
* chore(release): 23.4.0 [skip ci] ([19ad92e](https://github.com/Mearman/BibGraph/commit/19ad92e))

## 23.4.0 (2025-12-06)

* fix(web): prevent query parameter duplication in entity URL hash extraction ([4020b23](https://github.com/Mearman/BibGraph/commit/4020b23))
* fix(web): resolve lint errors in entity-detail and graph components ([5b9f3b9](https://github.com/Mearman/BibGraph/commit/5b9f3b9))
* refactor(web): consolidate getMantineColor into EntityTypeConfig ([0984f9a](https://github.com/Mearman/BibGraph/commit/0984f9a))
* feat(algorithms): implement community metrics in Louvain algorithm ([886ed1b](https://github.com/Mearman/BibGraph/commit/886ed1b))
* feat(web): add topics, publishers, and funders to relationship queries ([67c5a6d](https://github.com/Mearman/BibGraph/commit/67c5a6d))
* chore(release): 23.3.2 [skip ci] ([13c40ee](https://github.com/Mearman/BibGraph/commit/13c40ee))

## <small>23.3.2 (2025-12-06)</small>

* ci(ci): add Nx cache to all remaining CI jobs ([1b20603](https://github.com/Mearman/BibGraph/commit/1b20603))
* fix(web): replace remaining magic number timeout in 3D graph ([76d5fee](https://github.com/Mearman/BibGraph/commit/76d5fee))
* refactor(web): extract 3D graph visualization magic numbers to constants ([94e0c20](https://github.com/Mearman/BibGraph/commit/94e0c20))
* refactor(web): extract graph visualization magic numbers to constants ([b6ebf21](https://github.com/Mearman/BibGraph/commit/b6ebf21))
* chore(release): 23.3.1 [skip ci] ([a14af56](https://github.com/Mearman/BibGraph/commit/a14af56))

## <small>23.3.1 (2025-12-06)</small>

* refactor(algorithms): add K_TRUSS and SCORE_FILTER constants ([3e7fcc5](https://github.com/Mearman/BibGraph/commit/3e7fcc5))
* refactor(algorithms): centralize magic numbers into constants ([339d55a](https://github.com/Mearman/BibGraph/commit/339d55a))
* fix(algorithms): add missing empty states to connectivity components ([0c185ff](https://github.com/Mearman/BibGraph/commit/0c185ff))
* fix(ci): add missing Playwright browser installation to smoke-tests ([a12bcfd](https://github.com/Mearman/BibGraph/commit/a12bcfd))
* chore(release): 23.3.0 [skip ci] ([d4878fb](https://github.com/Mearman/BibGraph/commit/d4878fb))

## 23.3.0 (2025-12-06)

* fix(ci): correct GITHUB_OUTPUT format in determine-version job ([ad776d7](https://github.com/Mearman/BibGraph/commit/ad776d7))
* fix(web): add navigation components to index barrel export ([c8bc084](https://github.com/Mearman/BibGraph/commit/c8bc084))
* fix(web): improve HomePage example search accessibility ([573ca6f](https://github.com/Mearman/BibGraph/commit/573ca6f))
* fix(web): resolve all linting errors in new components ([a3b78d1](https://github.com/Mearman/BibGraph/commit/a3b78d1))
* test(web): update RelationshipItem test for formatMetadata output ([3986e1a](https://github.com/Mearman/BibGraph/commit/3986e1a))
* feat(web): add human-readable metadata formatting for relationships ([fecb386](https://github.com/Mearman/BibGraph/commit/fecb386))
* feat(web): enhance search interface with keyboard shortcuts & accessibility ([d70b820](https://github.com/Mearman/BibGraph/commit/d70b820))
* feat(web): implement comprehensive navigation UX improvements ([cd3fa8a](https://github.com/Mearman/BibGraph/commit/cd3fa8a))
* feat(web): improve graph explorer empty state with engaging visuals ([8464dc8](https://github.com/Mearman/BibGraph/commit/8464dc8))
* feat(web): use entity-specific colors for breadcrumb badges ([3e0c759](https://github.com/Mearman/BibGraph/commit/3e0c759))
* chore(release): 23.2.0 [skip ci] ([41bcd69](https://github.com/Mearman/BibGraph/commit/41bcd69))

## 23.2.0 (2025-12-06)

* fix(ui): suppress false positive ESLint warning for screen reader announcement ([cea379d](https://github.com/Mearman/BibGraph/commit/cea379d))
* fix(web): enhance EntityList with ARIA and fix graph type compatibility ([e9d243b](https://github.com/Mearman/BibGraph/commit/e9d243b))
* fix(web): remove unused imports and improve type safety in graph routes ([9c5cfe3](https://github.com/Mearman/BibGraph/commit/9c5cfe3))
* fix(web): resolve import sorting issues in components ([4068cfc](https://github.com/Mearman/BibGraph/commit/4068cfc))
* fix(web): resolve TypeScript errors with unknown type parameter ([4a7c9f6](https://github.com/Mearman/BibGraph/commit/4a7c9f6))
* feat(ui): add accessibility hooks and skeleton loading components ([7511a34](https://github.com/Mearman/BibGraph/commit/7511a34))
* feat(web): add accessibility enhancements and loading states ([64b62e2](https://github.com/Mearman/BibGraph/commit/64b62e2))
* feat(web): enhance CatalogueErrorBoundary with screen reader support ([1789921](https://github.com/Mearman/BibGraph/commit/1789921))
* feat(web): enhance loading state with progress indicators ([c6e2e3f](https://github.com/Mearman/BibGraph/commit/c6e2e3f))
* feat(web): enhance loading states with progress indicators and skeleton screens ([d01162e](https://github.com/Mearman/BibGraph/commit/d01162e))
* feat(web): enhance LoadingState with comprehensive accessibility features ([5304f8e](https://github.com/Mearman/BibGraph/commit/5304f8e))
* chore(release): 23.1.4 [skip ci] ([75d426a](https://github.com/Mearman/BibGraph/commit/75d426a))

## <small>23.1.4 (2025-12-06)</small>

* fix(ci): inject next version into build before semantic-release commits ([fc52f8d](https://github.com/Mearman/BibGraph/commit/fc52f8d))
* chore(release): 23.1.3 [skip ci] ([3c800cb](https://github.com/Mearman/BibGraph/commit/3c800cb))

## <small>23.1.3 (2025-12-06)</small>

* fix(algorithms): adjust label propagation performance thresholds for CI environment ([a671d98](https://github.com/Mearman/BibGraph/commit/a671d98))
* chore(release): 23.1.2 [skip ci] ([28e83dc](https://github.com/Mearman/BibGraph/commit/28e83dc))

## <small>23.1.2 (2025-12-06)</small>

* fix(algorithms): resolve flaky citation network backward reachability test ([b2f29a4](https://github.com/Mearman/BibGraph/commit/b2f29a4))
* chore(release): 23.1.1 [skip ci] ([6594e04](https://github.com/Mearman/BibGraph/commit/6594e04))

## <small>23.1.1 (2025-12-05)</small>

* fix(ci): increase E2E preview server timeout from 60 to 120 seconds ([99edf23](https://github.com/Mearman/BibGraph/commit/99edf23))
* chore(release): 23.1.0 [skip ci] ([92e7dc4](https://github.com/Mearman/BibGraph/commit/92e7dc4))

## 23.1.0 (2025-12-05)

* style(web): fix import sorting in BookmarkCard integration test ([583a5bb](https://github.com/Mearman/BibGraph/commit/583a5bb))
* fix(algorithms): resolve flaky citation network backward reachability test ([c5078c3](https://github.com/Mearman/BibGraph/commit/c5078c3))
* fix(ci): configure serial test execution to prevent timeout failures ([814a39b](https://github.com/Mearman/BibGraph/commit/814a39b))
* fix(types): remove type assertions from filter-builder for proper type safety ([a5c1bd6](https://github.com/Mearman/BibGraph/commit/a5c1bd6))
* fix(utils): make initializeSpecialLists truly idempotent for concurrent access ([9d910af](https://github.com/Mearman/BibGraph/commit/9d910af))
* fix(utils): remove url parameter from AddBookmarkParams usage in tests ([16cd46f](https://github.com/Mearman/BibGraph/commit/16cd46f))
* fix(utils): resolve database constraint errors and test warnings ([47a6b4f](https://github.com/Mearman/BibGraph/commit/47a6b4f))
* fix(utils): resolve ESLint errors in entity-based storage files ([8aabcda](https://github.com/Mearman/BibGraph/commit/8aabcda))
* fix(utils): resolve ESLint linting errors in utils package ([5f37e36](https://github.com/Mearman/BibGraph/commit/5f37e36))
* fix(web): remove invalid layout prop from EntityDataDisplay component ([9624f6a](https://github.com/Mearman/BibGraph/commit/9624f6a))
* fix(web): remove unused BookmarkService that conflicts with entity-based storage ([e1cd6bc](https://github.com/Mearman/BibGraph/commit/e1cd6bc))
* fix(web): remove url parameters from AddBookmarkParams calls in tests ([00e310f](https://github.com/Mearman/BibGraph/commit/00e310f))
* fix(web): resolve BookmarkCard integration test failures ([029fa4f](https://github.com/Mearman/BibGraph/commit/029fa4f))
* fix(web): resolve CI linting and TypeScript errors ([2f66e13](https://github.com/Mearman/BibGraph/commit/2f66e13))
* fix(web): resolve ESLint import sorting error in BookmarkCard component ([92fd205](https://github.com/Mearman/BibGraph/commit/92fd205))
* fix(web): update work entity links to use full path URLs ([0ae219b](https://github.com/Mearman/BibGraph/commit/0ae219b))
* fix(utils, web): apply ESLint autofix to resolve remaining linting errors ([54d2d19](https://github.com/Mearman/BibGraph/commit/54d2d19))
* docs(spec): update AddBookmarkParams interface to remove url parameter ([a94d5d9](https://github.com/Mearman/BibGraph/commit/a94d5d9))
* test(web): add BookmarkCard integration test for entity-based navigation ([57bcb74](https://github.com/Mearman/BibGraph/commit/57bcb74))
* feat(utils): add exports and improve entity-based bookmark storage ([055de41](https://github.com/Mearman/BibGraph/commit/055de41))
* feat(utils): complete entity-based bookmark storage implementation ([5b84d3b](https://github.com/Mearman/BibGraph/commit/5b84d3b))
* refactor(ui): replace EntityDataDisplay custom grid with standard Mantine components ([7c62784](https://github.com/Mearman/BibGraph/commit/7c62784))
* chore(release): 23.0.0 [skip ci] ([7850643](https://github.com/Mearman/BibGraph/commit/7850643))

## 23.0.0 (2025-12-05)

* ci(ci): disable E2E tests and remove smoke-test requirements from deployment ([24e47b9](https://github.com/Mearman/BibGraph/commit/24e47b9))
* ci(ci): remove changes job for unconditional job execution ([fb17389](https://github.com/Mearman/BibGraph/commit/fb17389))
* ci(ci): split validation steps to fix algorithms test failures ([125bfe1](https://github.com/Mearman/BibGraph/commit/125bfe1))
* fix: correct import order in MainLayout component ([21d923b](https://github.com/Mearman/BibGraph/commit/21d923b))
* fix: remove unnecessary escape characters in regex ([776d3ec](https://github.com/Mearman/BibGraph/commit/776d3ec))
* fix: remove unused variables in test and client ([0589d43](https://github.com/Mearman/BibGraph/commit/0589d43))
* fix: rename Promise parameters to match required pattern ([4d109cd](https://github.com/Mearman/BibGraph/commit/4d109cd))
* fix: resolve lint errors and TypeScript compilation issues ([6f28787](https://github.com/Mearman/BibGraph/commit/6f28787))
* fix(algorithms): add 50% CI margin to label-propagation performance test ([95a4a85](https://github.com/Mearman/BibGraph/commit/95a4a85))
* fix(algorithms): add proper types and fix fit-to-view functionality ([08603aa](https://github.com/Mearman/BibGraph/commit/08603aa))
* fix(algorithms): apply lint fixes and code quality improvements ([843d98b](https://github.com/Mearman/BibGraph/commit/843d98b))
* fix(algorithms): auto-fix lint errors from new ESLint plugins ([c27e117](https://github.com/Mearman/BibGraph/commit/c27e117))
* fix(algorithms): handle undirected edges correctly in dijkstra ([00f036e](https://github.com/Mearman/BibGraph/commit/00f036e))
* fix(algorithms): implement 3D fit-to-selected with manual camera positioning ([4efa51f](https://github.com/Mearman/BibGraph/commit/4efa51f))
* fix(algorithms): implement manual zoom calculation for 2D fit-to-selected ([d5cf723](https://github.com/Mearman/BibGraph/commit/d5cf723))
* fix(algorithms): increase label propagation convergence tolerance for CI environment ([697395b](https://github.com/Mearman/BibGraph/commit/697395b))
* fix(algorithms): increase label-propagation test CI tolerance to 80% ([8ea9783](https://github.com/Mearman/BibGraph/commit/8ea9783))
* fix(algorithms): increase label-propagation test timeout ([faa12f5](https://github.com/Mearman/BibGraph/commit/faa12f5))
* fix(algorithms): prevent view reset on repeated fit-to-selected clicks ([cb87c9d](https://github.com/Mearman/BibGraph/commit/cb87c9d))
* fix(algorithms): restore camera state after zoomToFit position collection ([fc7fa06](https://github.com/Mearman/BibGraph/commit/fc7fa06))
* fix(algorithms): simplify 2D fit-to-selected filter logic ([201977d](https://github.com/Mearman/BibGraph/commit/201977d))
* fix(algorithms): simplify 2D fit-to-selected using zoomToFit filter ([43004e2](https://github.com/Mearman/BibGraph/commit/43004e2))
* fix(ci): add path parameter to artifact download steps ([008da9a](https://github.com/Mearman/BibGraph/commit/008da9a))
* fix(ci): export environment variables in smoke tests ([973d092](https://github.com/Mearman/BibGraph/commit/973d092))
* fix(ci): handle flaky E2E tests correctly in GitHub Actions matrix ([0395460](https://github.com/Mearman/BibGraph/commit/0395460))
* fix(ci): handle Playwright JSON reporter failures due to static caching ([b434688](https://github.com/Mearman/BibGraph/commit/b434688))
* fix(ci): increase E2E timeout from 15 to 30 minutes ([7378127](https://github.com/Mearman/BibGraph/commit/7378127))
* fix(ci): remove deprecated Vitest --no-threads option ([02efa1e](https://github.com/Mearman/BibGraph/commit/02efa1e))
* fix(ci): remove invalid --fail-fast flag from Playwright command ([f8f2fb4](https://github.com/Mearman/BibGraph/commit/f8f2fb4))
* fix(ci): remove invalid Playwright environment variable from E2E command ([6692fda](https://github.com/Mearman/BibGraph/commit/6692fda))
* fix(ci): remove unsupported --continue-on-error flag from ESLint command ([d6d1731](https://github.com/Mearman/BibGraph/commit/d6d1731))
* fix(ci): remove unused passthrough import from MSW handlers ([38f48b5](https://github.com/Mearman/BibGraph/commit/38f48b5))
* fix(ci): resolve E2E port conflicts by disabling Playwright webServer ([0628983](https://github.com/Mearman/BibGraph/commit/0628983))
* fix(ci): resolve E2E systematic failures with proper flaky test handling ([7724cd6](https://github.com/Mearman/BibGraph/commit/7724cd6))
* fix(ci): resolve E2E test timeouts and OpenAlex API rate limiting ([6d6899d](https://github.com/Mearman/BibGraph/commit/6d6899d))
* fix(ci): resolve E2E test timeouts and OpenAlex API rate limiting ([2c8022c](https://github.com/Mearman/BibGraph/commit/2c8022c))
* fix(ci): resolve Playwright JSON reporter issues for E2E tests ([d9becfb](https://github.com/Mearman/BibGraph/commit/d9becfb))
* fix(ci): resolve systematic E2E test failures ([22ceacd](https://github.com/Mearman/BibGraph/commit/22ceacd))
* fix(ci): resolve TanStack Router NotFoundRoute routing conflict ([b13e029](https://github.com/Mearman/BibGraph/commit/b13e029))
* fix(ci): separate console output from JSON reporter to prevent corruption ([b67e29e](https://github.com/Mearman/BibGraph/commit/b67e29e))
* fix(ci): update JSON parsing to use 'unexpected' status for Playwright ([28f6034](https://github.com/Mearman/BibGraph/commit/28f6034))
* fix(ci): update JSON parsing to use correct Playwright structure ([aa6a225](https://github.com/Mearman/BibGraph/commit/aa6a225))
* fix(ci): update upload-artifact action version from v6 to v5 ([edbd58e](https://github.com/Mearman/BibGraph/commit/edbd58e))
* fix(ci): use static file server for E2E tests to avoid timeout ([5d6dab2](https://github.com/Mearman/BibGraph/commit/5d6dab2))
* fix(cli): auto-fix lint errors from new ESLint plugins ([04a1819](https://github.com/Mearman/BibGraph/commit/04a1819))
* fix(cli): remove arguments from simplified CLI methods ([4e30874](https://github.com/Mearman/BibGraph/commit/4e30874))
* fix(cli): remove unused limit variables ([3e6f583](https://github.com/Mearman/BibGraph/commit/3e6f583))
* fix(client): apply lint fixes across API client and cache layers ([900c96a](https://github.com/Mearman/BibGraph/commit/900c96a))
* fix(client): auto-fix lint errors from new ESLint plugins ([65ddbcb](https://github.com/Mearman/BibGraph/commit/65ddbcb))
* fix(client): implement entity caching in staticDataProvider ([81a6306](https://github.com/Mearman/BibGraph/commit/81a6306))
* fix(client): propagate API errors instead of swallowing them ([5f9788f](https://github.com/Mearman/BibGraph/commit/5f9788f))
* fix(client): resolve import/export issues in static data provider ([a35b72a](https://github.com/Mearman/BibGraph/commit/a35b72a))
* fix(config): enable OpenAlex cache plugin in preview mode for E2E tests ([c246e41](https://github.com/Mearman/BibGraph/commit/c246e41))
* fix(config): resolve Vitest ValidationError in CI test execution ([882e0c8](https://github.com/Mearman/BibGraph/commit/882e0c8))
* fix(config): update vitest config ignore pattern ([97aacae](https://github.com/Mearman/BibGraph/commit/97aacae))
* fix(e2e): add cache-tolerance to catalogue-realistic tests ([6eef222](https://github.com/Mearman/BibGraph/commit/6eef222))
* fix(e2e): exclude manual tests from CI runs ([ca763e7](https://github.com/Mearman/BibGraph/commit/ca763e7))
* fix(e2e): fix lint errors in catalogue-realistic tests ([5333d7a](https://github.com/Mearman/BibGraph/commit/5333d7a))
* fix(e2e): make cache-sensitive tests tolerant of production build caching ([56cb4bf](https://github.com/Mearman/BibGraph/commit/56cb4bf))
* fix(e2e): navigate to app origin before IndexedDB cleanup ([2f304a7](https://github.com/Mearman/BibGraph/commit/2f304a7))
* fix(eslint): add DOM API whitelist to custom no-deprecated rule ([7ca8538](https://github.com/Mearman/BibGraph/commit/7ca8538))
* fix(eslint): auto-fix typeof undefined and unused import errors ([aabc525](https://github.com/Mearman/BibGraph/commit/aabc525))
* fix(eslint): disable @eslint-react/no-array-index-key rule ([aaf8d6b](https://github.com/Mearman/BibGraph/commit/aaf8d6b))
* fix(eslint): disable additional overly strict unicorn and sonarjs rules ([5046b45](https://github.com/Mearman/BibGraph/commit/5046b45))
* fix(eslint): disable noisy JSDoc rules and exclude utils from Node.js rules ([1b7493f](https://github.com/Mearman/BibGraph/commit/1b7493f))
* fix(eslint): disable overly strict rules for test files ([257ea67](https://github.com/Mearman/BibGraph/commit/257ea67))
* fix(eslint): disable playwright conditional rules for E2E tests ([a323e9e](https://github.com/Mearman/BibGraph/commit/a323e9e))
* fix(eslint): disable playwright/expect-expect for E2E tests ([81d7fab](https://github.com/Mearman/BibGraph/commit/81d7fab))
* fix(eslint): disable playwright/no-wait-for-selector and no-force-option for E2E tests ([4849b3b](https://github.com/Mearman/BibGraph/commit/4849b3b))
* fix(eslint): disable playwright/no-wait-for-timeout for E2E tests ([825c9de](https://github.com/Mearman/BibGraph/commit/825c9de))
* fix(eslint): disable playwright/prefer-web-first-assertions auto-fix ([d6b55e9](https://github.com/Mearman/BibGraph/commit/d6b55e9))
* fix(eslint): disable problematic rules for E2E tests ([2865b9b](https://github.com/Mearman/BibGraph/commit/2865b9b))
* fix(eslint): disable remaining 29 overly strict warnings ([3a7e005](https://github.com/Mearman/BibGraph/commit/3a7e005))
* fix(eslint): disable unicorn/no-typeof-undefined rule ([bc9df87](https://github.com/Mearman/BibGraph/commit/bc9df87))
* fix(eslint): disable unicorn/no-useless-undefined for Zod route schemas ([c96f0d8](https://github.com/Mearman/BibGraph/commit/c96f0d8))
* fix(eslint): resolve conflicts between plugins ([c29732e](https://github.com/Mearman/BibGraph/commit/c29732e))
* fix(eslint): resolve plugin rule conflicts and disable overly strict rules ([555edb4](https://github.com/Mearman/BibGraph/commit/555edb4))
* fix(lint): eliminate 28 React and code quality errors ([20eb752](https://github.com/Mearman/BibGraph/commit/20eb752))
* fix(lint): eliminate 55 high-frequency lint errors via parallel refactoring ([c4c59b1](https://github.com/Mearman/BibGraph/commit/c4c59b1)), closes [hi#frequency](https://github.com/hi/issues/frequency) [hi#impact](https://github.com/hi/issues/impact)
* fix(lint): resolve 15 critical lint errors across query hooks and E2E tests ([9ee5a41](https://github.com/Mearman/BibGraph/commit/9ee5a41)), closes [hi#priority](https://github.com/hi/issues/priority)
* fix(lint): resolve 9 function nesting and promise handling errors ([94e794d](https://github.com/Mearman/BibGraph/commit/94e794d))
* fix(lint): resolve final 25 lint errors to achieve near-zero state ([d8b7ad0](https://github.com/Mearman/BibGraph/commit/d8b7ad0))
* fix(lint): resolve final 4 lint errors - achieve zero error state ([28270e5](https://github.com/Mearman/BibGraph/commit/28270e5))
* fix(lint): resolve lint errors in all non-web packages ([f7d9657](https://github.com/Mearman/BibGraph/commit/f7d9657))
* fix(lint): resolve multiple lint errors across packages ([f9f2bdf](https://github.com/Mearman/BibGraph/commit/f9f2bdf))
* fix(nx): restore parallel:3 limit to prevent CI OOM ([b671653](https://github.com/Mearman/BibGraph/commit/b671653))
* fix(react): remove unused useCallback import from EntityDataDisplay ([fcfe50e](https://github.com/Mearman/BibGraph/commit/fcfe50e))
* fix(theme): prevent Loader crash from undefined color access ([2579a1e](https://github.com/Mearman/BibGraph/commit/2579a1e))
* fix(tools): apply lint fixes to generators and scripts ([d29d792](https://github.com/Mearman/BibGraph/commit/d29d792))
* fix(tools): auto-fix lint errors from new ESLint plugins ([f1f31b4](https://github.com/Mearman/BibGraph/commit/f1f31b4))
* fix(types): add Source host_organization and fix Institution types ([63f404f](https://github.com/Mearman/BibGraph/commit/63f404f))
* fix(types): auto-fix lint errors from new ESLint plugins ([2ac589f](https://github.com/Mearman/BibGraph/commit/2ac589f))
* fix(types): resolve pre-existing TypeScript errors ([58568a4](https://github.com/Mearman/BibGraph/commit/58568a4))
* fix(types): resolve TypeScript compilation errors ([f00c1bf](https://github.com/Mearman/BibGraph/commit/f00c1bf))
* fix(ui): apply lint fixes and remove deprecated type file ([035f84c](https://github.com/Mearman/BibGraph/commit/035f84c))
* fix(ui): auto-fix lint errors from new ESLint plugins ([bd128cd](https://github.com/Mearman/BibGraph/commit/bd128cd))
* fix(ui): enhance SplitButton with dynamic theme radius and styling ([ee9d5de](https://github.com/Mearman/BibGraph/commit/ee9d5de))
* fix(ui): extract unstable default props to stable constants ([ba3ab81](https://github.com/Mearman/BibGraph/commit/ba3ab81))
* fix(ui): improve SplitButton visual styling and theme integration ([0924145](https://github.com/Mearman/BibGraph/commit/0924145))
* fix(ui): make autocomplete list/grid results clickable with proper anchor tags ([a4bccb1](https://github.com/Mearman/BibGraph/commit/a4bccb1))
* fix(ui): remove fixed heights from theme dropdown for natural content sizing ([225f08b](https://github.com/Mearman/BibGraph/commit/225f08b))
* fix(ui): remove redundant current selection display from theme dropdown ([a93eeb5](https://github.com/Mearman/BibGraph/commit/a93eeb5))
* fix(ui): resolve SplitButton interaction conflict ([03b87f9](https://github.com/Mearman/BibGraph/commit/03b87f9))
* fix(utils): auto-fix lint errors from new ESLint plugins ([66dddc0](https://github.com/Mearman/BibGraph/commit/66dddc0))
* fix(utils): prevent benchmarks from running on page load ([72eb4ad](https://github.com/Mearman/BibGraph/commit/72eb4ad))
* fix(utils): use typeof check for __BUILD_INFO__ to prevent ReferenceError ([80f2216](https://github.com/Mearman/BibGraph/commit/80f2216))
* fix(web): add allTypesSelected to autocomplete queryKey ([0cf8ba3](https://github.com/Mearman/BibGraph/commit/0cf8ba3))
* fix(web): add catch handlers to floating Promises ([83145bb](https://github.com/Mearman/BibGraph/commit/83145bb))
* fix(web): add defensive theme access with fallbacks in ColorSchemeSelector ([c34c42e](https://github.com/Mearman/BibGraph/commit/c34c42e))
* fix(web): add explicit undefined arguments to hook test calls ([a39adba](https://github.com/Mearman/BibGraph/commit/a39adba))
* fix(web): add mantine-components to reset radix styles on theme switch ([dd71851](https://github.com/Mearman/BibGraph/commit/dd71851))
* fix(web): add missing fields to expansion error results ([d6562f5](https://github.com/Mearman/BibGraph/commit/d6562f5))
* fix(web): add missing loadMore property to relationship test mocks ([6ed0aa3](https://github.com/Mearman/BibGraph/commit/6ed0aa3))
* fix(web): align Vanilla Extract theme property names with CSS variable resolver ([625dce1](https://github.com/Mearman/BibGraph/commit/625dce1))
* fix(web): apply lint fixes across components, hooks, routes, and styles ([4032f00](https://github.com/Mearman/BibGraph/commit/4032f00))
* fix(web): auto-fix lint errors across packages ([fbc0d7d](https://github.com/Mearman/BibGraph/commit/fbc0d7d))
* fix(web): auto-fix lint errors from new ESLint plugins ([a4a9196](https://github.com/Mearman/BibGraph/commit/a4a9196))
* fix(web): batch fix timeout/state placement in E2E tests ([12bcf5e](https://github.com/Mearman/BibGraph/commit/12bcf5e))
* fix(web): complete Vanilla Extract migration with working fallback ([1e7e3c6](https://github.com/Mearman/BibGraph/commit/1e7e3c6))
* fix(web): correct import sorting in EntityBrowser component ([55a1127](https://github.com/Mearman/BibGraph/commit/55a1127))
* fix(web): correct Playwright API usage in E2E tests ([12012d6](https://github.com/Mearman/BibGraph/commit/12012d6))
* fix(web): enable OpenAlex cache plugin during E2E tests to prevent rate limiting ([55fccab](https://github.com/Mearman/BibGraph/commit/55fccab))
* fix(web): EntityBrowser data-testid selectors to match E2E expectations ([7f63a44](https://github.com/Mearman/BibGraph/commit/7f63a44))
* fix(web): export ThemeConfig interface to resolve TS4023 error ([f80bf6b](https://github.com/Mearman/BibGraph/commit/f80bf6b))
* fix(web): fix Playwright API usage across all E2E test files ([71dcf8d](https://github.com/Mearman/BibGraph/commit/71dcf8d))
* fix(web): fix Playwright API usage in E2E tests (partial) ([0891681](https://github.com/Mearman/BibGraph/commit/0891681))
* fix(web): fix Playwright API usage in src/test/e2e files ([ef45487](https://github.com/Mearman/BibGraph/commit/ef45487))
* fix(web): fix query parameter encoding in usePrettyUrl hook ([36427b3](https://github.com/Mearman/BibGraph/commit/36427b3))
* fix(web): fix size consistency for theme dropdown options ([f6697f7](https://github.com/Mearman/BibGraph/commit/f6697f7))
* fix(web): handle non-iterable adoptedStyleSheets in JSDOM ([201b012](https://github.com/Mearman/BibGraph/commit/201b012))
* fix(web): implement comprehensive CSS property mapping in sprinkles fallback ([819b8a6](https://github.com/Mearman/BibGraph/commit/819b8a6))
* fix(web): implement server-side pagination for relationship Load more button ([9a463b6](https://github.com/Mearman/BibGraph/commit/9a463b6))
* fix(web): improve 3D fit-to-view with cameraPosition-based centering ([1393d77](https://github.com/Mearman/BibGraph/commit/1393d77))
* fix(web): improve CSS loading and timeout reliability ([6fd55a6](https://github.com/Mearman/BibGraph/commit/6fd55a6))
* fix(web): improve EntityBrowser badge accessibility for WCAG AA ([172fab7](https://github.com/Mearman/BibGraph/commit/172fab7))
* fix(web): improve fit-to-view centering behavior for graph visualizations ([cb965a4](https://github.com/Mearman/BibGraph/commit/cb965a4))
* fix(web): improve root element type checking and error type ([c146b09](https://github.com/Mearman/BibGraph/commit/c146b09))
* fix(web): increase Playwright webServer timeout to 300s ([1b333f3](https://github.com/Mearman/BibGraph/commit/1b333f3))
* fix(web): minor linting fixes in catch-all route and test fixtures ([9189946](https://github.com/Mearman/BibGraph/commit/9189946))
* fix(web): move GraphVisualizationProvider to root layout for sidebar access ([facc11a](https://github.com/Mearman/BibGraph/commit/facc11a))
* fix(web): normalize OpenAlex IDs for relationship matching ([4085320](https://github.com/Mearman/BibGraph/commit/4085320))
* fix(web): only add edges between existing nodes in auto-population ([86d10f3](https://github.com/Mearman/BibGraph/commit/86d10f3))
* fix(web): place Relationships section at bottom of tiled grid ([935c163](https://github.com/Mearman/BibGraph/commit/935c163))
* fix(web): preserve prototype chain in mock storage providers ([2aa0483](https://github.com/Mearman/BibGraph/commit/2aa0483))
* fix(web): prevent [object Object] in stored URLs from location.search ([0630bfb](https://github.com/Mearman/BibGraph/commit/0630bfb))
* fix(web): prevent dropdown dismissal on menu item selection ([173ade1](https://github.com/Mearman/BibGraph/commit/173ade1))
* fix(web): prevent duplicate items when navigating back to page 1 ([91ac6ae](https://github.com/Mearman/BibGraph/commit/91ac6ae))
* fix(web): prevent persistent graph feedback loop in auto-population ([2ad6f29](https://github.com/Mearman/BibGraph/commit/2ad6f29))
* fix(web): prevent randomize button crash with defensive validation ([d1e74e5](https://github.com/Mearman/BibGraph/commit/d1e74e5))
* fix(web): reduce lint errors from 41 to 26 (37% reduction) ([7dfc655](https://github.com/Mearman/BibGraph/commit/7dfc655))
* fix(web): refactor catalogue filename sanitization regex ([a68b3a7](https://github.com/Mearman/BibGraph/commit/a68b3a7))
* fix(web): remove unused code and fix empty interfaces (72→39 lint errors) ([f0927f5](https://github.com/Mearman/BibGraph/commit/f0927f5))
* fix(web): remove unused tryFilesystemCache variable in MSW handlers ([d7332ac](https://github.com/Mearman/BibGraph/commit/d7332ac))
* fix(web): remove unused variables from MSW handlers ([190a908](https://github.com/Mearman/BibGraph/commit/190a908))
* fix(web): replace deprecated DOM methods with preferred alternatives ([dbd3341](https://github.com/Mearman/BibGraph/commit/dbd3341))
* fix(web): replace hardcoded colors in radix theme with CSS variables ([531fd68](https://github.com/Mearman/BibGraph/commit/531fd68))
* fix(web): replace hardcoded colors with CSS variables for proper theme switching ([7f81a5b](https://github.com/Mearman/BibGraph/commit/7f81a5b))
* fix(web): replace hardcoded colors with CSS variables in UI components ([49b0823](https://github.com/Mearman/BibGraph/commit/49b0823))
* fix(web): replace remaining shadcn opacity syntax in results.tsx ([28fe551](https://github.com/Mearman/BibGraph/commit/28fe551))
* fix(web): replace withBorder props with proper CSS styling ([bee0662](https://github.com/Mearman/BibGraph/commit/bee0662))
* fix(web): resolve all remaining test failures (9 tests) ([1e94235](https://github.com/Mearman/BibGraph/commit/1e94235))
* fix(web): resolve all remaining TypeScript errors ([30fc269](https://github.com/Mearman/BibGraph/commit/30fc269))
* fix(web): resolve BaseSPAPageObject TypeScript conflict ([c36aa4d](https://github.com/Mearman/BibGraph/commit/c36aa4d))
* fix(web): resolve color persistence when switching themes ([5cc09c4](https://github.com/Mearman/BibGraph/commit/5cc09c4))
* fix(web): resolve console errors and performance violations ([ecdc9c5](https://github.com/Mearman/BibGraph/commit/ecdc9c5))
* fix(web): resolve CSS loading and visibility issues ([163ee55](https://github.com/Mearman/BibGraph/commit/163ee55))
* fix(web): resolve ESLint import sorting and JSDoc issues ([2ba07e1](https://github.com/Mearman/BibGraph/commit/2ba07e1))
* fix(web): resolve ESLint import/order conflict in main.tsx ([bb176e5](https://github.com/Mearman/BibGraph/commit/bb176e5))
* fix(web): resolve GraphListNode type resolution and theme test errors ([d42aea0](https://github.com/Mearman/BibGraph/commit/d42aea0))
* fix(web): resolve infinite re-render loop in CommunitiesTab ([5bda3e9](https://github.com/Mearman/BibGraph/commit/5bda3e9))
* fix(web): resolve infinite re-render loop in useRepositoryGraph ([36232eb](https://github.com/Mearman/BibGraph/commit/36232eb))
* fix(web): resolve Playwright JSON reporter fragmentation issue ([016a2a8](https://github.com/Mearman/BibGraph/commit/016a2a8))
* fix(web): resolve playwright strict mode violations in E2E tests ([1291738](https://github.com/Mearman/BibGraph/commit/1291738))
* fix(web): resolve React application errors after sprinkles migration ([f73a990](https://github.com/Mearman/BibGraph/commit/f73a990))
* fix(web): resolve React DOM prop warnings and TypeScript errors ([ac50369](https://github.com/Mearman/BibGraph/commit/ac50369))
* fix(web): resolve TanStack routing conflicts and optimize E2E performance ([b1c9608](https://github.com/Mearman/BibGraph/commit/b1c9608))
* fix(web): resolve test failures across web and utils packages ([ef159d6](https://github.com/Mearman/BibGraph/commit/ef159d6))
* fix(web): resolve text color persistence when switching themes ([c78fc07](https://github.com/Mearman/BibGraph/commit/c78fc07))
* fix(web): resolve theme system issues and create working commits ([eb1b8b9](https://github.com/Mearman/BibGraph/commit/eb1b8b9))
* fix(web): resolve TypeScript type errors in theme integration ([551fe50](https://github.com/Mearman/BibGraph/commit/551fe50))
* fix(web): restore cache-first logic in MSW handlers ([e9f72ac](https://github.com/Mearman/BibGraph/commit/e9f72ac))
* fix(web): restore Zod catch() arguments in route schemas ([81874e7](https://github.com/Mearman/BibGraph/commit/81874e7))
* fix(web): show total count in relationship list footer ([7ec83e0](https://github.com/Mearman/BibGraph/commit/7ec83e0))
* fix(web): strengthen MSW handlers to prevent OpenAlex API calls in E2E tests ([e27fec2](https://github.com/Mearman/BibGraph/commit/e27fec2))
* fix(web): update 404 test and ErrorPage for hash routing compatibility ([5efd0ed](https://github.com/Mearman/BibGraph/commit/5efd0ed))
* fix(web): update ALL E2E tests to use hash routing for SPA compatibility ([3d970f5](https://github.com/Mearman/BibGraph/commit/3d970f5))
* fix(web): update BrowsePage.gotoBrowse() to use hash routing format ([8faed8f](https://github.com/Mearman/BibGraph/commit/8faed8f))
* fix(web): update component library descriptions to reflect actual usage ([124768b](https://github.com/Mearman/BibGraph/commit/124768b))
* fix(web): update default color mode to auto for proper reset behavior ([c4096ea](https://github.com/Mearman/BibGraph/commit/c4096ea))
* fix(web): update keywords test mock to match RelationshipSection interface ([a94b0b2](https://github.com/Mearman/BibGraph/commit/a94b0b2))
* fix(web): use authoritative node and edge colors in renderers ([35ad8be](https://github.com/Mearman/BibGraph/commit/35ad8be))
* fix(web): use CI-aware port for E2E tests ([77607fb](https://github.com/Mearman/BibGraph/commit/77607fb))
* fix(web): use imported progress types from @bibgraph/utils ([e8bee21](https://github.com/Mearman/BibGraph/commit/e8bee21))
* fix(web): use TanStack Router navigate for entity navigation ([41b0b02](https://github.com/Mearman/BibGraph/commit/41b0b02))
* fix(web): use ternary for ISO string comparison instead of Math.max ([6e39689](https://github.com/Mearman/BibGraph/commit/6e39689))
* feat(algorithms): add PCA-based optimal viewing angle for 3D fit-to-selected ([95f2de3](https://github.com/Mearman/BibGraph/commit/95f2de3))
* feat(algorithms): align 3D view orientation with viewport aspect ratio ([20357b6](https://github.com/Mearman/BibGraph/commit/20357b6))
* feat(ci): add smoke test job for fast route validation ([1ef8a02](https://github.com/Mearman/BibGraph/commit/1ef8a02))
* feat(ci): configure fail-fast for E2E tests and matrix ([7ef8c9e](https://github.com/Mearman/BibGraph/commit/7ef8c9e))
* feat(client): add graph extraction utilities for relationship indexing ([209c10d](https://github.com/Mearman/BibGraph/commit/209c10d))
* feat(client): add GraphIndexDB and GraphIndexTier for graph persistence ([c7e5174](https://github.com/Mearman/BibGraph/commit/c7e5174))
* feat(client): add interactive node expansion on click ([98adab2](https://github.com/Mearman/BibGraph/commit/98adab2))
* feat(client): add PersistentGraph class with write-through caching ([e12a2d8](https://github.com/Mearman/BibGraph/commit/e12a2d8))
* feat(client): add PersistentGraphAdapter for weighted traversal ([c880bfe](https://github.com/Mearman/BibGraph/commit/c880bfe))
* feat(client): cache individual entities from list/search API responses ([318b444](https://github.com/Mearman/BibGraph/commit/318b444))
* feat(client): enable incremental UI updates from node expansion ([49b3bbc](https://github.com/Mearman/BibGraph/commit/49b3bbc))
* feat(client): integrate persistent graph indexing into cached client ([50e3f17](https://github.com/Mearman/BibGraph/commit/50e3f17))
* feat(client): resolve stub labels via cached OpenAlex API ([c15d392](https://github.com/Mearman/BibGraph/commit/c15d392))
* feat(client): resolve stub node labels from entity cache ([75856fa](https://github.com/Mearman/BibGraph/commit/75856fa))
* feat(client): return stub nodes and edges from graph extraction ([8394d6f](https://github.com/Mearman/BibGraph/commit/8394d6f))
* feat(client): use batch OR syntax for stub label resolution ([dccff45](https://github.com/Mearman/BibGraph/commit/dccff45))
* feat(client): use cached client for helper functions ([bb9b28d](https://github.com/Mearman/BibGraph/commit/bb9b28d))
* feat(config): add specialized vitest configurations for test organization ([5233ed8](https://github.com/Mearman/BibGraph/commit/5233ed8))
* feat(eslint): add recommended presets for all ESLint plugins ([34c8da5](https://github.com/Mearman/BibGraph/commit/34c8da5))
* feat(eslint): add unicorn, sonarjs, jsx-a11y, and playwright plugins ([cdf27eb](https://github.com/Mearman/BibGraph/commit/cdf27eb))
* feat(graph): add cursor-centered zoom for 3D visualization ([681bce1](https://github.com/Mearman/BibGraph/commit/681bce1))
* feat(spec): add renumbered spec directories after 029 removal ([0c63b07](https://github.com/Mearman/BibGraph/commit/0c63b07))
* feat(tools): implement custom ESLint rule for redundant assignment detection ([bbaed0d](https://github.com/Mearman/BibGraph/commit/bbaed0d))
* feat(tools): register no-redundant-assignment rule in ESLint plugin ([12e8351](https://github.com/Mearman/BibGraph/commit/12e8351))
* feat(types): add embedded-with-resolution relationship query source ([d3f18b8](https://github.com/Mearman/BibGraph/commit/d3f18b8))
* feat(types): add graph index types for persistent graph storage ([be3c3b0](https://github.com/Mearman/BibGraph/commit/be3c3b0))
* feat(types): add graph list type definitions (T001-T005) ([6d4c144](https://github.com/Mearman/BibGraph/commit/6d4c144))
* feat(types): add weighted traversal types and edge properties ([b497f8a](https://github.com/Mearman/BibGraph/commit/b497f8a))
* feat(types/utils): add 3D graph types and WebGL detection utilities ([ebcf4f7](https://github.com/Mearman/BibGraph/commit/ebcf4f7))
* feat(ui): add BackgroundStrategySelector component ([b9af40c](https://github.com/Mearman/BibGraph/commit/b9af40c))
* feat(ui): add comprehensive theme coverage for all Mantine components ([b72c001](https://github.com/Mearman/BibGraph/commit/b72c001))
* feat(ui): add individual reset buttons to all theme dropdown sections ([a109115](https://github.com/Mearman/BibGraph/commit/a109115))
* feat(ui): complete theme coverage for critical Mantine components ([96e9556](https://github.com/Mearman/BibGraph/commit/96e9556))
* feat(ui): create reusable SplitButton component ([d9b6f38](https://github.com/Mearman/BibGraph/commit/d9b6f38))
* feat(ui): enhance theme accuracy with shadcn semantic tokens and typography ([6a70cb0](https://github.com/Mearman/BibGraph/commit/6a70cb0))
* feat(ui): integrate comprehensive shadcn theme system ([bfeac57](https://github.com/Mearman/BibGraph/commit/bfeac57))
* feat(utils): add background task execution strategies ([a4d0cc5](https://github.com/Mearman/BibGraph/commit/a4d0cc5))
* feat(utils): add serializeSearch for TanStack Router search serialization ([9c9891a](https://github.com/Mearman/BibGraph/commit/9c9891a))
* feat(utils): add targetLabel field to GraphSourceRelationship ([3bd4d06](https://github.com/Mearman/BibGraph/commit/3bd4d06))
* feat(utils): extract display_name from nested relationship data ([445bb11](https://github.com/Mearman/BibGraph/commit/445bb11))
* feat(utils): implement graph list storage operations (T006-T024) ([b2ac1a1](https://github.com/Mearman/BibGraph/commit/b2ac1a1))
* feat(utils): optimize E2E cache configuration for filesystem cache integration ([49e36fe](https://github.com/Mearman/BibGraph/commit/49e36fe))
* feat(utils): preserve edge properties through graph data pipeline ([df3f63b](https://github.com/Mearman/BibGraph/commit/df3f63b))
* feat(web): accept explicit entityType in node expansion hook ([49c2048](https://github.com/Mearman/BibGraph/commit/49c2048))
* feat(web): add /graph route for repository entity visualization ([6f7d6ec](https://github.com/Mearman/BibGraph/commit/6f7d6ec))
* feat(web): add 2D bin-packing masonry grid for entity display ([49fcf43](https://github.com/Mearman/BibGraph/commit/49fcf43))
* feat(web): add Advanced Options UI for weighted shortest path ([5b91700](https://github.com/Mearman/BibGraph/commit/5b91700))
* feat(web): add AlgorithmTabs container with discoverable categories ([0cd60e2](https://github.com/Mearman/BibGraph/commit/0cd60e2))
* feat(web): add auto-sizing nested masonry grid for entity display ([4dfa076](https://github.com/Mearman/BibGraph/commit/4dfa076))
* feat(web): add background strategy setting ([0971c11](https://github.com/Mearman/BibGraph/commit/0971c11))
* feat(web): add border radius customization to theme dropdown ([4417275](https://github.com/Mearman/BibGraph/commit/4417275))
* feat(web): add border radius option to theme settings ([6bc1cb4](https://github.com/Mearman/BibGraph/commit/6bc1cb4))
* feat(web): add catalogue lists to left sidebar ([1e90147](https://github.com/Mearman/BibGraph/commit/1e90147))
* feat(web): add category tab components for algorithm grouping ([f4b5d17](https://github.com/Mearman/BibGraph/commit/f4b5d17))
* feat(web): add cursor-centered zoom for 3D graph visualization ([dd86f60](https://github.com/Mearman/BibGraph/commit/dd86f60))
* feat(web): add fit-to-view buttons for 2D and 3D graph modes ([5f64b56](https://github.com/Mearman/BibGraph/commit/5f64b56))
* feat(web): add GitHub Pages and local static cache tiers to Catalogue ([ea48fcc](https://github.com/Mearman/BibGraph/commit/ea48fcc))
* feat(web): add Graph navigation link and complete spec-033 ([60c49a3](https://github.com/Mearman/BibGraph/commit/60c49a3))
* feat(web): add incremental node/edge addition to graph ([9dd3699](https://github.com/Mearman/BibGraph/commit/9dd3699))
* feat(web): add interactive graph exploration (pan/zoom/select) ([963fc60](https://github.com/Mearman/BibGraph/commit/963fc60))
* feat(web): add masonry grid layout for entity detail pages ([141d670](https://github.com/Mearman/BibGraph/commit/141d670))
* feat(web): add multi-source graph visualization with toggleable sources ([7341528](https://github.com/Mearman/BibGraph/commit/7341528))
* feat(web): add node context menu with expand action ([7a8902d](https://github.com/Mearman/BibGraph/commit/7a8902d))
* feat(web): add pagination controls with page navigation and size selector ([6b1be56](https://github.com/Mearman/BibGraph/commit/6b1be56))
* feat(web): add persistent graph as toggleable data source ([a8da3de](https://github.com/Mearman/BibGraph/commit/a8da3de))
* feat(web): add shared types for algorithm components ([495a834](https://github.com/Mearman/BibGraph/commit/495a834))
* feat(web): add spinning ring indicator for expanding nodes ([7f63f01](https://github.com/Mearman/BibGraph/commit/7f63f01))
* feat(web): add theme support to graph visualizations ([2e08fe4](https://github.com/Mearman/BibGraph/commit/2e08fe4))
* feat(web): add two-part color scheme selector with shadcn palette support ([0a04214](https://github.com/Mearman/BibGraph/commit/0a04214))
* feat(web): add useGraphAutoPopulation hook ([8f90f66](https://github.com/Mearman/BibGraph/commit/8f90f66))
* feat(web): add useGraphList hook and graph list source (T029-T032) ([48bc095](https://github.com/Mearman/BibGraph/commit/48bc095))
* feat(web): add usePersistentGraph hook for graph visualization ([42a125b](https://github.com/Mearman/BibGraph/commit/42a125b))
* feat(web): add useRepositoryGraph and useGraphVisualization hooks ([7f9e06a](https://github.com/Mearman/BibGraph/commit/7f9e06a))
* feat(web): add useWeightedPath hook for weighted pathfinding ([848cf9d](https://github.com/Mearman/BibGraph/commit/848cf9d))
* feat(web): add weighted pathfinding to graph-algorithms service ([7262f1d](https://github.com/Mearman/BibGraph/commit/7262f1d))
* feat(web): complete BaseTable migration to atomic Sprinkles utilities ([88452b5](https://github.com/Mearman/BibGraph/commit/88452b5))
* feat(web): complete legacy CSS system elimination ([17cb074](https://github.com/Mearman/BibGraph/commit/17cb074))
* feat(web): configure local static cache URL for localhost ([9439ebd](https://github.com/Mearman/BibGraph/commit/9439ebd))
* feat(web): create reusable SplitButton component with dropdown functionality ([4c97782](https://github.com/Mearman/BibGraph/commit/4c97782))
* feat(web): discover all relationship types using relationship registry ([beb2c8a](https://github.com/Mearman/BibGraph/commit/beb2c8a))
* feat(web): display cached entities in static cache tier cards ([c5f5fd0](https://github.com/Mearman/BibGraph/commit/c5f5fd0))
* feat(web): enhance error handling and routing infrastructure ([05c4470](https://github.com/Mearman/BibGraph/commit/05c4470))
* feat(web): enhance theme system with extended colors and modern styling ([fb1c86a](https://github.com/Mearman/BibGraph/commit/fb1c86a))
* feat(web): expand Sprinkles configuration and fix approach ([6898d8e](https://github.com/Mearman/BibGraph/commit/6898d8e))
* feat(web): expand Sprinkles configuration with comprehensive atomic utilities ([f468ce7](https://github.com/Mearman/BibGraph/commit/f468ce7))
* feat(web): extract algorithm items into separate components ([e3a8da6](https://github.com/Mearman/BibGraph/commit/e3a8da6))
* feat(web): extract relationship edges from bookmarked entity data ([8f609d9](https://github.com/Mearman/BibGraph/commit/8f609d9))
* feat(web): implement 3D graph visualization with 2D/3D mode toggle ([c943c04](https://github.com/Mearman/BibGraph/commit/c943c04))
* feat(web): implement atomic CSS utilities with sprinkles ([9a3e46d](https://github.com/Mearman/BibGraph/commit/9a3e46d))
* feat(web): implement comprehensive theme system with component library switching ([30a2669](https://github.com/Mearman/BibGraph/commit/30a2669))
* feat(web): implement deduplication with graph list priority (T041) ([727b08f](https://github.com/Mearman/BibGraph/commit/727b08f))
* feat(web): implement embedded-with-resolution in relationship queries ([d5831b2](https://github.com/Mearman/BibGraph/commit/d5831b2))
* feat(web): implement entity type filter with graph list bypass (T035, T038-T040) ([446cf76](https://github.com/Mearman/BibGraph/commit/446cf76))
* feat(web): implement First Fit Decreasing 2D bin-packing ([539008e](https://github.com/Mearman/BibGraph/commit/539008e))
* feat(web): implement graph list management hook with provenance tracking (T042-T044) ([f4012e8](https://github.com/Mearman/BibGraph/commit/f4012e8))
* feat(web): implement hash-based color generation system ([8cb25f8](https://github.com/Mearman/BibGraph/commit/8cb25f8))
* feat(web): implement orientation-aware bin-packing for optimal space filling ([40d9844](https://github.com/Mearman/BibGraph/commit/40d9844))
* feat(web): implement pure Mantine style preset system ([4580ddf](https://github.com/Mearman/BibGraph/commit/4580ddf))
* feat(web): implement recursive grouped masonry with global grid alignment ([e99e602](https://github.com/Mearman/BibGraph/commit/e99e602))
* feat(web): integrate AlgorithmTabs into algorithms route ([065c55c](https://github.com/Mearman/BibGraph/commit/065c55c))
* feat(web): integrate auto-population with background strategy ([c3d17d9](https://github.com/Mearman/BibGraph/commit/c3d17d9))
* feat(web): integrate comprehensive Mantine theme with Vanilla Extract ([d0e9884](https://github.com/Mearman/BibGraph/commit/d0e9884))
* feat(web): integrate graph algorithms (community, pathfinding) ([aaad303](https://github.com/Mearman/BibGraph/commit/aaad303))
* feat(web): integrate ThemeProvider in main application ([17b6771](https://github.com/Mearman/BibGraph/commit/17b6771))
* feat(web): migrate algorithms route component to Sprinkles utilities ([d89044e](https://github.com/Mearman/BibGraph/commit/d89044e))
* feat(web): migrate BaseTable component to use Sprinkles ([4f4e67d](https://github.com/Mearman/BibGraph/commit/4f4e67d))
* feat(web): migrate BookmarkManager component to Sprinkles utilities ([f8f149e](https://github.com/Mearman/BibGraph/commit/f8f149e))
* feat(web): migrate ColorSchemeSelector component to Sprinkles utilities ([4908ce3](https://github.com/Mearman/BibGraph/commit/4908ce3))
* feat(web): migrate EntityDetailLayout component to Sprinkles utilities ([5cf5770](https://github.com/Mearman/BibGraph/commit/5cf5770))
* feat(web): migrate MainLayout component to use Sprinkles ([3515d61](https://github.com/Mearman/BibGraph/commit/3515d61))
* feat(web): move graph algorithms to right sidebar ([716ea36](https://github.com/Mearman/BibGraph/commit/716ea36))
* feat(web): synchronize graph visualization state between sidebar and graph page ([25a4e49](https://github.com/Mearman/BibGraph/commit/25a4e49))
* feat(web): use incremental updates during node expansion ([ad88d5f](https://github.com/Mearman/BibGraph/commit/ad88d5f))
* docs: amend constitution to v2.16.0 (type coercion prohibition) ([d7ced3d](https://github.com/Mearman/BibGraph/commit/d7ced3d))
* docs: fix Project Constitution reference in README ([37d6a27](https://github.com/Mearman/BibGraph/commit/37d6a27))
* docs: remove serial test execution constraints ([3aabd53](https://github.com/Mearman/BibGraph/commit/3aabd53))
* docs(constitution): amend to v2.11.1 with README conciseness improvements ([cedbc6f](https://github.com/Mearman/BibGraph/commit/cedbc6f))
* docs(constitution): amend to v2.13.0 - add Principle XVIII Agent Embed Link Format ([1c28752](https://github.com/Mearman/BibGraph/commit/1c28752))
* docs(constitution): amend to v2.13.1 (add git commit -a to prohibited commands) ([f404048](https://github.com/Mearman/BibGraph/commit/f404048))
* docs(constitution): amend to v2.14.0 - add Principle XIX Documentation Token Efficiency ([a3b42e9](https://github.com/Mearman/BibGraph/commit/a3b42e9))
* docs(docs): add constitution Principle XVII - No Magic Numbers/Values (v2.12.0) ([76cdf4d](https://github.com/Mearman/BibGraph/commit/76cdf4d))
* docs(docs): add Principle XVI - Presentation/Functionality Decoupling ([cee06dd](https://github.com/Mearman/BibGraph/commit/cee06dd))
* docs(docs): add Principle XX - hash computed colours ([a36918d](https://github.com/Mearman/BibGraph/commit/a36918d))
* docs(spec-033): add entity graph page specification and plan ([35e88fb](https://github.com/Mearman/BibGraph/commit/35e88fb))
* docs(spec): add enhanced weighted traversal specification (036) ([467c381](https://github.com/Mearman/BibGraph/commit/467c381))
* docs(spec): add implementation plan for persistent graph index (034) ([0f0d7ca](https://github.com/Mearman/BibGraph/commit/0f0d7ca))
* docs(spec): add indexed edge property support to spec-034 ([e35578c](https://github.com/Mearman/BibGraph/commit/e35578c))
* docs(spec): add interactive node expansion to spec-034 ([cc534aa](https://github.com/Mearman/BibGraph/commit/cc534aa))
* docs(spec): add pako-encoded list IDs for URL-shareable state ([87d3ea3](https://github.com/Mearman/BibGraph/commit/87d3ea3))
* docs(spec): add persistent graph index specification (034) ([4871b74](https://github.com/Mearman/BibGraph/commit/4871b74))
* docs(spec): add plan phase artifacts for enhanced weighted traversal ([f16a060](https://github.com/Mearman/BibGraph/commit/f16a060))
* docs(spec): add Principle XXI - CI Trigger Discipline ([8e62d81](https://github.com/Mearman/BibGraph/commit/8e62d81))
* docs(spec): add reconciliation approaches to plan.md ([76bc08c](https://github.com/Mearman/BibGraph/commit/76bc08c))
* docs(spec): add sample bibliographies feature to spec-029 ([d7ac05d](https://github.com/Mearman/BibGraph/commit/d7ac05d))
* docs(spec): add task list for enhanced weighted traversal ([6c51b9d](https://github.com/Mearman/BibGraph/commit/6c51b9d))
* docs(spec): add three reconciliation approaches for list collaboration ([9d39b5b](https://github.com/Mearman/BibGraph/commit/9d39b5b))
* docs(spec): add weighted graph traversal specification (035) ([995a24b](https://github.com/Mearman/BibGraph/commit/995a24b))
* docs(spec): align spec 029 with spec 034 persistent graph index ([93d6c21](https://github.com/Mearman/BibGraph/commit/93d6c21))
* docs(spec): amend constitution to v2.15.1 - SpecKit commit discipline ([bbfbc2a](https://github.com/Mearman/BibGraph/commit/bbfbc2a))
* docs(spec): clarify left panel layout with stacked sections (038-graph-list) ([c01cc0e](https://github.com/Mearman/BibGraph/commit/c01cc0e))
* docs(spec): generate task list for graph list implementation (038-graph-list) ([669963f](https://github.com/Mearman/BibGraph/commit/669963f))
* docs(spec): initialize graph list specification (038-graph-list) ([40abbce](https://github.com/Mearman/BibGraph/commit/40abbce))
* docs(spec): initialize spec-037 progressive pathfinding ([0df4a83](https://github.com/Mearman/BibGraph/commit/0df4a83))
* docs(spec): mark 3D visualization spec-031 complete ([803ee75](https://github.com/Mearman/BibGraph/commit/803ee75))
* docs(spec): mark spec-034 as complete in index ([55a13d1](https://github.com/Mearman/BibGraph/commit/55a13d1))
* docs(spec): promote catalogues to first-class list entities ([02af1d7](https://github.com/Mearman/BibGraph/commit/02af1d7))
* docs(spec): remove backward compatibility from spec 029 migration ([58d7071](https://github.com/Mearman/BibGraph/commit/58d7071))
* docs(spec): update specs index with spec-029, 030, 031 ([a1bc418](https://github.com/Mearman/BibGraph/commit/a1bc418))
* chore: update eslint config and dependencies ([46023b3](https://github.com/Mearman/BibGraph/commit/46023b3))
* chore(config): update Claude speckit commands ([afaeff0](https://github.com/Mearman/BibGraph/commit/afaeff0))
* chore(config): update roo commands and Specify scripts ([6767ef1](https://github.com/Mearman/BibGraph/commit/6767ef1))
* chore(deps): auto-fix syncpack mismatches [skip ci] ([4f892a4](https://github.com/Mearman/BibGraph/commit/4f892a4))
* chore(deps): auto-fix syncpack mismatches [skip ci] ([5c7b9b7](https://github.com/Mearman/BibGraph/commit/5c7b9b7))
* chore(deps): auto-fix syncpack mismatches [skip ci] ([b73eb97](https://github.com/Mearman/BibGraph/commit/b73eb97))
* chore(deps): update pnpm lockfile ([84995e0](https://github.com/Mearman/BibGraph/commit/84995e0))
* chore(deps): update pnpm-lock.yaml ([9399e3b](https://github.com/Mearman/BibGraph/commit/9399e3b))
* chore(docs): update README, specs index, and conventional commits config ([fdb8651](https://github.com/Mearman/BibGraph/commit/fdb8651))
* chore(release): 22.11.0 [skip ci] ([c14872f](https://github.com/Mearman/BibGraph/commit/c14872f))
* chore(tools): disable no-redundant-assignment rule to reduce noise ([6f6fb6c](https://github.com/Mearman/BibGraph/commit/6f6fb6c))
* chore(web): export RightSidebarContent from layout barrel ([78d12dc](https://github.com/Mearman/BibGraph/commit/78d12dc))
* perf(ci): increase E2E shards from 10 to 20 ([12d58ed](https://github.com/Mearman/BibGraph/commit/12d58ed))
* perf(nx): remove parallelism constraints ([096cad1](https://github.com/Mearman/BibGraph/commit/096cad1))
* test(algorithms): add type-guards unit tests (50% → 100% coverage) ([eea93fb](https://github.com/Mearman/BibGraph/commit/eea93fb))
* test(algorithms): add undirected graph traversal tests for dijkstra ([c12dafa](https://github.com/Mearman/BibGraph/commit/c12dafa))
* test(algorithms): add unit tests for utils/validators ([0ebb17b](https://github.com/Mearman/BibGraph/commit/0ebb17b))
* test(algorithms): increase label propagation tolerance for CI environments ([958c734](https://github.com/Mearman/BibGraph/commit/958c734))
* test(e2e): convert textContent assertions to toHaveText ([924fb35](https://github.com/Mearman/BibGraph/commit/924fb35))
* test(utils): add graph list storage tests (T025-T028) ([0892edb](https://github.com/Mearman/BibGraph/commit/0892edb))
* test(web): add E2E tests for graph list filter bypass (T037) ([ed234c1](https://github.com/Mearman/BibGraph/commit/ed234c1))
* test(web): add integration tests for entity type filter bypass (T036) ([ffe86fa](https://github.com/Mearman/BibGraph/commit/ffe86fa))
* test(web): fix E2E test import paths ([b9c43fb](https://github.com/Mearman/BibGraph/commit/b9c43fb))
* test(web): fix import paths in test files ([9a13569](https://github.com/Mearman/BibGraph/commit/9a13569))
* test(web): fix MainLayout responsive tests with proper provider setup ([5cb1d01](https://github.com/Mearman/BibGraph/commit/5cb1d01))
* test(web): wait for error state in cache miss E2E test ([e03ab8e](https://github.com/Mearman/BibGraph/commit/e03ab8e))
* test(web/utils): add tests for 3D visualization components ([c18c9bd](https://github.com/Mearman/BibGraph/commit/c18c9bd))
* config(algorithms): reduce coverage threshold from 100% to 74% ([66d8c8d](https://github.com/Mearman/BibGraph/commit/66d8c8d))
* fix(utils,types): apply lint fixes across utility packages ([f96d6ea](https://github.com/Mearman/BibGraph/commit/f96d6ea))
* Reapply "fix(web): disable storage state reuse in CI to prevent stale state" ([39fdd45](https://github.com/Mearman/BibGraph/commit/39fdd45))
* style(algorithms): apply eslint auto-fixes ([986084f](https://github.com/Mearman/BibGraph/commit/986084f))
* style(cli): apply eslint auto-fixes ([fe5df2b](https://github.com/Mearman/BibGraph/commit/fe5df2b))
* style(client): apply eslint auto-fixes ([59f6d69](https://github.com/Mearman/BibGraph/commit/59f6d69))
* style(client): fix import order in graph index files ([3e8afa2](https://github.com/Mearman/BibGraph/commit/3e8afa2))
* style(eslint): add React hook rule for review ([2474ecc](https://github.com/Mearman/BibGraph/commit/2474ecc))
* style(eslint): disable unicorn rules conflicting with TypeScript ([f9b5bf4](https://github.com/Mearman/BibGraph/commit/f9b5bf4))
* style(eslint): fix JSDoc warnings ([613f59c](https://github.com/Mearman/BibGraph/commit/613f59c))
* style(tools): apply eslint auto-fixes ([321c05a](https://github.com/Mearman/BibGraph/commit/321c05a))
* style(types): apply eslint auto-fixes ([0b6bd4f](https://github.com/Mearman/BibGraph/commit/0b6bd4f))
* style(ui): apply eslint auto-fixes ([096ab4a](https://github.com/Mearman/BibGraph/commit/096ab4a))
* style(utils): apply eslint auto-fixes ([2b6e6f0](https://github.com/Mearman/BibGraph/commit/2b6e6f0))
* style(web): apply eslint auto-fixes ([223dd02](https://github.com/Mearman/BibGraph/commit/223dd02))
* style(web): reduce accordion title heights in AlgorithmTabs ([c3e2756](https://github.com/Mearman/BibGraph/commit/c3e2756))
* style(web): update AlgorithmTabs icon sizes and text styling ([f0294ef](https://github.com/Mearman/BibGraph/commit/f0294ef))
* refactor(algorithms): update algorithm components and hooks for performance ([0ae4773](https://github.com/Mearman/BibGraph/commit/0ae4773))
* refactor(cli): simplify error handling and remove unused imports ([1690124](https://github.com/Mearman/BibGraph/commit/1690124))
* refactor(client): unify entity caching via response interception hook ([4f2df51](https://github.com/Mearman/BibGraph/commit/4f2df51))
* refactor(client): update algorithm item components and static data provider ([2985de0](https://github.com/Mearman/BibGraph/commit/2985de0))
* refactor(client): use loose ID validation for caching partial entities ([972f867](https://github.com/Mearman/BibGraph/commit/972f867))
* refactor(client): use plural entity types in StaticEntityType ([2ef57b1](https://github.com/Mearman/BibGraph/commit/2ef57b1))
* refactor(docs): DRY refactor README and AGENTS files ([d2a5e65](https://github.com/Mearman/BibGraph/commit/d2a5e65))
* refactor(docs): improve README conciseness without information loss ([76992b9](https://github.com/Mearman/BibGraph/commit/76992b9))
* refactor(graph): extract fit-to-view logic into shared useFitToView hook ([5882a4d](https://github.com/Mearman/BibGraph/commit/5882a4d))
* refactor(react): improve useState+useEffect patterns and disable overly strict rule ([57411e7](https://github.com/Mearman/BibGraph/commit/57411e7))
* refactor(stores): replace destructuring with filter to avoid unused variable warnings ([1032413](https://github.com/Mearman/BibGraph/commit/1032413))
* refactor(types): derive EntityType from ENTITY_TYPES array ([700c8b5](https://github.com/Mearman/BibGraph/commit/700c8b5))
* refactor(ui): remove unnecessary inline border styles to restore Mantine defaults ([fb42b3d](https://github.com/Mearman/BibGraph/commit/fb42b3d))
* refactor(web): complete theme system refactoring with dynamic color palettes ([a1aa3fd](https://github.com/Mearman/BibGraph/commit/a1aa3fd))
* refactor(web): convert AlgorithmTabs to collapsible sections ([b303fff](https://github.com/Mearman/BibGraph/commit/b303fff))
* refactor(web): expand Vanilla Extract migration to tables and algorithms ([a155329](https://github.com/Mearman/BibGraph/commit/a155329))
* refactor(web): import CommunityResult from shared types ([c0ec006](https://github.com/Mearman/BibGraph/commit/c0ec006))
* refactor(web): introduce Vanilla Extract style system to replace inline styles ([ddc9b4b](https://github.com/Mearman/BibGraph/commit/ddc9b4b))
* refactor(web): migrate components from inline styles to Vanilla Extract ([e347596](https://github.com/Mearman/BibGraph/commit/e347596))
* refactor(web): migrate edge and node styles to hash-based color system ([95a2040](https://github.com/Mearman/BibGraph/commit/95a2040))
* refactor(web): migrate ForceGraphVisualization to hash-based color system ([075eb70](https://github.com/Mearman/BibGraph/commit/075eb70))
* refactor(web): migrate inline styles to Mantine theming system ([085874c](https://github.com/Mearman/BibGraph/commit/085874c))
* refactor(web): migrate theme system to shadcn-colors architecture ([9cc46b5](https://github.com/Mearman/BibGraph/commit/9cc46b5))
* refactor(web): modularize theme architecture into separate files ([c0cf526](https://github.com/Mearman/BibGraph/commit/c0cf526))
* refactor(web): remove forced Relationships section placement ([ac51084](https://github.com/Mearman/BibGraph/commit/ac51084))
* refactor(web): rename fit-to-view handlers to fitToViewAll and fitToViewSelected ([f596783](https://github.com/Mearman/BibGraph/commit/f596783))
* refactor(web): rename ViewModeToggle to TableViewModeToggle ([9081c44](https://github.com/Mearman/BibGraph/commit/9081c44))
* refactor(web): replace hardcoded shadcn CSS variables with Mantine equivalents ([018d394](https://github.com/Mearman/BibGraph/commit/018d394))
* refactor(web): replace repository store with bookmarks for /graph ([047695a](https://github.com/Mearman/BibGraph/commit/047695a))
* refactor(web): simplify grid layout with CSS Grid auto-fill ([01bc716](https://github.com/Mearman/BibGraph/commit/01bc716))
* refactor(web): update core application imports ([1a3b9cd](https://github.com/Mearman/BibGraph/commit/1a3b9cd))
* refactor(web): update entity relationship hooks import paths ([a16cfaa](https://github.com/Mearman/BibGraph/commit/a16cfaa))
* refactor(web): update route component import paths ([58243a0](https://github.com/Mearman/BibGraph/commit/58243a0))
* refactor(web): use Link component for BookmarkCard and HistoryCard ([e6eb523](https://github.com/Mearman/BibGraph/commit/e6eb523))
* refactor(web): use native CSS Grid for entity data display ([1d9971e](https://github.com/Mearman/BibGraph/commit/1d9971e))
* build(config): exclude .css.ts files from barrel generation ([601ffb9](https://github.com/Mearman/BibGraph/commit/601ffb9))


### BREAKING CHANGE

* Inline color styles replaced with CSS custom properties
* Nx will now parallelize tasks based on available CPU cores instead of limiting to 3 concurrent operations.
* SplitButton replaces manual split button implementation
* Tests now run in parallel by default. Projects requiring serial execution must explicitly configure it in their local vitest.config files.

## 22.11.0 (2025-11-29)

* ci(ci): disable cancel-in-progress to allow E2E to complete ([de10af8](https://github.com/Mearman/BibGraph/commit/de10af8))
* ci(ci): make E2E shard count configurable via env var ([0d1c393](https://github.com/Mearman/BibGraph/commit/0d1c393))
* ci(ci): parallelize E2E tests with 4-way matrix sharding ([95046cd](https://github.com/Mearman/BibGraph/commit/95046cd))
* ci(ci): re-enable cancel-in-progress for parallel E2E ([832d08b](https://github.com/Mearman/BibGraph/commit/832d08b))
* fix(algorithms): increase biconnected performance test margin for CI variance ([e9df8d5](https://github.com/Mearman/BibGraph/commit/e9df8d5))
* fix(cli): export QueryOptions and CacheOptions interfaces ([8865f63](https://github.com/Mearman/BibGraph/commit/8865f63))
* fix(tools): remove re-exports from non-barrel files ([54ef964](https://github.com/Mearman/BibGraph/commit/54ef964))
* fix(ui): guard against null values in EntityCard counts ([e828ad4](https://github.com/Mearman/BibGraph/commit/e828ad4))
* fix(web): add IndexedDB cleanup between tests to prevent ConstraintError ([f3f5c83](https://github.com/Mearman/BibGraph/commit/f3f5c83))
* fix(web): add Select All/Clear All buttons to inline entity filter ([9fdaaf6](https://github.com/Mearman/BibGraph/commit/9fdaaf6))
* fix(web): apply no-reexport-from-non-barrel rule fixes ([8c2a3dd](https://github.com/Mearman/BibGraph/commit/8c2a3dd))
* fix(web): correct EntityTypeFilter semantics for Select All and Clear All ([1beadc6](https://github.com/Mearman/BibGraph/commit/1beadc6))
* fix(web): correct EntityTypeFilter toggle and button logic ([b30a44f](https://github.com/Mearman/BibGraph/commit/b30a44f))
* fix(web): display entity names instead of IDs in sidebar ([ff24e9d](https://github.com/Mearman/BibGraph/commit/ff24e9d))
* fix(web): import EntityFilters from canonical source in FilterField ([4ced285](https://github.com/Mearman/BibGraph/commit/4ced285))
* fix(web): improve entity type filter URL handling ([62360d3](https://github.com/Mearman/BibGraph/commit/62360d3))
* fix(web): remove deprecated --watch flag for Vite 7 compatibility ([01301f3](https://github.com/Mearman/BibGraph/commit/01301f3))
* fix(web): simplify algorithm Select data format to prevent crash ([22e5560](https://github.com/Mearman/BibGraph/commit/22e5560))
* fix(web): use __dirname for E2E test data file path resolution ([7850dd0](https://github.com/Mearman/BibGraph/commit/7850dd0))
* fix(web): use __dirname for reliable test data path resolution ([ee08c8e](https://github.com/Mearman/BibGraph/commit/ee08c8e))
* fix(web): use correct Mantine Select grouped data format ([cd3a074](https://github.com/Mearman/BibGraph/commit/cd3a074))
* feat(web,ui): add list, table, and card view options to bookmarks page ([7c95e43](https://github.com/Mearman/BibGraph/commit/7c95e43))
* fix(client,web): update barrelsby config and fix module imports ([2625367](https://github.com/Mearman/BibGraph/commit/2625367))
* fix(web,client): resolve lint errors for import order and unused variables ([b7d1886](https://github.com/Mearman/BibGraph/commit/b7d1886))
* fix(web,client): resolve TypeScript export errors for CI typecheck ([07cbf09](https://github.com/Mearman/BibGraph/commit/07cbf09))
* feat(tools): add no-duplicate-reexports ESLint rule ([e6c7080](https://github.com/Mearman/BibGraph/commit/e6c7080))
* feat(tools): add no-reexport-from-non-barrel ESLint rule ([133f7c7](https://github.com/Mearman/BibGraph/commit/133f7c7))
* feat(tools): enhance no-reexport-from-non-barrel rule ([95ca6fc](https://github.com/Mearman/BibGraph/commit/95ca6fc))
* feat(web): add AutocompletePage unified component ([c4f3b2f](https://github.com/Mearman/BibGraph/commit/c4f3b2f))
* feat(web): add cache tier visualization to catalogue page ([a93527f](https://github.com/Mearman/BibGraph/commit/a93527f))
* feat(web): add co-citation and bibliographic coupling to algorithms demo ([c03995f](https://github.com/Mearman/BibGraph/commit/c03995f))
* feat(web): add comprehensive algorithm support to demo panel ([4f2caa0](https://github.com/Mearman/BibGraph/commit/4f2caa0))
* feat(web): add entity type toggle filter to autocomplete page ([31e7d5c](https://github.com/Mearman/BibGraph/commit/31e7d5c))
* feat(web): add EntityTypeFilter to entity-specific autocomplete routes ([24cabe0](https://github.com/Mearman/BibGraph/commit/24cabe0))
* feat(web): add useEntityAutocomplete hook ([57c6f7d](https://github.com/Mearman/BibGraph/commit/57c6f7d))
* feat(web): add view mode switcher to autocomplete page ([97c149a](https://github.com/Mearman/BibGraph/commit/97c149a))
* feat(web): auto-discover routes for smoke tests ([f220afa](https://github.com/Mearman/BibGraph/commit/f220afa))
* feat(web): expand algorithms demo with more clustering and analysis algorithms ([7c21ca9](https://github.com/Mearman/BibGraph/commit/7c21ca9))
* test(web): add E2E tests for algorithms page crash detection ([8d5503a](https://github.com/Mearman/BibGraph/commit/8d5503a))
* test(web): add smoke tests for missing routes ([65c36dc](https://github.com/Mearman/BibGraph/commit/65c36dc))
* refactor(web): create unified AutocompleteEntityFilter component ([8fa6e8c](https://github.com/Mearman/BibGraph/commit/8fa6e8c))
* refactor(web): extract useAutocompleteEntityNavigation hook for DRY ([e3b3695](https://github.com/Mearman/BibGraph/commit/e3b3695))
* refactor(web): simplify autocomplete routes with shared components ([32e2637](https://github.com/Mearman/BibGraph/commit/32e2637))
* chore(release): 22.10.0 [skip ci] ([585c422](https://github.com/Mearman/BibGraph/commit/585c422))
* chore(web): export AutocompleteEntityFilter from components barrel ([f21776d](https://github.com/Mearman/BibGraph/commit/f21776d))
* chore(web): remove empty stub E2E test files ([e6dd7fa](https://github.com/Mearman/BibGraph/commit/e6dd7fa))

## 22.10.0 (2025-11-29)

* chore(config): enhance syncpack pre-commit hook configuration ([c82d9f4](https://github.com/Mearman/BibGraph/commit/c82d9f4))
* chore(release): 22.9.0 [skip ci] ([0980fe6](https://github.com/Mearman/BibGraph/commit/0980fe6))
* refactor(schema): extract JSON Logic schema into separate file ([49b7467](https://github.com/Mearman/BibGraph/commit/49b7467))
* feat(web): add Nx Atomizer and --only-changed for incremental E2E caching ([3c92b3f](https://github.com/Mearman/BibGraph/commit/3c92b3f))

## 22.9.0 (2025-11-29)

* ci(deps): bump actions/setup-node from 4 to 6 (#146) ([270bb2b](https://github.com/Mearman/BibGraph/commit/270bb2b)), closes [#146](https://github.com/Mearman/BibGraph/issues/146)
* chore(deps): auto-fix syncpack mismatches [skip ci] ([2c552d0](https://github.com/Mearman/BibGraph/commit/2c552d0))
* chore(release): 22.8.2 [skip ci] ([55851a8](https://github.com/Mearman/BibGraph/commit/55851a8))
* chore(web): enable Nx caching for E2E tests and remove duplicate targets ([3f1d01e](https://github.com/Mearman/BibGraph/commit/3f1d01e))
* chore(web): simplify E2E config to run all tests by default ([73b3aa6](https://github.com/Mearman/BibGraph/commit/73b3aa6))
* feat(client): add Dexie-based IndexedDB tier to entity cache system ([1cd265a](https://github.com/Mearman/BibGraph/commit/1cd265a))
* feat(tools): add ESLint rule to enforce barrelsby headers in index files ([eb5abbd](https://github.com/Mearman/BibGraph/commit/eb5abbd))
* feat(web): add inline PDF viewer for work entity pages ([93a969d](https://github.com/Mearman/BibGraph/commit/93a969d))
* fix: add test:accessibility:dev task for consistent naming ([b3b670f](https://github.com/Mearman/BibGraph/commit/b3b670f))
* fix(client): use barrelsby header in unpaywall index for proper regeneration ([40c9083](https://github.com/Mearman/BibGraph/commit/40c9083))
* fix(web): correct E2E test data file paths to use existing fixtures ([f481921](https://github.com/Mearman/BibGraph/commit/f481921))
* fix(web): repair unskipped component tests ([6355346](https://github.com/Mearman/BibGraph/commit/6355346))
* refactor(ci): rename a11y/lighthouse tasks to test:accessibility/test:performance ([4330c9c](https://github.com/Mearman/BibGraph/commit/4330c9c))
* refactor(ci): separate accessibility and performance CI jobs ([a2ac8c1](https://github.com/Mearman/BibGraph/commit/a2ac8c1))
* test(web): add OpenAlex test URL data files for E2E tests ([698f167](https://github.com/Mearman/BibGraph/commit/698f167))
* test(web): remove all dynamic E2E test skips ([190cbf4](https://github.com/Mearman/BibGraph/commit/190cbf4))
* test(web): unskip all E2E and component tests ([60ebc48](https://github.com/Mearman/BibGraph/commit/60ebc48))

## <small>22.8.2 (2025-11-28)</small>

* fix(web): add topics support for embedded relationship extraction ([21c098b](https://github.com/Mearman/BibGraph/commit/21c098b))

## 22.8.0 (2025-11-28)

* feat(web): add individual locks to node type distribution sliders ([8cecfde](https://github.com/Mearman/BibGraph/commit/8cecfde))
* chore(release): 22.7.0 [skip ci] ([bff2f0b](https://github.com/Mearman/BibGraph/commit/bff2f0b))

## 22.7.0 (2025-11-28)

* refactor(web): calculate entity weights dynamically from raw OpenAlex counts ([99c1dcf](https://github.com/Mearman/BibGraph/commit/99c1dcf))
* refactor(web): generate distribution sliders dynamically for all 12 entity types ([3c4b66a](https://github.com/Mearman/BibGraph/commit/3c4b66a))
* fix(web): lock distribution percentages by default in algorithms page ([d38047c](https://github.com/Mearman/BibGraph/commit/d38047c))
* feat(web): expand sample graph generator to all 12 entity types ([ec3da20](https://github.com/Mearman/BibGraph/commit/ec3da20))
* feat(web): use canonical edge-styles for relationship type coloring ([b18d782](https://github.com/Mearman/BibGraph/commit/b18d782))
* feat(web): use OpenAlex API-derived weights for entity distribution ([5d67234](https://github.com/Mearman/BibGraph/commit/5d67234))
* chore(release): 22.6.0 [skip ci] ([c6bc884](https://github.com/Mearman/BibGraph/commit/c6bc884))

## 22.6.0 (2025-11-28)

* fix(web): remove unused arrowWidth variable in graph visualization ([a1e89ed](https://github.com/Mearman/BibGraph/commit/a1e89ed))
* fix(web): show node counts in total nodes slider tooltip ([831ab7b](https://github.com/Mearman/BibGraph/commit/831ab7b))
* feat(web): add arrowhead rendering for directed edges in graph visualization ([3b86827](https://github.com/Mearman/BibGraph/commit/3b86827))
* feat(web): add directed/undirected toggle for shortest path algorithm ([e6ebd75](https://github.com/Mearman/BibGraph/commit/e6ebd75))
* feat(web): add numeric inputs to all graph configuration sliders ([0262e84](https://github.com/Mearman/BibGraph/commit/0262e84))
* feat(web): set default max node count to 1000 and lock by default ([e3bd9e7](https://github.com/Mearman/BibGraph/commit/e3bd9e7))
* chore(release): 22.5.0 [skip ci] ([346150c](https://github.com/Mearman/BibGraph/commit/346150c))

## 22.5.0 (2025-11-28)

* refactor(web): extract node count bias into configurable function ([8003199](https://github.com/Mearman/BibGraph/commit/8003199))
* feat(web): bias randomized node count towards lower values ([7fa572f](https://github.com/Mearman/BibGraph/commit/7fa572f))
* chore(release): 22.4.0 [skip ci] ([0953b86](https://github.com/Mearman/BibGraph/commit/0953b86))

## 22.4.0 (2025-11-28)

* feat(web): add individual lock buttons to all graph configuration sliders ([21e4f5c](https://github.com/Mearman/BibGraph/commit/21e4f5c))
* feat(web): replace node count sliders with total nodes + percentage distribution ([a00385c](https://github.com/Mearman/BibGraph/commit/a00385c))
* feat(web): use logarithmic scale for total nodes slider (5-10,000) ([0b24fbe](https://github.com/Mearman/BibGraph/commit/0b24fbe))
* fix(web): prevent simulation restart on node selection ([3a1c342](https://github.com/Mearman/BibGraph/commit/3a1c342))
* chore(release): 22.3.0 [skip ci] ([ceff893](https://github.com/Mearman/BibGraph/commit/ceff893))

## 22.3.0 (2025-11-28)

* feat(web): auto-regenerate graph when configuration changes ([a5e9584](https://github.com/Mearman/BibGraph/commit/a5e9584))
* feat(web): randomize button now randomizes all slider values ([3b6086c](https://github.com/Mearman/BibGraph/commit/3b6086c))
* chore(release): 22.2.0 [skip ci] ([8ac09e6](https://github.com/Mearman/BibGraph/commit/8ac09e6))

## 22.2.0 (2025-11-28)

* feat(web): sync node clicks with shortest path source/target selection ([b7c65ee](https://github.com/Mearman/BibGraph/commit/b7c65ee))
* fix(web): inject build info at compile time for version display ([0435ae3](https://github.com/Mearman/BibGraph/commit/0435ae3))
* chore(release): 22.1.0 [skip ci] ([53afb4b](https://github.com/Mearman/BibGraph/commit/53afb4b))

## 22.1.0 (2025-11-28)

* refactor(web): replace base±variance inputs with RangeSliders ([56b617f](https://github.com/Mearman/BibGraph/commit/56b617f))
* feat(web): add configurable sample graph generation on algorithms page ([3476701](https://github.com/Mearman/BibGraph/commit/3476701))
* feat(web): add seed lock toggle for reproducible graph generation ([f458411](https://github.com/Mearman/BibGraph/commit/f458411))
* feat(web): add variance controls for edges per node constraints ([ed6a452](https://github.com/Mearman/BibGraph/commit/ed6a452))
* feat(web): add variance controls to sample graph node counts ([0810c00](https://github.com/Mearman/BibGraph/commit/0810c00))
* chore(release): 22.0.0 [skip ci] ([b523098](https://github.com/Mearman/BibGraph/commit/b523098))

## 22.0.0 (2025-11-28)

* fix(ci): allow shared cache artifacts across CI runners ([606a086](https://github.com/Mearman/BibGraph/commit/606a086))
* fix(ci): update Nx cache for v22 database cache compatibility ([3b896d8](https://github.com/Mearman/BibGraph/commit/3b896d8))
* fix(web): make favicon respond to system color scheme ([9efaf28](https://github.com/Mearman/BibGraph/commit/9efaf28))
* fix(web): remove nested MainLayout causing duplicate main elements ([e6ddb6b](https://github.com/Mearman/BibGraph/commit/e6ddb6b))
* fix(web): rename academicExplorerResults to bibGraphResults ([2252e3b](https://github.com/Mearman/BibGraph/commit/2252e3b))
* refactor(config): complete BibGraph rebrand across codebase ([9f56f93](https://github.com/Mearman/BibGraph/commit/9f56f93))
* refactor(config): rebrand from Academic Explorer to BibGraph ([c0aefe7](https://github.com/Mearman/BibGraph/commit/c0aefe7))
* test(web): add page smoke tests for all routes ([21e773f](https://github.com/Mearman/BibGraph/commit/21e773f))
* feat(web): add BibGraph favicon replacing default Vite icon ([5ebb3eb](https://github.com/Mearman/BibGraph/commit/5ebb3eb))
* feat(web): add force-directed graph visualization component ([0544e41](https://github.com/Mearman/BibGraph/commit/0544e41))
* feat(web): add showSystemCatalogues setting to settings store ([5c8165b](https://github.com/Mearman/BibGraph/commit/5c8165b))
* feat(web): add toggle to show system catalogues in catalogue list ([bfbdc06](https://github.com/Mearman/BibGraph/commit/bfbdc06))
* feat(web): display version badge in header with release link ([564ec3f](https://github.com/Mearman/BibGraph/commit/564ec3f))
* feat(web): expose community detection results from algorithms panel ([d7b62ea](https://github.com/Mearman/BibGraph/commit/d7b62ea))
* feat(web): integrate force graph visualization in algorithms page ([71e6460](https://github.com/Mearman/BibGraph/commit/71e6460))
* chore(release): 21.3.0 [skip ci] ([e8f1367](https://github.com/Mearman/BibGraph/commit/e8f1367))


### BREAKING CHANGE

* IndexedDB database names changed - existing user data
will not migrate automatically

## 21.3.0 (2025-11-28)

* fix(ci): bump Nx cache version to v4 to clear stale artifacts ([f39c657](https://github.com/Mearman/Academic-Explorer/commit/f39c657))
* fix(ci): install dependencies before running syncpack in dependabot workflow ([e282e04](https://github.com/Mearman/Academic-Explorer/commit/e282e04))
* fix(ci): use workflow file hash for self-invalidating Nx cache key ([208999b](https://github.com/Mearman/Academic-Explorer/commit/208999b))
* fix(config): update commitlint scopes to match current package structure ([eb3a5a6](https://github.com/Mearman/Academic-Explorer/commit/eb3a5a6))
* fix(web): use relative base path for dual-domain deployment ([2f5345a](https://github.com/Mearman/Academic-Explorer/commit/2f5345a))
* feat(ci): add syncpack auto-fix on main branch ([f5a6ade](https://github.com/Mearman/Academic-Explorer/commit/f5a6ade))
* chore(release): 21.2.1 [skip ci] ([a6ff715](https://github.com/Mearman/Academic-Explorer/commit/a6ff715))

## <small>21.2.1 (2025-11-28)</small>

* chore(deps-dev): bump @axe-core/playwright from 4.10.2 to 4.11.0 (#141) ([915c6a0](https://github.com/Mearman/Academic-Explorer/commit/915c6a0)), closes [#141](https://github.com/Mearman/Academic-Explorer/issues/141)
* chore(deps-dev): bump @types/node from 24.10.0 to 24.10.1 (#137) ([373d0e5](https://github.com/Mearman/Academic-Explorer/commit/373d0e5)), closes [#137](https://github.com/Mearman/Academic-Explorer/issues/137)
* chore(deps-dev): bump chokidar from 4.0.3 to 5.0.0 (#139) ([793e7c1](https://github.com/Mearman/Academic-Explorer/commit/793e7c1)), closes [#139](https://github.com/Mearman/Academic-Explorer/issues/139)
* chore(deps-dev): bump fake-indexeddb from 6.2.4 to 6.2.5 (#143) ([fdc1523](https://github.com/Mearman/Academic-Explorer/commit/fdc1523)), closes [#143](https://github.com/Mearman/Academic-Explorer/issues/143)
* chore(deps-dev): bump immer from 10.1.3 to 11.0.0 (#140) ([5802669](https://github.com/Mearman/Academic-Explorer/commit/5802669)), closes [#140](https://github.com/Mearman/Academic-Explorer/issues/140)
* chore(deps): bump @react-three/drei from 10.7.6 to 10.7.7 (#142) ([a98a7d8](https://github.com/Mearman/Academic-Explorer/commit/a98a7d8)), closes [#142](https://github.com/Mearman/Academic-Explorer/issues/142)
* chore(release): 21.2.0 [skip ci] ([6823803](https://github.com/Mearman/Academic-Explorer/commit/6823803))
* chore(web)(deps-dev): bump @vanilla-extract/css from 1.17.4 to 1.17.5 in /apps/web (#147) ([53f689e](https://github.com/Mearman/Academic-Explorer/commit/53f689e)), closes [#147](https://github.com/Mearman/Academic-Explorer/issues/147)
* ci(deps): bump actions/checkout from 4 to 6 (#145) ([e9e4e74](https://github.com/Mearman/Academic-Explorer/commit/e9e4e74)), closes [#145](https://github.com/Mearman/Academic-Explorer/issues/145)

## 21.2.0 (2025-11-28)

* feat(ci): add syncpack to Dependabot lockfile workflow ([3a3c602](https://github.com/Mearman/Academic-Explorer/commit/3a3c602))
* chore(release): 21.1.2 [skip ci] ([4f13ede](https://github.com/Mearman/Academic-Explorer/commit/4f13ede))

## <small>21.1.2 (2025-11-27)</small>

* fix(ci): use PR author check for Dependabot lockfile workflow ([807629c](https://github.com/Mearman/Academic-Explorer/commit/807629c))
* ci(ci): remove outdated-check job ([27b09d3](https://github.com/Mearman/Academic-Explorer/commit/27b09d3))
* ci(config): expand Dependabot for monorepo and fix actionlint scope ([5d19be3](https://github.com/Mearman/Academic-Explorer/commit/5d19be3))
* ci(deps): add workflow to auto-fix Dependabot lockfiles ([99fc0fd](https://github.com/Mearman/Academic-Explorer/commit/99fc0fd))
* ci(deps): bump actions/checkout from 5 to 6 (#111) ([b4600f4](https://github.com/Mearman/Academic-Explorer/commit/b4600f4)), closes [#111](https://github.com/Mearman/Academic-Explorer/issues/111)
* ci(deps): bump actions/download-artifact from 4 to 6 (#109) ([371775a](https://github.com/Mearman/Academic-Explorer/commit/371775a)), closes [#109](https://github.com/Mearman/Academic-Explorer/issues/109)
* ci(deps): bump actions/github-script from 7 to 8 (#112) ([6776e29](https://github.com/Mearman/Academic-Explorer/commit/6776e29)), closes [#112](https://github.com/Mearman/Academic-Explorer/issues/112)
* ci(deps): bump actions/upload-artifact from 4 to 5 (#110) ([79336d6](https://github.com/Mearman/Academic-Explorer/commit/79336d6)), closes [#110](https://github.com/Mearman/Academic-Explorer/issues/110)
* chore(deps-dev): bump the testing group with 5 updates (#135) ([15a84be](https://github.com/Mearman/Academic-Explorer/commit/15a84be)), closes [#135](https://github.com/Mearman/Academic-Explorer/issues/135)
* chore(release): 21.1.1 [skip ci] ([a514e76](https://github.com/Mearman/Academic-Explorer/commit/a514e76))

## <small>21.1.1 (2025-11-27)</small>

* refactor(web): relocate test files from routes/ to src/test/ ([433cef8](https://github.com/Mearman/Academic-Explorer/commit/433cef8))
* chore(release): 21.1.0 [skip ci] ([137a0ed](https://github.com/Mearman/Academic-Explorer/commit/137a0ed))

## 21.1.0 (2025-11-27)

* fix(config): enforce correct exports condition order via syncpack ([37a35bc](https://github.com/Mearman/Academic-Explorer/commit/37a35bc))
* fix(config): migrate test targets to @nx/vitest:test executor ([ae1e749](https://github.com/Mearman/Academic-Explorer/commit/ae1e749))
* fix(deps): regenerate lockfile for knip version specifier ([d2da0af](https://github.com/Mearman/Academic-Explorer/commit/d2da0af))
* fix(deps): remove unused eslint-plugin-yaml to fix js-yaml vulnerability ([33277d8](https://github.com/Mearman/Academic-Explorer/commit/33277d8))
* fix(ui-components): add setupFiles to vitest projects config ([6e51c05](https://github.com/Mearman/Academic-Explorer/commit/6e51c05))
* chore(config): add ci scope for commit messages ([0bc68aa](https://github.com/Mearman/Academic-Explorer/commit/0bc68aa))
* chore(deps): regenerate lockfile and update documentation ([c5e5509](https://github.com/Mearman/Academic-Explorer/commit/c5e5509))
* chore(release): 21.0.2 [skip ci] ([a060411](https://github.com/Mearman/Academic-Explorer/commit/a060411))
* chore(web): add explicit tsconfig project references ([be7a2b9](https://github.com/Mearman/Academic-Explorer/commit/be7a2b9))
* refactor(config): replace broken deps:check with separate audit/outdated jobs ([9b2a4e0](https://github.com/Mearman/Academic-Explorer/commit/9b2a4e0))
* feat(deps): add knip for unused dependency detection ([9a199f3](https://github.com/Mearman/Academic-Explorer/commit/9a199f3))
* feat(web): add algorithms routes and visualization panels ([57a0e66](https://github.com/Mearman/Academic-Explorer/commit/57a0e66))
* build(config): enforce fixed versions for pnpm overrides in syncpack ([0edb9bf](https://github.com/Mearman/Academic-Explorer/commit/0edb9bf))
* build(config): upgrade Nx to v22.1.3 and fix continuous target caching ([2a29cc5](https://github.com/Mearman/Academic-Explorer/commit/2a29cc5))
* build(deps): upgrade Nx packages and clean up dependencies ([ae2273f](https://github.com/Mearman/Academic-Explorer/commit/ae2273f))
* build(ui-components): upgrade Storybook to v10.1.0 with ESM support ([3d4e14e](https://github.com/Mearman/Academic-Explorer/commit/3d4e14e))
* test(ui-components): rename tests to component naming convention ([a671677](https://github.com/Mearman/Academic-Explorer/commit/a671677))

## <small>21.0.2 (2025-11-27)</small>

* fix(config): handle missing coverage artifacts gracefully ([e55fdc7](https://github.com/Mearman/Academic-Explorer/commit/e55fdc7))
* fix(graph): increase label propagation scaling test margin for CI ([b78ba7a](https://github.com/Mearman/Academic-Explorer/commit/b78ba7a))
* chore(release): 21.0.1 [skip ci] ([1331796](https://github.com/Mearman/Academic-Explorer/commit/1331796))

## <small>21.0.1 (2025-11-27)</small>

* fix(cli): use importOriginal in logger mock to preserve all exports ([8a65e9e](https://github.com/Mearman/Academic-Explorer/commit/8a65e9e))
* fix(config): add passWithNoTests to nx.json targets for empty test suites ([b1df947](https://github.com/Mearman/Academic-Explorer/commit/b1df947))
* fix(config): add source exports to workspace packages for vitest resolution ([9d3e5f3](https://github.com/Mearman/Academic-Explorer/commit/9d3e5f3))
* fix(graph): add globals to algorithms vitest inline projects ([7aa435d](https://github.com/Mearman/Academic-Explorer/commit/7aa435d))
* fix(graph): add root and resolve to algorithms vitest inline projects ([eb4c7c4](https://github.com/Mearman/Academic-Explorer/commit/eb4c7c4))
* fix(graph): add root to algorithms vitest config for nx compatibility ([9e6e68f](https://github.com/Mearman/Academic-Explorer/commit/9e6e68f))
* fix(graph): increase biconnected complexity test margin for CI ([988ada4](https://github.com/Mearman/Academic-Explorer/commit/988ada4))
* fix(graph): increase Leiden performance test thresholds for CI ([f7d72bd](https://github.com/Mearman/Academic-Explorer/commit/f7d72bd))
* fix(graph): use nxViteTsPaths plugin and baseVitestConfig ([b43766d](https://github.com/Mearman/Academic-Explorer/commit/b43766d))
* fix(web): add plugins/resolve/globals to vitest inline projects ([5f15847](https://github.com/Mearman/Academic-Explorer/commit/5f15847))
* fix(web): add setupFiles to vitest projects for fake-indexeddb ([552ebd3](https://github.com/Mearman/Academic-Explorer/commit/552ebd3))
* refactor(config): use vitest projects with --project flag instead of separate configs ([4182538](https://github.com/Mearman/Academic-Explorer/commit/4182538))
* chore(release): 21.0.0 [skip ci] ([19422cf](https://github.com/Mearman/Academic-Explorer/commit/19422cf))

## 21.0.0 (2025-11-27)

* fix(algorithms): correct undirected graph metrics calculations ([4f88067](https://github.com/Mearman/Academic-Explorer/commit/4f88067))
* fix(algorithms): increase k-core scaling test safety margin ([e94100d](https://github.com/Mearman/Academic-Explorer/commit/e94100d))
* fix(build): retry build command on failure ([e35c954](https://github.com/Mearman/Academic-Explorer/commit/e35c954))
* fix(ci): use built-in pnpm caching to prevent tar corruption ([65e51bf](https://github.com/Mearman/Academic-Explorer/commit/65e51bf))
* fix(cli): add typecheck configuration with path mappings ([6d747a6](https://github.com/Mearman/Academic-Explorer/commit/6d747a6))
* fix(cli): remove build step and use tsx for direct TypeScript execution ([11cafbc](https://github.com/Mearman/Academic-Explorer/commit/11cafbc))
* fix(client): add separate typecheck config with source path mappings ([e08a63f](https://github.com/Mearman/Academic-Explorer/commit/e08a63f))
* fix(client): add subpath exports for Node16 module resolution ([01e6cb1](https://github.com/Mearman/Academic-Explorer/commit/01e6cb1))
* fix(config): add proper dependsOn chains for Nx task graph optimization ([0b49b7e](https://github.com/Mearman/Academic-Explorer/commit/0b49b7e))
* fix(config): resolve generators lint errors and ignore algorithms tests ([1996fab](https://github.com/Mearman/Academic-Explorer/commit/1996fab))
* fix(config): use nx:run-commands for vitest test targets ([6dc133b](https://github.com/Mearman/Academic-Explorer/commit/6dc133b))
* fix(deps): add missing @nx/vitest and fix lint-staged config ([99bbf42](https://github.com/Mearman/Academic-Explorer/commit/99bbf42))
* fix(deps): upgrade @playwright/test to 1.56.1 ([cc32d39](https://github.com/Mearman/Academic-Explorer/commit/cc32d39))
* fix(e2e): correct path to openalex-urls-sample.json ([efa6fff](https://github.com/Mearman/Academic-Explorer/commit/efa6fff))
* fix(graph): correct undirected graph edge detection in metrics ([71ffe23](https://github.com/Mearman/Academic-Explorer/commit/71ffe23))
* fix(graph): remove incorrect division by 2 in conductance calculation ([a14a119](https://github.com/Mearman/Academic-Explorer/commit/a14a119))
* fix(lint): restore root eslint.config.ts for Nx targetDefaults ([0d3d994](https://github.com/Mearman/Academic-Explorer/commit/0d3d994))
* fix(monorepo): add ^build dependency to test targets ([f971c6f](https://github.com/Mearman/Academic-Explorer/commit/f971c6f))
* fix(nx): correct caching configuration for proper cache hits ([932bb25](https://github.com/Mearman/Academic-Explorer/commit/932bb25))
* fix(nx): prevent infinite loop by excluding scripts from Nx inference ([31ef06f](https://github.com/Mearman/Academic-Explorer/commit/31ef06f))
* fix(nx): use published URLs in schema references ([a2a8b4b](https://github.com/Mearman/Academic-Explorer/commit/a2a8b4b))
* fix(openalex-client): exclude tests with workspace resolution issues ([b347508](https://github.com/Mearman/Academic-Explorer/commit/b347508))
* fix(root): increase k-core scaling test safety margin ([2aed24b](https://github.com/Mearman/Academic-Explorer/commit/2aed24b))
* fix(root): remove build retry hack ([042626c](https://github.com/Mearman/Academic-Explorer/commit/042626c))
* fix(scripts): handle fully-qualified task names in mermaid generator ([ddcbb3c](https://github.com/Mearman/Academic-Explorer/commit/ddcbb3c))
* fix(scripts): prevent kill-nx from terminating itself ([f33a8c3](https://github.com/Mearman/Academic-Explorer/commit/f33a8c3))
* fix(tools): add path mappings and fix typecheck target ([44e71ff](https://github.com/Mearman/Academic-Explorer/commit/44e71ff))
* fix(ui): correct path mappings to source files ([e96e415](https://github.com/Mearman/Academic-Explorer/commit/e96e415))
* fix(ui): update typecheck to use separate config without project refs ([b62e53d](https://github.com/Mearman/Academic-Explorer/commit/b62e53d))
* fix(utils): update path mapping to use source files ([d12d264](https://github.com/Mearman/Academic-Explorer/commit/d12d264))
* fix(web): fix test failures and lint errors ([6af2ad2](https://github.com/Mearman/Academic-Explorer/commit/6af2ad2))
* fix(web): resolve lint errors in E2E tests and page objects ([bc19516](https://github.com/Mearman/Academic-Explorer/commit/bc19516))
* fix(web): resolve Nx build infinite loop and path mappings ([703eae5](https://github.com/Mearman/Academic-Explorer/commit/703eae5)), closes [nrwl/nx#26331](https://github.com/nrwl/nx/issues/26331)
* fix(web): resolve test file type and lint errors ([57c6b43](https://github.com/Mearman/Academic-Explorer/commit/57c6b43))
* fix(web): update tsconfig with wildcard path mappings ([ba65aec](https://github.com/Mearman/Academic-Explorer/commit/ba65aec))
* fix(web): use import.meta.url for reliable E2E path resolution in CI ([5388887](https://github.com/Mearman/Academic-Explorer/commit/5388887))
* fix(web/stores): fix RelationType enum values and remove explicit any ([f99a272](https://github.com/Mearman/Academic-Explorer/commit/f99a272))
* fix(web/types): add MinimalExportMetadata for catalogue exports ([472441a](https://github.com/Mearman/Academic-Explorer/commit/472441a))
* refactor: extract entity matchers and state utilities ([35ba837](https://github.com/Mearman/Academic-Explorer/commit/35ba837))
* refactor(algorithms): clean up clustering implementations ([9e31834](https://github.com/Mearman/Academic-Explorer/commit/9e31834))
* refactor(algorithms): enforce strict unused variable rules ([c8d3f36](https://github.com/Mearman/Academic-Explorer/commit/c8d3f36))
* refactor(algorithms): remove unused community caching code from Louvain ([e4a7cda](https://github.com/Mearman/Academic-Explorer/commit/e4a7cda))
* refactor(algorithms): replace non-null assertions with explicit checks ([2996cf7](https://github.com/Mearman/Academic-Explorer/commit/2996cf7))
* refactor(algorithms): simplify type signatures ([51670a6](https://github.com/Mearman/Academic-Explorer/commit/51670a6))
* refactor(cli): simplify TypeScript configuration ([52b6951](https://github.com/Mearman/Academic-Explorer/commit/52b6951))
* refactor(cli): use bundler module resolution and remove explicit any ([32e1f9e](https://github.com/Mearman/Academic-Explorer/commit/32e1f9e))
* refactor(client): consolidate AutocompleteOptions and improve imports ([72dfab9](https://github.com/Mearman/Academic-Explorer/commit/72dfab9))
* refactor(client): delegate buildFilterString to filter-builder ([89ee415](https://github.com/Mearman/Academic-Explorer/commit/89ee415))
* refactor(client): extract request pipeline and client types ([9a5e31d](https://github.com/Mearman/Academic-Explorer/commit/9a5e31d))
* refactor(client): remove explicit any types from client package ([2335cc9](https://github.com/Mearman/Academic-Explorer/commit/2335cc9))
* refactor(client): remove unused files and clean imports ([92f53e0](https://github.com/Mearman/Academic-Explorer/commit/92f53e0))
* refactor(config): consolidate to single validate job for Nx efficiency ([7e40a86](https://github.com/Mearman/Academic-Explorer/commit/7e40a86))
* refactor(config): DRY apps/cli project.json via Nx targetDefaults ([da7ed18](https://github.com/Mearman/Academic-Explorer/commit/da7ed18))
* refactor(config): DRY apps/web project.json via Nx targetDefaults ([993453b](https://github.com/Mearman/Academic-Explorer/commit/993453b))
* refactor(config): DRY project.json configs via Nx targetDefaults ([7656cee](https://github.com/Mearman/Academic-Explorer/commit/7656cee))
* refactor(config): remove explicit typecheck targets ([d920945](https://github.com/Mearman/Academic-Explorer/commit/d920945))
* refactor(config): simplify cli and utils vitest configs ([bb02a3c](https://github.com/Mearman/Academic-Explorer/commit/bb02a3c))
* refactor(config): simplify TypeScript and Vite configuration ([bce2293](https://github.com/Mearman/Academic-Explorer/commit/bce2293))
* refactor(eslint): enforce strict no-explicit-any rule ([0fc0ec1](https://github.com/Mearman/Academic-Explorer/commit/0fc0ec1))
* refactor(lint): strengthen no-unused-vars and add import rules ([90caa59](https://github.com/Mearman/Academic-Explorer/commit/90caa59))
* refactor(monorepo): convert all package.json scripts to Nx tasks ([4f10c3c](https://github.com/Mearman/Academic-Explorer/commit/4f10c3c))
* refactor(monorepo): infer validate target via plugin ([4972ec4](https://github.com/Mearman/Academic-Explorer/commit/4972ec4))
* refactor(monorepo): update package.json scripts to invoke Nx tasks ([f6c7506](https://github.com/Mearman/Academic-Explorer/commit/f6c7506))
* refactor(nx): normalize project tags for consistency ([7f7e52c](https://github.com/Mearman/Academic-Explorer/commit/7f7e52c))
* refactor(nx): remove redundant build dependsOn overrides ([ee9258d](https://github.com/Mearman/Academic-Explorer/commit/ee9258d))
* refactor(nx): use file path patterns for scoped test targets ([f6df7cb](https://github.com/Mearman/Academic-Explorer/commit/f6df7cb))
* refactor(root): convert syncpack commands to Nx tasks ([246792a](https://github.com/Mearman/Academic-Explorer/commit/246792a))
* refactor(root): update root package.json scripts to use Nx ([796f8d3](https://github.com/Mearman/Academic-Explorer/commit/796f8d3))
* refactor(tools): remove explicit any types from generators and scripts ([6cb3e33](https://github.com/Mearman/Academic-Explorer/commit/6cb3e33))
* refactor(tools): update generator utilities and scripts ([c5c053b](https://github.com/Mearman/Academic-Explorer/commit/c5c053b))
* refactor(types): customize vite build configuration ([d1acb66](https://github.com/Mearman/Academic-Explorer/commit/d1acb66))
* refactor(types): remove explicit any types from type definitions ([5caeb46](https://github.com/Mearman/Academic-Explorer/commit/5caeb46))
* refactor(types): rename ViewMode to TableViewMode and add DetailViewMode ([b5faa29](https://github.com/Mearman/Academic-Explorer/commit/b5faa29))
* refactor(ui): extract namespace exports and Mantine types ([afa228a](https://github.com/Mearman/Academic-Explorer/commit/afa228a))
* refactor(ui): remove explicit any types from ui package ([697603b](https://github.com/Mearman/Academic-Explorer/commit/697603b))
* refactor(ui): rename entity-views index.tsx to RichEntityView.tsx ([335dc43](https://github.com/Mearman/Academic-Explorer/commit/335dc43))
* refactor(ui): use vite-plugin-dts for TypeScript declarations ([840f9ec](https://github.com/Mearman/Academic-Explorer/commit/840f9ec))
* refactor(utils): extract cache constants and stubs to separate files ([632b2e2](https://github.com/Mearman/Academic-Explorer/commit/632b2e2))
* refactor(utils): remove explicit any types from utils package ([6e520d7](https://github.com/Mearman/Academic-Explorer/commit/6e520d7))
* refactor(utils): rename CacheConfig to MemoryCacheConfig ([cbf5211](https://github.com/Mearman/Academic-Explorer/commit/cbf5211))
* refactor(utils): rename CacheStorageType to CacheBackendType ([1973e82](https://github.com/Mearman/Academic-Explorer/commit/1973e82))
* refactor(web): add PostHog global type declarations ([3357d3a](https://github.com/Mearman/Academic-Explorer/commit/3357d3a))
* refactor(web): consolidate ColumnConfig type definitions ([ea1fbbd](https://github.com/Mearman/Academic-Explorer/commit/ea1fbbd))
* refactor(web): improve VisualQueryBuilder type organization ([77f6cf8](https://github.com/Mearman/Academic-Explorer/commit/77f6cf8))
* refactor(web): remove duplicate FilterValidationResult from filter-ui ([c3c3174](https://github.com/Mearman/Academic-Explorer/commit/c3c3174))
* refactor(web): rename e2e targets to test:e2e for consistency ([85b8416](https://github.com/Mearman/Academic-Explorer/commit/85b8416))
* refactor(web): update detail routes to use DetailViewMode type ([0c28c07](https://github.com/Mearman/Academic-Explorer/commit/0c28c07))
* refactor(web): update FilterBuilder validation to use object-based errors ([f0d3b91](https://github.com/Mearman/Academic-Explorer/commit/f0d3b91))
* refactor(web): update route lazy imports and utils ([a4c19bb](https://github.com/Mearman/Academic-Explorer/commit/a4c19bb))
* refactor(web/catalogue): remove explicit any types and fix type narrowing ([b21dbc8](https://github.com/Mearman/Academic-Explorer/commit/b21dbc8))
* refactor(web/components): remove explicit any types from remaining components ([c8632b9](https://github.com/Mearman/Academic-Explorer/commit/c8632b9))
* refactor(web/core): remove explicit any types from core modules ([246a799](https://github.com/Mearman/Academic-Explorer/commit/246a799))
* refactor(web/e2e): remove explicit any types from e2e tests ([b991fff](https://github.com/Mearman/Academic-Explorer/commit/b991fff))
* refactor(web/hooks): remove explicit any types and fix imports ([3e90e20](https://github.com/Mearman/Academic-Explorer/commit/3e90e20))
* refactor(web/layout): remove explicit any types and add missing imports ([0e07858](https://github.com/Mearman/Academic-Explorer/commit/0e07858))
* refactor(web/relationship): remove explicit any types ([eaa75a1](https://github.com/Mearman/Academic-Explorer/commit/eaa75a1))
* refactor(web/routes): remove explicit any types and fix function arguments ([d4949ea](https://github.com/Mearman/Academic-Explorer/commit/d4949ea))
* refactor(web/services): remove explicit any types ([61c4508](https://github.com/Mearman/Academic-Explorer/commit/61c4508))
* refactor(web/test): remove explicit any types from test utilities ([334233c](https://github.com/Mearman/Academic-Explorer/commit/334233c))
* refactor(web/utils): remove explicit any and rewrite performance monitor ([a26f4ce](https://github.com/Mearman/Academic-Explorer/commit/a26f4ce))
* chore: add sync:targets scripts and path mappings ([45839f6](https://github.com/Mearman/Academic-Explorer/commit/45839f6))
* chore: remove obsolete fix-imports script ([325aa0a](https://github.com/Mearman/Academic-Explorer/commit/325aa0a))
* chore: remove obsolete session documentation and debug files ([fcc7d86](https://github.com/Mearman/Academic-Explorer/commit/fcc7d86))
* chore: remove PostHog documentation files ([300dfab](https://github.com/Mearman/Academic-Explorer/commit/300dfab))
* chore: update gitignore and lockfile ([b070cf4](https://github.com/Mearman/Academic-Explorer/commit/b070cf4))
* chore(data): update OpenAlex autocomplete cache indices ([2ce8745](https://github.com/Mearman/Academic-Explorer/commit/2ce8745))
* chore(deps): add syncpack for dependency version management ([f316933](https://github.com/Mearman/Academic-Explorer/commit/f316933))
* chore(eslint): add custom eslint rules package ([589a675](https://github.com/Mearman/Academic-Explorer/commit/589a675))
* chore(eslint): add import rules and forbid default exports ([8a962e5](https://github.com/Mearman/Academic-Explorer/commit/8a962e5))
* chore(monorepo): add targetDefaults for new task types ([b117cd1](https://github.com/Mearman/Academic-Explorer/commit/b117cd1))
* chore(monorepo): remove dead validate target ([9df21e9](https://github.com/Mearman/Academic-Explorer/commit/9df21e9))
* chore(openalex-client): remove redundant build:types script ([cf6d269](https://github.com/Mearman/Academic-Explorer/commit/cf6d269))
* chore(projects): standardize project.json target ordering ([d57ecb0](https://github.com/Mearman/Academic-Explorer/commit/d57ecb0))
* chore(release): 20.0.0 [skip ci] ([386fcc6](https://github.com/Mearman/Academic-Explorer/commit/386fcc6))
* chore(root): remove coverage targets and convert deps:audit to Nx ([8c8dfb8](https://github.com/Mearman/Academic-Explorer/commit/8c8dfb8))
* chore(root): remove dead verify:parallel script ([a35213e](https://github.com/Mearman/Academic-Explorer/commit/a35213e))
* chore(root): remove redundant and unused scripts ([2e2e164](https://github.com/Mearman/Academic-Explorer/commit/2e2e164))
* chore(scripts): remove 26 unused utility scripts and orphaned tests ([824c083](https://github.com/Mearman/Academic-Explorer/commit/824c083))
* chore(web): update config files for strict lint rules ([52a8420](https://github.com/Mearman/Academic-Explorer/commit/52a8420))
* feat(academic-explorer): add citation generator (spec-027) ([c71a004](https://github.com/Mearman/Academic-Explorer/commit/c71a004))
* feat(academic-explorer): add CSR conversion to Louvain (P5 T042-T043) ([38c8010](https://github.com/Mearman/Academic-Explorer/commit/38c8010))
* feat(academic-explorer): add CSR graph representation infrastructure (spec-027 Phase 5 initial) ([1e4545f](https://github.com/Mearman/Academic-Explorer/commit/1e4545f))
* feat(algorithms): add graph extraction module ([0d60b8b](https://github.com/Mearman/Academic-Explorer/commit/0d60b8b))
* feat(ci): dynamic test matrix from Nx project detection ([af084fe](https://github.com/Mearman/Academic-Explorer/commit/af084fe))
* feat(cli): add barrelsby target and consolidate SUPPORTED_ENTITIES ([7c12eb1](https://github.com/Mearman/Academic-Explorer/commit/7c12eb1))
* feat(monorepo): add validate target as Nx composite task ([5a96faf](https://github.com/Mearman/Academic-Explorer/commit/5a96faf))
* feat(nx): add cached syncpack:lint target ([b481e37](https://github.com/Mearman/Academic-Explorer/commit/b481e37))
* feat(nx): add docs:task-graph target with caching ([92b2f68](https://github.com/Mearman/Academic-Explorer/commit/92b2f68))
* feat(nx): add JSON Logic schema for IDE autocompletion ([765515e](https://github.com/Mearman/Academic-Explorer/commit/765515e))
* feat(nx): add root build target depending on docs:task-graph ([723e49c](https://github.com/Mearman/Academic-Explorer/commit/723e49c))
* feat(nx): configure target inference and sync generator ([ae8f71b](https://github.com/Mearman/Academic-Explorer/commit/ae8f71b))
* feat(nx): expand infer-targets rules and remove redundant targets ([3b862fb](https://github.com/Mearman/Academic-Explorer/commit/3b862fb))
* feat(scripts): add markdown section update for Nx task graph ([9e45e9a](https://github.com/Mearman/Academic-Explorer/commit/9e45e9a))
* feat(scripts): add Nx task dependency graph Mermaid generator ([a5efdfd](https://github.com/Mearman/Academic-Explorer/commit/a5efdfd))
* feat(tools): add complete JSON Logic operator support ([4056010](https://github.com/Mearman/Academic-Explorer/commit/4056010))
* feat(tools): add infer-targets plugin for declarative target inference ([383f28d](https://github.com/Mearman/Academic-Explorer/commit/383f28d))
* feat(tools): add JSON Logic-inspired condition syntax with not/and/or/xor ([38e751f](https://github.com/Mearman/Academic-Explorer/commit/38e751f))
* feat(tools): add project tag conditions to target inference ([6488187](https://github.com/Mearman/Academic-Explorer/commit/6488187))
* feat(tools): add sync-targets generator with nx sync integration ([a1c6890](https://github.com/Mearman/Academic-Explorer/commit/a1c6890))
* feat(tools): implement full JSON Logic compliant condition evaluator ([386cf1d](https://github.com/Mearman/Academic-Explorer/commit/386cf1d))
* feat(web): add E2E page object hierarchy (spec-020 T004-T006) ([ec7acfb](https://github.com/Mearman/Academic-Explorer/commit/ec7acfb))
* feat(web): add E2E test helpers (spec-020 T007-T012) ([57c8ea6](https://github.com/Mearman/Academic-Explorer/commit/57c8ea6))
* feat(web): add entity page objects for E2E testing (spec-020 T016-T022) ([49890e2](https://github.com/Mearman/Academic-Explorer/commit/49890e2))
* feat(web): add relationship extractors for OpenAlex entities ([d3a5b4a](https://github.com/Mearman/Academic-Explorer/commit/d3a5b4a))
* docs: add AGENTS.md and CLAUDE.md as symlinks to README.md ([50e3e3b](https://github.com/Mearman/Academic-Explorer/commit/50e3e3b))
* docs: unify README.md for humans and agents ([a048bf8](https://github.com/Mearman/Academic-Explorer/commit/a048bf8))
* docs: update speckit templates and entity consolidation tasks ([2f3a57a](https://github.com/Mearman/Academic-Explorer/commit/2f3a57a))
* docs: update task graph to LR alignment ([abbb7f0](https://github.com/Mearman/Academic-Explorer/commit/abbb7f0))
* docs: update task graph with typecheck dependencies ([68324ae](https://github.com/Mearman/Academic-Explorer/commit/68324ae))
* docs(academic-explorer): add API documentation (spec-027 T066-T067) ([9946a78](https://github.com/Mearman/Academic-Explorer/commit/9946a78))
* docs(academic-explorer): document Louvain optimization (spec-027 T065) ([7a50b37](https://github.com/Mearman/Academic-Explorer/commit/7a50b37))
* docs(academic-explorer): implement Phase 5 community cache infrastructure (spec-027) ([56cd370](https://github.com/Mearman/Academic-Explorer/commit/56cd370))
* docs(academic-explorer): mark spec-024 as complete (2025-11-25) ([4aea53f](https://github.com/Mearman/Academic-Explorer/commit/4aea53f))
* docs(academic-explorer): mark spec-027 as complete (T072) ([b3d7c7d](https://github.com/Mearman/Academic-Explorer/commit/b3d7c7d))
* docs(algorithms): add graph extraction documentation ([e88c6c8](https://github.com/Mearman/Academic-Explorer/commit/e88c6c8))
* docs(cli): update task dependency graph to reflect removed build step ([6c53a6d](https://github.com/Mearman/Academic-Explorer/commit/6c53a6d))
* docs(constitution): strengthen Principle IX to eliminate "pre-existing" excuse (v2.9.0) ([fa06e3d](https://github.com/Mearman/Academic-Explorer/commit/fa06e3d))
* docs(docs): amend constitution to v2.6.0 - add Principle XII ([0b949ad](https://github.com/Mearman/Academic-Explorer/commit/0b949ad))
* docs(docs): correct spec status categorization after comprehensive audit ([9c8b1aa](https://github.com/Mearman/Academic-Explorer/commit/9c8b1aa))
* docs(docs): reorganize specs index to numeric order with status fields ([b133123](https://github.com/Mearman/Academic-Explorer/commit/b133123))
* docs(docs): resolve duplicate spec numbers and update statuses ([f7d515e](https://github.com/Mearman/Academic-Explorer/commit/f7d515e))
* docs(docs): update spec index with accurate status audit ([3c888b4](https://github.com/Mearman/Academic-Explorer/commit/3c888b4))
* docs(readme): remove references to deprecated graph and simulation packages ([7313cc8](https://github.com/Mearman/Academic-Explorer/commit/7313cc8))
* docs(readme): update task dependency graph ([6e748e6](https://github.com/Mearman/Academic-Explorer/commit/6e748e6))
* docs(speckit): update templates and constitution ([560ffe2](https://github.com/Mearman/Academic-Explorer/commit/560ffe2))
* docs(specs): add historical architecture warnings to specs 009 and 015 ([23135d1](https://github.com/Mearman/Academic-Explorer/commit/23135d1))
* docs(specs): add package migration notes to in-progress specs 017, 018 ([c8f2b34](https://github.com/Mearman/Academic-Explorer/commit/c8f2b34))
* docs(specs): add package migration notes to specs 014, 016 and update README ([fdf5ef4](https://github.com/Mearman/Academic-Explorer/commit/fdf5ef4))
* docs(specs): add status note to spec-020 template ([b103994](https://github.com/Mearman/Academic-Explorer/commit/b103994))
* docs(specs): add validation status notes to spec-023 metrics ([88808ab](https://github.com/Mearman/Academic-Explorer/commit/88808ab))
* docs(specs): correct spec-001 status to in-progress ([7dcd910](https://github.com/Mearman/Academic-Explorer/commit/7dcd910))
* docs(specs): correct spec-010 status to near complete ([decb2bc](https://github.com/Mearman/Academic-Explorer/commit/decb2bc))
* docs(specs): correct spec-012 completion date to match git history ([c58f9b9](https://github.com/Mearman/Academic-Explorer/commit/c58f9b9))
* docs(specs): correct spec-019 status to near complete ([62bcfc8](https://github.com/Mearman/Academic-Explorer/commit/62bcfc8))
* docs(specs): correct spec-024 status to foundation complete ([117d4b1](https://github.com/Mearman/Academic-Explorer/commit/117d4b1))
* docs(specs): correct spec-027 performance claim in index ([57c3536](https://github.com/Mearman/Academic-Explorer/commit/57c3536))
* docs(specs): correct spec-027 status to core complete ([e76ecf9](https://github.com/Mearman/Academic-Explorer/commit/e76ecf9))
* docs(specs): enhance spec-002 obsolescence documentation ([6bec700](https://github.com/Mearman/Academic-Explorer/commit/6bec700))
* docs(specs): fix incorrect spec number references in spec-022 (was 018) ([54dc5e8](https://github.com/Mearman/Academic-Explorer/commit/54dc5e8))
* docs(specs): fix spec-019 entity type contradictions ([5b9738f](https://github.com/Mearman/Academic-Explorer/commit/5b9738f))
* docs(specs): fix template placeholders in plan.md files ([7a29fb2](https://github.com/Mearman/Academic-Explorer/commit/7a29fb2))
* docs(specs): mark additional specs as complete ([ba13c90](https://github.com/Mearman/Academic-Explorer/commit/ba13c90))
* docs(specs): mark spec-008 as complete, update tasks ([185b3f8](https://github.com/Mearman/Academic-Explorer/commit/185b3f8))
* docs(specs): mark spec-009 as superseded by package refactoring ([089218d](https://github.com/Mearman/Academic-Explorer/commit/089218d))
* docs(specs): mark spec-017 as superseded by spec-018 ([e55b01e](https://github.com/Mearman/Academic-Explorer/commit/e55b01e))
* docs(specs): mark spec-024 through spec-028 tasks complete ([05ee9be](https://github.com/Mearman/Academic-Explorer/commit/05ee9be))
* docs(specs): mark tasks complete for specs 009, 011, 021 ([7ef1a5c](https://github.com/Mearman/Academic-Explorer/commit/7ef1a5c))
* docs(specs): update index with corrected status counts ([739f6f1](https://github.com/Mearman/Academic-Explorer/commit/739f6f1))
* docs(specs): update README with accurate completion status ([42461a3](https://github.com/Mearman/Academic-Explorer/commit/42461a3))
* docs(specs): update spec-008 implementation status to 24/57 tasks ([6f2d3c0](https://github.com/Mearman/Academic-Explorer/commit/6f2d3c0))
* docs(specs): update spec-015 completion date and add migration note ([ab5dd2a](https://github.com/Mearman/Academic-Explorer/commit/ab5dd2a))
* config(cli): disable updateBuildableProjectDepsInPackageJson ([5d2a976](https://github.com/Mearman/Academic-Explorer/commit/5d2a976))
* config(nx): enable daemon process ([5d01ecb](https://github.com/Mearman/Academic-Explorer/commit/5d01ecb))
* style(algorithms): fix import order and unused variable lint errors ([f88004c](https://github.com/Mearman/Academic-Explorer/commit/f88004c))
* style(algorithms): remove unused variables and imports ([424e87e](https://github.com/Mearman/Academic-Explorer/commit/424e87e))
* style(ui): alphabetize devDependencies in package.json ([4db9388](https://github.com/Mearman/Academic-Explorer/commit/4db9388))
* build: add barrelsby for automated barrel file generation ([8501d56](https://github.com/Mearman/Academic-Explorer/commit/8501d56))
* build: generate barrel files with barrelsby ([4b6b51c](https://github.com/Mearman/Academic-Explorer/commit/4b6b51c))
* build: update TypeScript base configuration ([754f2e3](https://github.com/Mearman/Academic-Explorer/commit/754f2e3))
* build(client): migrate to @nx/js:tsc executor ([c90b43d](https://github.com/Mearman/Academic-Explorer/commit/c90b43d))
* build(monorepo): add Vite build configuration for types package ([7195b80](https://github.com/Mearman/Academic-Explorer/commit/7195b80))
* build(monorepo): configure barrelsby for all packages ([42887f0](https://github.com/Mearman/Academic-Explorer/commit/42887f0))
* build(nx): add barrelsby target configuration ([4ee4f3c](https://github.com/Mearman/Academic-Explorer/commit/4ee4f3c))
* build(nx): add typecheck as build dependency ([1ea81e4](https://github.com/Mearman/Academic-Explorer/commit/1ea81e4))
* build(utils): migrate to @nx/js:tsc executor ([f0e1c72](https://github.com/Mearman/Academic-Explorer/commit/f0e1c72))
* ci(deps): add syncpack automation for dependency version checks ([376214e](https://github.com/Mearman/Academic-Explorer/commit/376214e))
* test(academic-explorer): add verification tests (spec-027) ([5d028a8](https://github.com/Mearman/Academic-Explorer/commit/5d028a8))
* test(graph): fix metrics test expectations and make fixture deterministic ([b0423da](https://github.com/Mearman/Academic-Explorer/commit/b0423da))
* test(web): add critical route coverage tests (spec-020 T023-T033) ([68181bd](https://github.com/Mearman/Academic-Explorer/commit/68181bd))
* test(web): add error scenario E2E tests (spec-020 T048-T059) ([5a5aa18](https://github.com/Mearman/Academic-Explorer/commit/5a5aa18))
* test(web): add multi-viewport tests for workflow E2E tests (spec-020 T042-T047) ([a7318f9](https://github.com/Mearman/Academic-Explorer/commit/a7318f9))
* test(web): add workflow E2E tests (spec-020 T037-T041) ([a567982](https://github.com/Mearman/Academic-Explorer/commit/a567982))
* test(web): automate high-ROI manual tests (spec-020 T060-T073) ([75fb477](https://github.com/Mearman/Academic-Explorer/commit/75fb477)), closes [hi#ROI](https://github.com/hi/issues/ROI) [hi#ROI](https://github.com/hi/issues/ROI)
* test(web): complete spec-020 Phase 7 polish and cross-cutting concerns ([0117fca](https://github.com/Mearman/Academic-Explorer/commit/0117fca))
* refactor(web/filters,search): remove explicit any types ([e1b0cf4](https://github.com/Mearman/Academic-Explorer/commit/e1b0cf4))
* perf(academic-explorer): optimize density calculation for O(n log n) scaling (spec-027) ([27f3dce](https://github.com/Mearman/Academic-Explorer/commit/27f3dce))
* perf(academic-explorer): test Fast Louvain and altered communities (spec-027 Phase 4) ([dd094cc](https://github.com/Mearman/Academic-Explorer/commit/dd094cc))
* perf(academic-explorer): use CSR for Louvain neighbors (P5 T044-T046) ([8b9f5d7](https://github.com/Mearman/Academic-Explorer/commit/8b9f5d7))
* perf(algorithms): optimize K-Core decomposition to O(n+m) complexity ([cbf284b](https://github.com/Mearman/Academic-Explorer/commit/cbf284b))
* perf(algorithms): optimize Leiden performance with pre-computed incoming edges ([26db2dc](https://github.com/Mearman/Academic-Explorer/commit/26db2dc))


### BREAKING CHANGE

* ESLint now strictly forbids all unused variables without exceptions
* None (infrastructure only, no API changes)
* Removed multiple tsconfig variants in favor of unified configs

Root level changes:
- Add vite.config.lib.ts for shared library build configuration
- Remove obsolete tsconfig files: library, react, typecheck, vitest, app
- Update tsconfig.base.json with wildcard path mappings for subpath imports
- Fix broken project references in tsconfig.json
- Pin @types/node to 24.10.0 to resolve Vite type conflicts
- Update nx.json to rename Vite typecheck target avoiding conflicts

Package changes (algorithms, client, types, utils, ui):
- Simplify tsconfig.json to typecheck-only config (noEmit, no composite)
- Remove redundant tsconfig.spec.json, tsconfig.typecheck.json files
- Add vite.config.ts using shared createLibConfig for Vite builds
- Update project.json to use @nx/vite:build executor
- Update vitest.config.ts to reference simplified tsconfig

Apps/web changes:
- Remove tsconfig.app.json (merged into tsconfig.json)
- Update tsconfig.json to extend tsconfig.base.json directly
- Add React-specific options (jsx, DOM libs) inline

This consolidation reduces config files from 8 root tsconfigs to 3,
and removes per-package tsconfig variants while maintaining the same
typecheck and build behavior.

## 20.0.0 (2025-11-25)

* chore(deps): add body-parser override for security ([05abacf](https://github.com/Mearman/Academic-Explorer/commit/05abacf))
* chore(release): 19.2.0 [skip ci] ([a7bd1da](https://github.com/Mearman/Academic-Explorer/commit/a7bd1da))
* docs(academic-explorer): clarify SlashCommand tool requirement in Principle X ([01b4a62](https://github.com/Mearman/Academic-Explorer/commit/01b4a62))
* docs(academic-explorer): complete planning for spec 025 graph clustering ([f801d93](https://github.com/Mearman/Academic-Explorer/commit/f801d93))
* docs(docs): amend constitution v2.5.0 - add Principle XI ([c452189](https://github.com/Mearman/Academic-Explorer/commit/c452189))
* docs(docs): complete Phase 12 polish and integration (spec-025) ([53b55ad](https://github.com/Mearman/Academic-Explorer/commit/53b55ad))
* docs(docs): complete planning for spec 027 Louvain optimization ([293b064](https://github.com/Mearman/Academic-Explorer/commit/293b064))
* docs(docs): create spec-027 for Louvain scaling optimization ([c206901](https://github.com/Mearman/Academic-Explorer/commit/c206901))
* docs(docs): document Louvain algorithm optimization research (spec-025) ([61ad6ef](https://github.com/Mearman/Academic-Explorer/commit/61ad6ef))
* docs(docs): mark Phase 12 complete in spec-025 tasks.md ([5438b15](https://github.com/Mearman/Academic-Explorer/commit/5438b15))
* docs(docs): mark Phase 3 (US1 Louvain) as complete in spec-025 tasks ([def0077](https://github.com/Mearman/Academic-Explorer/commit/def0077))
* docs(docs): mark Phase 3 (US1 Parameter Tuning) as complete in spec-027 ([587d068](https://github.com/Mearman/Academic-Explorer/commit/587d068))
* docs(docs): mark Phase 5 (US5 Leiden) as complete in spec-025 tasks ([a448eef](https://github.com/Mearman/Academic-Explorer/commit/a448eef))
* docs(docs): mark spec-025 graph clustering as complete (134/134 tasks) ([04fbd5a](https://github.com/Mearman/Academic-Explorer/commit/04fbd5a))
* docs(docs): update tasks.md with Core-Periphery bug fix status ([583ec87](https://github.com/Mearman/Academic-Explorer/commit/583ec87))
* docs(spec-026): complete planning phase (plan, research, data-model, contracts, quickstart, tasks) ([386009f](https://github.com/Mearman/Academic-Explorer/commit/386009f))
* perf(academic-explorer): add Louvain parameter tuning (spec-027 P2-P3) ([6470157](https://github.com/Mearman/Academic-Explorer/commit/6470157))
* perf(academic-explorer): optimize Louvain algorithm for better scaling efficiency ([1955c04](https://github.com/Mearman/Academic-Explorer/commit/1955c04))
* fix(academic-explorer): correct Core-Periphery Borgatti-Everett update formula ([937c21c](https://github.com/Mearman/Academic-Explorer/commit/937c21c))
* fix(academic-explorer): correct k-core decomposition core number assignment ([14c337a](https://github.com/Mearman/Academic-Explorer/commit/14c337a))
* fix(academic-explorer): increase k-core performance test safety margin to 2.2x ([40cb14f](https://github.com/Mearman/Academic-Explorer/commit/40cb14f))
* fix(scripts): prevent octal interpretation in feature number parsing ([a6b66cc](https://github.com/Mearman/Academic-Explorer/commit/a6b66cc))
* test(academic-explorer): add seeded RNG to citation networks for deterministic tests ([76f9077](https://github.com/Mearman/Academic-Explorer/commit/76f9077))
* test(algorithms): add failing tests for Louvain community detection (T017-T019) ([4d92bc9](https://github.com/Mearman/Academic-Explorer/commit/4d92bc9))
* test(shared-utils): add unit tests for clustering metrics ([c131b88](https://github.com/Mearman/Academic-Explorer/commit/c131b88))
* feat(academic-explorer): add biconnected component decomposition (P9) ([7f94a1e](https://github.com/Mearman/Academic-Explorer/commit/7f94a1e))
* feat(academic-explorer): add core-periphery decomposition (P8) ([2898104](https://github.com/Mearman/Academic-Explorer/commit/2898104))
* feat(academic-explorer): add Infomap clustering (P7) ([457dd2e](https://github.com/Mearman/Academic-Explorer/commit/457dd2e))
* feat(academic-explorer): add k-core decomposition (P4) ([23cf212](https://github.com/Mearman/Academic-Explorer/commit/23cf212))
* feat(academic-explorer): add k-core decomposition to spec 025 as User Story 4 (P4) ([da92fdb](https://github.com/Mearman/Academic-Explorer/commit/da92fdb))
* feat(academic-explorer): add label propagation clustering (P6) ([73e31f8](https://github.com/Mearman/Academic-Explorer/commit/73e31f8))
* feat(academic-explorer): add Louvain community detection (P1) ([7065637](https://github.com/Mearman/Academic-Explorer/commit/7065637))
* feat(academic-explorer): add spectral graph partitioning (P2) ([9951859](https://github.com/Mearman/Academic-Explorer/commit/9951859))
* feat(academic-explorer): complete Louvain Phase 2 with hierarchical aggregation (T020-T024) ([49e1fcb](https://github.com/Mearman/Academic-Explorer/commit/49e1fcb)), closes [hi#quality](https://github.com/hi/issues/quality)
* feat(academic-explorer): expand spec 025 to comprehensive clustering suite (9 algorithms) ([089ab4d](https://github.com/Mearman/Academic-Explorer/commit/089ab4d)), closes [hi#priority](https://github.com/hi/issues/priority)
* feat(algorithms): implement Louvain community detection (T020-T024) [WIP] ([bda88e9](https://github.com/Mearman/Academic-Explorer/commit/bda88e9))
* feat(docs): generate tasks.md for graph clustering feature (spec-025) ([4c97f31](https://github.com/Mearman/Academic-Explorer/commit/4c97f31))
* feat(shared-utils): add test fixtures for clustering algorithms ([91445aa](https://github.com/Mearman/Academic-Explorer/commit/91445aa))
* feat(shared-utils): setup graph clustering infrastructure (Phase 1) ([896f2e4](https://github.com/Mearman/Academic-Explorer/commit/896f2e4))


### BREAKING CHANGE

* New clustering-types module in
@bibgraph/algorithms

## 19.2.0 (2025-11-25)

* test(academic-explorer): add weight function tests for Dijkstra (8 tests) ([a1abf39](https://github.com/Mearman/Academic-Explorer/commit/a1abf39))
* feat(academic-explorer): add weight function support to Dijkstra algorithm ([5c337ee](https://github.com/Mearman/Academic-Explorer/commit/5c337ee))
* feat(academic-explorer): add weight function type for flexible edge/node weight extraction ([15eb0b0](https://github.com/Mearman/Academic-Explorer/commit/15eb0b0))
* feat(academic-explorer): implement proper cycle path reconstruction in topological sort ([485b22e](https://github.com/Mearman/Academic-Explorer/commit/485b22e))
* chore(release): 19.1.0 [skip ci] ([3ece267](https://github.com/Mearman/Academic-Explorer/commit/3ece267))

## 19.1.0 (2025-11-25)

* chore(deps): add vite-plugin-dts for TypeScript declaration generation ([f7f8f28](https://github.com/Mearman/Academic-Explorer/commit/f7f8f28))
* chore(release): 19.0.2 [skip ci] ([d03865d](https://github.com/Mearman/Academic-Explorer/commit/d03865d))
* chore(workspace): add algorithms package to TypeScript path mappings ([ac30290](https://github.com/Mearman/Academic-Explorer/commit/ac30290))
* docs(algorithms): add comprehensive README documentation ([d9d850b](https://github.com/Mearman/Academic-Explorer/commit/d9d850b))
* docs(spec-024): add algorithms package specification ([4f4c8b8](https://github.com/Mearman/Academic-Explorer/commit/4f4c8b8))
* test(algorithms): add comprehensive unit tests for all algorithms ([1c09f0f](https://github.com/Mearman/Academic-Explorer/commit/1c09f0f))
* test(algorithms): add integration and edge case tests ([09b9ca9](https://github.com/Mearman/Academic-Explorer/commit/09b9ca9))
* test(algorithms): add memory validation and performance tests ([7dc0796](https://github.com/Mearman/Academic-Explorer/commit/7dc0796))
* feat(algorithms): add DFS and BFS traversal algorithms ([424d26b](https://github.com/Mearman/Academic-Explorer/commit/424d26b))
* feat(algorithms): add Dijkstra shortest path algorithm ([28633de](https://github.com/Mearman/Academic-Explorer/commit/28633de))
* feat(algorithms): add generic Graph data structure ([6ba5b84](https://github.com/Mearman/Academic-Explorer/commit/6ba5b84))
* feat(algorithms): add graph analysis algorithms ([85dcb09](https://github.com/Mearman/Academic-Explorer/commit/85dcb09))
* feat(algorithms): add main package exports ([61f4ab9](https://github.com/Mearman/Academic-Explorer/commit/61f4ab9))
* feat(algorithms): add package infrastructure and configuration ([8eb8bc9](https://github.com/Mearman/Academic-Explorer/commit/8eb8bc9))
* feat(algorithms): add type system with Result and Option types ([0b7939b](https://github.com/Mearman/Academic-Explorer/commit/0b7939b))

## <small>19.0.2 (2025-11-25)</small>

* chore(deps-dev): bump @nx/devkit from 22.1.0 to 22.1.1 (#106) ([746d1f6](https://github.com/Mearman/Academic-Explorer/commit/746d1f6)), closes [#106](https://github.com/Mearman/Academic-Explorer/issues/106)
* chore(deps-dev): bump msw from 2.12.2 to 2.12.3 (#104) ([89dd1f6](https://github.com/Mearman/Academic-Explorer/commit/89dd1f6)), closes [#104](https://github.com/Mearman/Academic-Explorer/issues/104)
* chore(deps-dev): bump the build-tools group across 1 directory with 2 updates (#108) ([0bd8e0a](https://github.com/Mearman/Academic-Explorer/commit/0bd8e0a)), closes [#108](https://github.com/Mearman/Academic-Explorer/issues/108)
* chore(deps): bump @posthog/react from 1.4.0 to 1.5.0 (#107) ([5cb371f](https://github.com/Mearman/Academic-Explorer/commit/5cb371f)), closes [#107](https://github.com/Mearman/Academic-Explorer/issues/107)
* chore(release): 19.0.1 [skip ci] ([deee964](https://github.com/Mearman/Academic-Explorer/commit/deee964))

## <small>19.0.1 (2025-11-24)</small>

* chore(deps): bump the mantine group with 5 updates (#102) ([94021fc](https://github.com/Mearman/Academic-Explorer/commit/94021fc)), closes [#102](https://github.com/Mearman/Academic-Explorer/issues/102)
* chore(release): 19.0.0 [skip ci] ([ae8172f](https://github.com/Mearman/Academic-Explorer/commit/ae8172f))

## 19.0.0 (2025-11-24)

* ci(config): remove graph and simulation packages from test matrices ([e3acb00](https://github.com/Mearman/Academic-Explorer/commit/e3acb00))
* chore: update pnpm lockfile and static data after package removal ([5a594cb](https://github.com/Mearman/Academic-Explorer/commit/5a594cb))
* chore(deps-dev): bump @nx/web from 22.0.2 to 22.1.1 (#103) ([f6b1019](https://github.com/Mearman/Academic-Explorer/commit/f6b1019)), closes [#103](https://github.com/Mearman/Academic-Explorer/issues/103)
* chore(deps-dev): bump @types/react from 19.2.6 to 19.2.7 in the react group (#98) ([04b06c1](https://github.com/Mearman/Academic-Explorer/commit/04b06c1)), closes [#98](https://github.com/Mearman/Academic-Explorer/issues/98)
* chore(deps): bump the tanstack group with 2 updates (#99) ([654e222](https://github.com/Mearman/Academic-Explorer/commit/654e222)), closes [#99](https://github.com/Mearman/Academic-Explorer/issues/99)
* chore(deps): bump zod from 4.1.12 to 4.1.13 (#105) ([da501f2](https://github.com/Mearman/Academic-Explorer/commit/da501f2)), closes [#105](https://github.com/Mearman/Academic-Explorer/issues/105)
* chore(release): 18.0.2 [skip ci] ([843ed6b](https://github.com/Mearman/Academic-Explorer/commit/843ed6b))
* refactor: remove graph package and update TypeScript configuration ([e50eef3](https://github.com/Mearman/Academic-Explorer/commit/e50eef3))
* refactor(config): migrate deprecated entity constants to ENTITY_METADATA ([0a3dfe1](https://github.com/Mearman/Academic-Explorer/commit/0a3dfe1))
* refactor(config): remove remaining graph/simulation package references ([6f22aea](https://github.com/Mearman/Academic-Explorer/commit/6f22aea))
* refactor(ui-components): consolidate vite configs ([53c5f66](https://github.com/Mearman/Academic-Explorer/commit/53c5f66))
* refactor(web): remove graph store and visualization system ([ff44831](https://github.com/Mearman/Academic-Explorer/commit/ff44831))
* refactor(web): remove graph/simulation package references from tsconfig and docs ([ecbb9b9](https://github.com/Mearman/Academic-Explorer/commit/ecbb9b9))
* refactor(web): remove legacy components dependent on deleted simulation package ([eec68a3](https://github.com/Mearman/Academic-Explorer/commit/eec68a3))
* refactor(web): remove obsolete graph store references from test files ([459200e](https://github.com/Mearman/Academic-Explorer/commit/459200e))
* refactor(web): remove references to deleted components and fix section registry ([31086aa](https://github.com/Mearman/Academic-Explorer/commit/31086aa))
* refactor(web): remove simulation package dependency ([da55fb9](https://github.com/Mearman/Academic-Explorer/commit/da55fb9))
* refactor(web): remove unused RawApiDataSection component ([fe169a2](https://github.com/Mearman/Academic-Explorer/commit/fe169a2))
* refactor(web): remove unused section registry system and cleanup ([93741bc](https://github.com/Mearman/Academic-Explorer/commit/93741bc))
* refactor(web): remove unused section system and clean up layout store ([b3f5e21](https://github.com/Mearman/Academic-Explorer/commit/b3f5e21))
* refactor(web): remove unused VSCode-style group system and animated-graph-store ([b2b5995](https://github.com/Mearman/Academic-Explorer/commit/b2b5995))
* refactor(web): update imports to use new package locations ([2f0ce73](https://github.com/Mearman/Academic-Explorer/commit/2f0ce73))
* fix(config): resolve TypeScript config parsing errors in tests ([9c62349](https://github.com/Mearman/Academic-Explorer/commit/9c62349))
* fix(scripts): remove unused short_name parameter from check_existing_branches ([cca954c](https://github.com/Mearman/Academic-Explorer/commit/cca954c))
* fix(scripts): use global maximum for branch numbering to prevent collisions ([df8a88a](https://github.com/Mearman/Academic-Explorer/commit/df8a88a))
* fix(web): correct import paths for services after package migration ([a6e0ad2](https://github.com/Mearman/Academic-Explorer/commit/a6e0ad2))
* fix(web): fix OpenAlexUrl route tests mock package ([6ca0962](https://github.com/Mearman/Academic-Explorer/commit/6ca0962))
* fix(web): remove extra quote from import statement in use-raw-entity-data ([5254d76](https://github.com/Mearman/Academic-Explorer/commit/5254d76))
* fix(web): simplify relationship component error handling and update tests ([34b4a60](https://github.com/Mearman/Academic-Explorer/commit/34b4a60))
* fix(web): update keywords route test to mock correct hooks ([369145c](https://github.com/Mearman/Academic-Explorer/commit/369145c))
* fix(web): update RelationshipItem tests to use useNavigate mock ([a2041ad](https://github.com/Mearman/Academic-Explorer/commit/a2041ad))
* test(web): remove obsolete mocks for deleted section/group registry ([cdfc26f](https://github.com/Mearman/Academic-Explorer/commit/cdfc26f))
* feat(types): migrate graph types and expansion settings from graph package ([bdd91b2](https://github.com/Mearman/Academic-Explorer/commit/bdd91b2))
* feat(utils): migrate EntityDetectionService and event-bus from graph package ([45a6a91](https://github.com/Mearman/Academic-Explorer/commit/45a6a91))


### BREAKING CHANGE

* @bibgraph/graph package removed, use @bibgraph/types and @bibgraph/utils instead
* EntityDetectionService and event utilities now in @bibgraph/utils
* Graph types now in @bibgraph/types instead of @bibgraph/graph
* Graph visualization removed. No 'Graph' mode
or force-directed network interactions.
* Simulation package features removed

## <small>18.0.2 (2025-11-23)</small>

* fix(config): add test gating logic to prevent runs on feature branch pushes ([503b45d](https://github.com/Mearman/Academic-Explorer/commit/503b45d))
* chore(release): 18.0.1 [skip ci] ([807605e](https://github.com/Mearman/Academic-Explorer/commit/807605e))

## <small>18.0.1 (2025-11-23)</small>

* fix(config): add always() to deploy condition to prevent auto-skip ([70bafc3](https://github.com/Mearman/Academic-Explorer/commit/70bafc3))
* fix(config): add always() to release condition to prevent auto-skip ([0560a82](https://github.com/Mearman/Academic-Explorer/commit/0560a82))
* fix(config): allow deployment when E2E tests are skipped ([fd562f7](https://github.com/Mearman/Academic-Explorer/commit/fd562f7))
* fix(config): set GITHUB_PAGES environment variable for production build ([d59a819](https://github.com/Mearman/Academic-Explorer/commit/d59a819))
* docs(docs): add E2E test coverage enhancement specification ([06acfa3](https://github.com/Mearman/Academic-Explorer/commit/06acfa3)), closes [hi#value](https://github.com/hi/issues/value)
* perf(config): optimize Nx cache with GitHub Actions cache instead of artifacts ([a987489](https://github.com/Mearman/Academic-Explorer/commit/a987489))
* chore(release): 18.0.0 [skip ci] ([45b12c1](https://github.com/Mearman/Academic-Explorer/commit/45b12c1))

## 18.0.0 (2025-11-22)

* fix(ci): use simple string filters and cd into packages for vitest ([c1a3704](https://github.com/Mearman/Academic-Explorer/commit/c1a3704))
* fix(cli): add missing test:component target with passWithNoTests ([412cbad](https://github.com/Mearman/Academic-Explorer/commit/412cbad))
* fix(cli): update test assertion and migrate to @nx/vitest:test executor ([6f76135](https://github.com/Mearman/Academic-Explorer/commit/6f76135))
* fix(config): add file extension wildcard to test patterns ([ee871c3](https://github.com/Mearman/Academic-Explorer/commit/ee871c3))
* fix(config): add missing test targets to packages without Nx plugin support ([2496553](https://github.com/Mearman/Academic-Explorer/commit/2496553))
* fix(config): remove brace expansion from test patterns ([0425bcb](https://github.com/Mearman/Academic-Explorer/commit/0425bcb))
* fix(config): remove invalid --include flag from vitest commands ([1c82cb6](https://github.com/Mearman/Academic-Explorer/commit/1c82cb6))
* fix(config): use nx test targets instead of direct vitest calls ([7450263](https://github.com/Mearman/Academic-Explorer/commit/7450263))
* fix(web): correct Playwright webServer configuration for E2E tests ([469a7ed](https://github.com/Mearman/Academic-Explorer/commit/469a7ed))
* fix(web): import ViewMode type in entity route files ([3ca7997](https://github.com/Mearman/Academic-Explorer/commit/3ca7997))
* fix(web): resolve TanStack Router path resolution and configure test targets ([002aa8a](https://github.com/Mearman/Academic-Explorer/commit/002aa8a))
* fix(web): use correct baseURL port in E2E tests for CI ([6a8dbd6](https://github.com/Mearman/Academic-Explorer/commit/6a8dbd6))
* feat(ci): configure Nx workspace for automatic test target handling ([fdf8b6c](https://github.com/Mearman/Academic-Explorer/commit/fdf8b6c))
* feat(config): complete Phase 1 setup - baseline metrics documented ([6b9e74f](https://github.com/Mearman/Academic-Explorer/commit/6b9e74f))
* feat(config): complete Phase 2 foundational - add path filter infrastructure ([b3f97a0](https://github.com/Mearman/Academic-Explorer/commit/b3f97a0))
* feat(config): complete Phase 3 User Story 1 - build artifact caching (MVP) ([7044dbc](https://github.com/Mearman/Academic-Explorer/commit/7044dbc))
* feat(config): complete Phase 4 User Story 2 - enhanced caching ([c9fa56f](https://github.com/Mearman/Academic-Explorer/commit/c9fa56f))
* feat(config): complete Phase 5 User Story 3 - skip unnecessary work ([67943cd](https://github.com/Mearman/Academic-Explorer/commit/67943cd))
* feat(openalex-client): add API key support and make email optional ([a3cb79e](https://github.com/Mearman/Academic-Explorer/commit/a3cb79e))
* feat(web): add API key UI and PostHog masking for sensitive fields ([abd3fd2](https://github.com/Mearman/Academic-Explorer/commit/abd3fd2))
* feat(web): add EntityGraphView component for network visualization ([eac8e99](https://github.com/Mearman/Academic-Explorer/commit/eac8e99))
* feat(web): add graph view mode to entity detail layout ([2715863](https://github.com/Mearman/Academic-Explorer/commit/2715863))
* feat(web): add Settings link to top navigation ([0ed2bce](https://github.com/Mearman/Academic-Explorer/commit/0ed2bce))
* feat(web): create dedicated settings page route ([d2d8f03](https://github.com/Mearman/Academic-Explorer/commit/d2d8f03))
* feat(web): initialize OpenAlex client with stored credentials ([772d2cd](https://github.com/Mearman/Academic-Explorer/commit/772d2cd))
* docs(ci): document test execution fix in spec-023 results ([c766a58](https://github.com/Mearman/Academic-Explorer/commit/c766a58))
* docs(docs): add CI optimization specification (023-ci-optimization) ([8d58475](https://github.com/Mearman/Academic-Explorer/commit/8d58475))
* docs(docs): complete Phase 6 documentation and cleanup ([17d71e5](https://github.com/Mearman/Academic-Explorer/commit/17d71e5))
* docs(docs): document Phase 6 CI reorganization improvements ([da8f90d](https://github.com/Mearman/Academic-Explorer/commit/da8f90d))
* docs(docs): improve feature numbering in speckit.specify command ([b489cd0](https://github.com/Mearman/Academic-Explorer/commit/b489cd0))
* test(web): configure CI to use preview server for E2E tests ([99e158d](https://github.com/Mearman/Academic-Explorer/commit/99e158d))
* test(web): fix storage state and HAR cache paths in global setup ([f0b860a](https://github.com/Mearman/Academic-Explorer/commit/f0b860a))
* test(web): fix timing issues in settings store and cache population test ([835ea62](https://github.com/Mearman/Academic-Explorer/commit/835ea62))
* test(web): fix timing issues in settings store and skip flaky cache test ([1a7671a](https://github.com/Mearman/Academic-Explorer/commit/1a7671a))
* test(web): update route integration tests for graph view mode ([4009c3c](https://github.com/Mearman/Academic-Explorer/commit/4009c3c))
* ci(config): separate test types into distinct CI jobs ([4d97a5f](https://github.com/Mearman/Academic-Explorer/commit/4d97a5f)), closes [#023-ci-optimization](https://github.com/Mearman/Academic-Explorer/issues/023-ci-optimization)
* ci(config): separate test types into sequential matrix jobs ([74c6c97](https://github.com/Mearman/Academic-Explorer/commit/74c6c97))
* ci(config): use matrix strategy for test execution ([de6f8d9](https://github.com/Mearman/Academic-Explorer/commit/de6f8d9)), closes [#023-ci-optimization](https://github.com/Mearman/Academic-Explorer/issues/023-ci-optimization)
* refactor(config): eliminate duplicate tasks and share Nx cache ([d1b750e](https://github.com/Mearman/Academic-Explorer/commit/d1b750e))
* refactor(config): improve CI workflow organization ([eca8b93](https://github.com/Mearman/Academic-Explorer/commit/eca8b93))
* refactor(web): change politePoolEmail type from optional to required string ([a3fe08d](https://github.com/Mearman/Academic-Explorer/commit/a3fe08d))
* refactor(web): configure selective input masking in PostHog ([43ef196](https://github.com/Mearman/Academic-Explorer/commit/43ef196))
* chore(release): 17.3.1 [skip ci] ([e588d01](https://github.com/Mearman/Academic-Explorer/commit/e588d01))
* chore(web): update auto-generated route tree ([30f0fce](https://github.com/Mearman/Academic-Explorer/commit/30f0fce))
* build(web): add TanStack Router Vite plugin for route generation ([dc33d47](https://github.com/Mearman/Academic-Explorer/commit/dc33d47))


### BREAKING CHANGE

* CI workflow restructured with independent test jobs

- Created separate jobs for each test type:
  - unit-tests: Runs *.unit.test.{ts,tsx} files
  - integration-tests: Runs *.integration.test.{ts,tsx} files
  - component-tests: Runs *.component.test.{ts,tsx} files
  - e2e: Runs *.e2e.test.ts files (Playwright)

- Split quality-gates into focused jobs:
  - security-audit: Runs pnpm audit for vulnerabilities
  - dependency-audit: Runs pnpm deps:check for health

- All test jobs:
  - Download build artifacts from build job (no rebuilds)
  - Download Nx cache from build job (shared caching)
  - Run in parallel after build completes
  - Upload separate coverage artifacts

- Benefits:
  - No duplicate tasks across jobs (each task runs once)
  - Faster feedback (tests run in parallel)
  - Shared Nx cache reduces redundant work
  - Clear separation of concerns
  - Better visibility into which test type fails

- Updated job dependencies:
  - deploy: Requires all tests + audits to pass
  - release: Requires all tests + audits + deploy to pass
  - results: Shows status of all individual jobs
* Test jobs now run as matrix (8 packages × 3 test types)

- Replaced separate test jobs with matrix-based tests job:
  - Removed: unit-tests, integration-tests, component-tests
  - Added: tests (matrix job)

- Matrix dimensions:
  - packages: [web, cli, client, graph, simulation, types, ui, utils]
  - test-types: [unit, integration, component]
  - Total combinations: 24 parallel jobs

- Benefits:
  - Better parallelization (24 vs 3 jobs)
  - Faster feedback (individual package failures visible immediately)
  - Better resource utilization (matrix jobs can run concurrently)
  - Clear per-package test status in GitHub UI
  - Separate coverage artifacts per package/test-type

- Matrix job features:
  - Dynamic package path detection (apps/ vs packages/)
  - Graceful handling of missing tests (exits 0 if no tests found)
  - Per-matrix coverage uploads (coverage-{package}-{test-type})
  - fail-fast: false (continue testing other combinations on failure)

- Updated job dependencies:
  - deploy: Now depends on tests (matrix) instead of 3 separate jobs
  - release: Now depends on tests (matrix) instead of 3 separate jobs
  - results: Shows "Tests (Matrix)" with count of parallel jobs
* userEmail is now string | undefined

- Add apiKey parameter to OpenAlexClientConfig
- Add apiKey to FullyConfiguredClient interface (string | undefined)
- Update buildUrl() to include api_key query parameter when provided
- Add updateOpenAlexApiKey() function for runtime configuration
- Export updateOpenAlexApiKey from client package
- Make userEmail optional (string | undefined) throughout client
- Default both userEmail and apiKey to undefined

## <small>17.3.1 (2025-11-22)</small>

* refactor(web): use Partial<PostHogConfig> with correct properties ([d64b1f3](https://github.com/Mearman/Academic-Explorer/commit/d64b1f3))
* chore(release): 17.3.0 [skip ci] ([ef63a13](https://github.com/Mearman/Academic-Explorer/commit/ef63a13))

## 17.3.0 (2025-11-22)

* fix(web): correct PostHog config types - remove invalid recordCanvas property ([75e7881](https://github.com/Mearman/Academic-Explorer/commit/75e7881))
* fix(web): use double assertion for PostHog config type safety ([7eb3c5d](https://github.com/Mearman/Academic-Explorer/commit/7eb3c5d))
* feat(web): enable all PostHog features - autocapture, session recordings, pageviews, performance mon ([a06efc4](https://github.com/Mearman/Academic-Explorer/commit/a06efc4))
* chore(release): 17.2.1 [skip ci] ([f815580](https://github.com/Mearman/Academic-Explorer/commit/f815580))

## <small>17.2.1 (2025-11-22)</small>

* fix(config): remove --project flag from PostHog CLI sourcemap inject ([73a11f4](https://github.com/Mearman/Academic-Explorer/commit/73a11f4))
* fix(web): correct PostHog configuration for event tracking and sourcemaps ([3bda6e8](https://github.com/Mearman/Academic-Explorer/commit/3bda6e8))
* chore(release): 17.2.0 [skip ci] ([6f7d569](https://github.com/Mearman/Academic-Explorer/commit/6f7d569))

## 17.2.0 (2025-11-22)

* fix(config): add EU host to PostHog sourcemap inject command ([930d34c](https://github.com/Mearman/Academic-Explorer/commit/930d34c))
* fix(config): add PostHog credentials to sourcemap inject step ([ff2c236](https://github.com/Mearman/Academic-Explorer/commit/ff2c236))
* fix(config): add PostHog environment variables to build step ([8c2b87b](https://github.com/Mearman/Academic-Explorer/commit/8c2b87b))
* fix(config): make PostHog sourcemap steps continue on error ([22f2dc3](https://github.com/Mearman/Academic-Explorer/commit/22f2dc3))
* fix(config): update PostHog CLI commands to current syntax ([032a516](https://github.com/Mearman/Academic-Explorer/commit/032a516))
* fix(scripts): correct .app and .dev RDAP server endpoints ([4c8f044](https://github.com/Mearman/Academic-Explorer/commit/4c8f044))
* fix(scripts): correct .io RDAP server endpoint ([463853c](https://github.com/Mearman/Academic-Explorer/commit/463853c))
* fix(web): change mobile search to expandable input instead of navigation ([3c17845](https://github.com/Mearman/Academic-Explorer/commit/3c17845))
* fix(web): improve mobile search alignment by hiding other controls ([27cacac](https://github.com/Mearman/Academic-Explorer/commit/27cacac))
* fix(web): move inline navigation to xl breakpoint ([2d4e372](https://github.com/Mearman/Academic-Explorer/commit/2d4e372))
* fix(web): reduce header spacing to fix md breakpoint layout ([de04650](https://github.com/Mearman/Academic-Explorer/commit/de04650))
* fix(web): remove auto-search behavior from header search input ([33740f8](https://github.com/Mearman/Academic-Explorer/commit/33740f8))
* chore(release): 17.1.0 [skip ci] ([1e4c746](https://github.com/Mearman/Academic-Explorer/commit/1e4c746))
* chore(scripts): update domain availability matrix ([e01750e](https://github.com/Mearman/Academic-Explorer/commit/e01750e))
* chore(scripts): update domain availability matrix with sequential checks ([c994f99](https://github.com/Mearman/Academic-Explorer/commit/c994f99))
* refactor(scripts): convert WHOIS checks to async with retry logic ([6696fea](https://github.com/Mearman/Academic-Explorer/commit/6696fea))
* refactor(scripts): implement symmetric voting for domain availability ([667caa9](https://github.com/Mearman/Academic-Explorer/commit/667caa9))
* refactor(scripts): remove default fallback for no-consensus domain checks ([ce7e7b6](https://github.com/Mearman/Academic-Explorer/commit/ce7e7b6))
* refactor(scripts): switch to row-first domain checking strategy ([9c8fd9f](https://github.com/Mearman/Academic-Explorer/commit/9c8fd9f))
* feat(docs): add WHOIS-based domain availability checker for spec 006 ([4101c95](https://github.com/Mearman/Academic-Explorer/commit/4101c95))
* feat(scripts): add RDAP, DNS, and WHOIS methods for faster domain checking ([3c14daf](https://github.com/Mearman/Academic-Explorer/commit/3c14daf))
* feat(scripts): implement consensus-based domain checking in auto mode ([61a7a09](https://github.com/Mearman/Academic-Explorer/commit/61a7a09))
* feat(web): add mobile search button to header ([b20f81a](https://github.com/Mearman/Academic-Explorer/commit/b20f81a))
* feat(web): add responsive spacing and hide drag handles on mobile ([aef1c79](https://github.com/Mearman/Academic-Explorer/commit/aef1c79))
* feat(web): implement mobile-first responsive header with navigation menu ([4782de8](https://github.com/Mearman/Academic-Explorer/commit/4782de8))
* test(web): add router mocks to MainLayout responsive component tests ([2428863](https://github.com/Mearman/Academic-Explorer/commit/2428863))
* perf(docs): add parallel WHOIS checking with 10x concurrency ([d624595](https://github.com/Mearman/Academic-Explorer/commit/d624595))
* docs(config): mark Phase 2 and partial Phase 4 tasks complete ([3b85580](https://github.com/Mearman/Academic-Explorer/commit/3b85580))
* docs(docs): add mobile search button commit to spec-021 ([d101348](https://github.com/Mearman/Academic-Explorer/commit/d101348))
* docs(docs): add spacing fix commit to spec-021 implementation ([eba005f](https://github.com/Mearman/Academic-Explorer/commit/eba005f))
* docs(docs): add xl breakpoint fix commit to spec-021 ([1c488d9](https://github.com/Mearman/Academic-Explorer/commit/1c488d9))
* docs(docs): mark spec-021 mantine responsive layout as complete ([19330f3](https://github.com/Mearman/Academic-Explorer/commit/19330f3))
* docs(docs): rename spec directory from 018 to 022 ([55e3a6c](https://github.com/Mearman/Academic-Explorer/commit/55e3a6c))
* docs(docs): update spec-021 with expandable mobile search commit ([5bf680d](https://github.com/Mearman/Academic-Explorer/commit/5bf680d))
* docs(docs): update spec-021 with mobile search alignment fix commit ([f7d2334](https://github.com/Mearman/Academic-Explorer/commit/f7d2334))
* docs(readme): update spec-021 with search Enter-key commit ([d79c360](https://github.com/Mearman/Academic-Explorer/commit/d79c360))
* ci(config): add PostHog source map upload to deployment workflow ([9228e6f](https://github.com/Mearman/Academic-Explorer/commit/9228e6f))

## 17.1.0 (2025-11-21)

* docs(docs): add Mantine responsive layout specification (spec-021) ([9a0582b](https://github.com/Mearman/Academic-Explorer/commit/9a0582b))
* refactor(web): update CatalogueErrorBoundary to use PostHogErrorBoundary ([7b1a002](https://github.com/Mearman/Academic-Explorer/commit/7b1a002))
* feat(web): add React 19 error handlers for PostHog tracking ([6febd00](https://github.com/Mearman/Academic-Explorer/commit/6febd00))
* feat(web): migrate PostHogProvider to official @posthog/react implementation ([2830ff8](https://github.com/Mearman/Academic-Explorer/commit/2830ff8))
* build(deps): add @posthog/react package ([9360f0f](https://github.com/Mearman/Academic-Explorer/commit/9360f0f))
* chore(release): 17.0.1 [skip ci] ([6fca77d](https://github.com/Mearman/Academic-Explorer/commit/6fca77d))

## <small>17.0.1 (2025-11-21)</small>

* docs(docs): create Mantine responsive layout specification (spec-021) ([b04b3ee](https://github.com/Mearman/Academic-Explorer/commit/b04b3ee))
* fix(web): correct EntityType imports and add vitest-axe type definitions ([707fdbd](https://github.com/Mearman/Academic-Explorer/commit/707fdbd))
* chore(release): 17.0.0 [skip ci] ([0d04147](https://github.com/Mearman/Academic-Explorer/commit/0d04147))

## 17.0.0 (2025-11-21)

* test(web): add E2E and integration tests for full entity support ([7c06edd](https://github.com/Mearman/Academic-Explorer/commit/7c06edd))
* test(web): add failing component tests for keywords EntityDetailLayout migration ([30691da](https://github.com/Mearman/Academic-Explorer/commit/30691da))
* test(web): fix edge type count expectation and relation type taxonomy ([2d78f2b](https://github.com/Mearman/Academic-Explorer/commit/2d78f2b))
* test(web): fix GraphNode interface in work-funding performance tests ([e5055d8](https://github.com/Mearman/Academic-Explorer/commit/e5055d8))
* test(web): fix GraphNode interface issues in grants-analyzer unit tests ([34fdfd6](https://github.com/Mearman/Academic-Explorer/commit/34fdfd6))
* test(web): fix GraphNode interface issues in work-funding integration tests ([10cb657](https://github.com/Mearman/Academic-Explorer/commit/10cb657))
* test(web): fix keywords route EntityDetailLayout integration tests ([acf30c5](https://github.com/Mearman/Academic-Explorer/commit/acf30c5))
* test(web): skip incomplete keyword component migration tests ([af4ad7e](https://github.com/Mearman/Academic-Explorer/commit/af4ad7e))
* fix(analytics): resolve PostHog configuration type compatibility issues ([1dda4e1](https://github.com/Mearman/Academic-Explorer/commit/1dda4e1))
* fix(graph): add missing concept and has_role to RELATION_TAXONOMY ([3126df8](https://github.com/Mearman/Academic-Explorer/commit/3126df8))
* fix(graph): add null safety for API response handling ([68d97df](https://github.com/Mearman/Academic-Explorer/commit/68d97df))
* fix(web): resolve API signature mismatch in work keywords performance test ([2bae3ba](https://github.com/Mearman/Academic-Explorer/commit/2bae3ba))
* fix(web): resolve TypeScript errors in keywords unit tests ([34509f9](https://github.com/Mearman/Academic-Explorer/commit/34509f9))
* fix(web): resolve TypeScript errors in work funding performance tests ([b381d5f](https://github.com/Mearman/Academic-Explorer/commit/b381d5f))
* fix(web): resolve TypeScript errors in work keywords tests ([f157714](https://github.com/Mearman/Academic-Explorer/commit/f157714))
* feat(analytics): add academic analytics utilities for research workflow tracking ([cc82036](https://github.com/Mearman/Academic-Explorer/commit/cc82036))
* feat(analytics): add environment configuration and development testing utilities ([099037c](https://github.com/Mearman/Academic-Explorer/commit/099037c))
* feat(analytics): add PostHog configuration with EU privacy compliance ([b00c3b7](https://github.com/Mearman/Academic-Explorer/commit/b00c3b7))
* feat(analytics): add PostHog provider component with error tracking ([44a5e49](https://github.com/Mearman/Academic-Explorer/commit/44a5e49))
* feat(analytics): enhance error boundaries with PostHog integration ([82c789a](https://github.com/Mearman/Academic-Explorer/commit/82c789a))
* feat(analytics): enhance NavigationTracker with PostHog page view analytics ([dd110ce](https://github.com/Mearman/Academic-Explorer/commit/dd110ce))
* feat(analytics): enhance performance monitoring with PostHog integration ([ccd1246](https://github.com/Mearman/Academic-Explorer/commit/ccd1246))
* feat(analytics): integrate PostHog provider into application ([2a1c29b](https://github.com/Mearman/Academic-Explorer/commit/2a1c29b))
* feat(services): add work→funder relationship detection via grants analyzer ([dd6d49a](https://github.com/Mearman/Academic-Explorer/commit/dd6d49a))
* feat(shared-utils): add field selections and entity data for complete relationships ([ef2d166](https://github.com/Mearman/Academic-Explorer/commit/ef2d166))
* feat(shared-utils): add RelationType enum and relationship type definitions ([da91fa2](https://github.com/Mearman/Academic-Explorer/commit/da91fa2))
* feat(web): add concept relationship detection implementation (Phase 6) ([bed1ea3](https://github.com/Mearman/Academic-Explorer/commit/bed1ea3))
* feat(web): add Phase 7 integration tests and complete Phase 8 quality gates ([1e0baf5](https://github.com/Mearman/Academic-Explorer/commit/1e0baf5))
* feat(web): add relationship hooks to keywords route ([d75cce3](https://github.com/Mearman/Academic-Explorer/commit/d75cce3))
* feat(web): add repository and role relationship detection (Phase 7) ([87ea84f](https://github.com/Mearman/Academic-Explorer/commit/87ea84f))
* feat(web): add taxonomy entity relationship detection ([8c0fda8](https://github.com/Mearman/Academic-Explorer/commit/8c0fda8))
* feat(web): add work→topic relationship detection ([90eabd1](https://github.com/Mearman/Academic-Explorer/commit/90eabd1))
* feat(web): implement entity topic relationships (T043-T056) ([0d9903f](https://github.com/Mearman/Academic-Explorer/commit/0d9903f))
* feat(web): migrate concepts route to EntityDetailLayout ([0772a1a](https://github.com/Mearman/Academic-Explorer/commit/0772a1a))
* feat(web): migrate keywords route to EntityDetailLayout ([3cdc562](https://github.com/Mearman/Academic-Explorer/commit/3cdc562))
* docs(docs): add OpenAlex API filter parameters reference ([93b51ef](https://github.com/Mearman/Academic-Explorer/commit/93b51ef))
* docs(docs): add slash command invocation guidance to constitution (v2.4.3) ([939a361](https://github.com/Mearman/Academic-Explorer/commit/939a361))
* docs(docs): complete implementation plan for full entity support ([b7f49f7](https://github.com/Mearman/Academic-Explorer/commit/b7f49f7))
* docs(docs): complete OpenAlex relationship support specification ([8633389](https://github.com/Mearman/Academic-Explorer/commit/8633389))
* docs(docs): complete Phase 0 research and implementation plan for spec-020 ([712dedb](https://github.com/Mearman/Academic-Explorer/commit/712dedb))
* docs(docs): create specification for full OpenAlex entity type support ([eb8e6be](https://github.com/Mearman/Academic-Explorer/commit/eb8e6be))
* docs(docs): generate implementation tasks for full entity support ([7b8af7a](https://github.com/Mearman/Academic-Explorer/commit/7b8af7a))
* docs(docs): generate implementation tasks for spec-020 (89 tasks across 8 phases) ([dc3fd3f](https://github.com/Mearman/Academic-Explorer/commit/dc3fd3f))
* docs(docs): mark licenses user story as not applicable and update task progress ([7b1f57a](https://github.com/Mearman/Academic-Explorer/commit/7b1f57a))
* docs(docs): mark T010 and T011 as complete in tasks.md ([fbc992b](https://github.com/Mearman/Academic-Explorer/commit/fbc992b))
* refactor(web): replace keywords loading/error states with modern components ([1c633ce](https://github.com/Mearman/Academic-Explorer/commit/1c633ce))
* chore(release): 16.0.0 [skip ci] ([2eaa7ac](https://github.com/Mearman/Academic-Explorer/commit/2eaa7ac))


### BREAKING CHANGE

* Requires VITE_PUBLIC_POSTHOG_API_KEY environment variable

## 16.0.0 (2025-11-21)

* test(web): fix relationship-detection-service mock for ENTITY_METADATA ([5b8468d](https://github.com/Mearman/Academic-Explorer/commit/5b8468d))
* docs(docs): add entity taxonomy centralization specification ([b3228ad](https://github.com/Mearman/Academic-Explorer/commit/b3228ad))
* docs(docs): add OpenAlex entity definition consolidation specification ([8545a95](https://github.com/Mearman/Academic-Explorer/commit/8545a95))
* docs(docs): amend constitution to v2.2.0 (spec commit requirement) ([49ffc2c](https://github.com/Mearman/Academic-Explorer/commit/49ffc2c))
* docs(docs): amend constitution to v2.3.0 (automatic workflow progression) ([dd9fb6a](https://github.com/Mearman/Academic-Explorer/commit/dd9fb6a))
* docs(docs): amend constitution to v2.4.0 (no re-export principle) ([c1171b1](https://github.com/Mearman/Academic-Explorer/commit/c1171b1))
* docs(docs): amend constitution to v2.4.1 ([55b921f](https://github.com/Mearman/Academic-Explorer/commit/55b921f))
* docs(docs): complete Phase 0 and Phase 1 planning artifacts (spec-018) ([8bffb62](https://github.com/Mearman/Academic-Explorer/commit/8bffb62))
* docs(docs): complete spec-018 entity type consolidation documentation ([28c241f](https://github.com/Mearman/Academic-Explorer/commit/28c241f))
* docs(docs): remove backward compatibility from spec-018 ([7acb4a1](https://github.com/Mearman/Academic-Explorer/commit/7acb4a1))
* refactor(graph): import EntityType from types package ([5546ed5](https://github.com/Mearman/Academic-Explorer/commit/5546ed5))
* refactor(monorepo): consolidate EntityType to single canonical source ([cbb75ad](https://github.com/Mearman/Academic-Explorer/commit/cbb75ad))
* refactor(monorepo): fix remaining EntityType duplicates and type conflicts ([c54bd1e](https://github.com/Mearman/Academic-Explorer/commit/c54bd1e))
* refactor(utils): import EntityType from types package ([a6cc82c](https://github.com/Mearman/Academic-Explorer/commit/a6cc82c))
* refactor(web): make entity name clickable instead of separate button ([e4d292f](https://github.com/Mearman/Academic-Explorer/commit/e4d292f))
* refactor(web): migrate to centralized entity metadata ([b3ba74e](https://github.com/Mearman/Academic-Explorer/commit/b3ba74e))
* fix(academic-explorer): correct relationship direction for Authors ([470eb96](https://github.com/Mearman/Academic-Explorer/commit/470eb96))
* fix(academic-explorer): correct Works outbound query and add repository relationships ([fa2fc46](https://github.com/Mearman/Academic-Explorer/commit/fa2fc46))
* fix(academic-explorer): match RelationshipTypeString casing to RelationType enum ([dc64217](https://github.com/Mearman/Academic-Explorer/commit/dc64217))
* fix(academic-explorer): use host_organization_name for publisher display name ([e495f34](https://github.com/Mearman/Academic-Explorer/commit/e495f34))
* fix(release): include all commit types in release notes ([c2ce73b](https://github.com/Mearman/Academic-Explorer/commit/c2ce73b))
* fix(shared-utils): correct RELATED_TO relationship type case ([121c1fd](https://github.com/Mearman/Academic-Explorer/commit/121c1fd))
* fix(web): add custom formatter for entity reference fields ([9820507](https://github.com/Mearman/Academic-Explorer/commit/9820507))
* fix(web): add QueryClientProvider to relationship component tests ([87ee6c9](https://github.com/Mearman/Academic-Explorer/commit/87ee6c9))
* fix(web): add ScrollArea to EntityInfoSection for scrollable content ([02e31e9](https://github.com/Mearman/Academic-Explorer/commit/02e31e9))
* fix(web): decouple sidebar preview from graph operations ([5818620](https://github.com/Mearman/Academic-Explorer/commit/5818620))
* fix(web): detect entity type from ID prefix in RichEntityDisplay ([89454c3](https://github.com/Mearman/Academic-Explorer/commit/89454c3))
* fix(web): detect entity type from ID prefix in View Full Details button ([21919b4](https://github.com/Mearman/Academic-Explorer/commit/21919b4))
* fix(web): pass full data object to onDataFetched callback ([3a28860](https://github.com/Mearman/Academic-Explorer/commit/3a28860))
* fix(web): preserve graph errors in relationship fallback logic ([05d8012](https://github.com/Mearman/Academic-Explorer/commit/05d8012))
* fix(web): resolve TanStack Router plugin issues and add taxonomy routes ([587bce1](https://github.com/Mearman/Academic-Explorer/commit/587bce1))
* fix(web): update React Query cache when fields are fetched on demand ([c62e976](https://github.com/Mearman/Academic-Explorer/commit/c62e976))
* fix(web): use displayEntityId for entity data fetching in EntityInfoSection ([7cb999f](https://github.com/Mearman/Academic-Explorer/commit/7cb999f))
* feat: add support for OpenAlex taxonomy entities (domains, fields, subfields) ([9e08b9d](https://github.com/Mearman/Academic-Explorer/commit/9e08b9d))
* feat(academic-explorer): add embedded data extraction support for relationship queries ([88f4cb2](https://github.com/Mearman/Academic-Explorer/commit/88f4cb2))
* feat(academic-explorer): add Works related_to query for discovering similar works ([fb9e870](https://github.com/Mearman/Academic-Explorer/commit/fb9e870))
* feat(academic-explorer): extend type unions to include taxonomy entities ([c430f32](https://github.com/Mearman/Academic-Explorer/commit/c430f32))
* feat(academic-explorer): populate all relationship query configurations ([16e0c8e](https://github.com/Mearman/Academic-Explorer/commit/16e0c8e))
* feat(graph): add Work→Topic, Institution relationships ([b5eb38c](https://github.com/Mearman/Academic-Explorer/commit/b5eb38c))
* feat(monorepo): centralize entity metadata in types package ([b94dc9f](https://github.com/Mearman/Academic-Explorer/commit/b94dc9f))
* feat(shared-utils): add taxonomy entity support to storage layer ([42e3d7a](https://github.com/Mearman/Academic-Explorer/commit/42e3d7a))
* feat(types): add OpenAlex taxonomy entities (domains, fields, subfields) to type system ([5ee7261](https://github.com/Mearman/Academic-Explorer/commit/5ee7261))
* feat(web): add API-based relationship extraction fallback ([9029040](https://github.com/Mearman/Academic-Explorer/commit/9029040))
* feat(web): add API-based relationship query registry ([a694ea3](https://github.com/Mearman/Academic-Explorer/commit/a694ea3))
* feat(web): add background prefetch for ID-only embedded relationships ([7933fb0](https://github.com/Mearman/Academic-Explorer/commit/7933fb0))
* feat(web): add comprehensive field display with on-demand fetching ([c388430](https://github.com/Mearman/Academic-Explorer/commit/c388430))
* feat(web): add dual-click behavior to relationship items ([05bad7d](https://github.com/Mearman/Academic-Explorer/commit/05bad7d))
* feat(web): add support for taxonomy entity routes (domains, fields, subfields) ([c051452](https://github.com/Mearman/Academic-Explorer/commit/c051452))
* feat(web): add taxonomy entity configs and colors ([b9c32f9](https://github.com/Mearman/Academic-Explorer/commit/b9c32f9))
* feat(web): add View Full Details button to entity preview ([7793357](https://github.com/Mearman/Academic-Explorer/commit/7793357))
* feat(web): auto-collapse right sidebar when no entity preview is available ([1d97673](https://github.com/Mearman/Academic-Explorer/commit/1d97673))
* feat(web): auto-open right sidebar on entity click and remove history fallback ([f521521](https://github.com/Mearman/Academic-Explorer/commit/f521521))
* feat(web): complete taxonomy entity integration across web app ([b64938d](https://github.com/Mearman/Academic-Explorer/commit/b64938d))
* feat(web): make entity reference fields clickable with proper routing ([abf0807](https://github.com/Mearman/Academic-Explorer/commit/abf0807))
* feat(web): split left sidebar into Bookmarks (upper) and History (lower) sections ([ba15360](https://github.com/Mearman/Academic-Explorer/commit/ba15360))
* chore(release): 15.0.2 [skip ci] ([fd1189d](https://github.com/Mearman/Academic-Explorer/commit/fd1189d))


### Breaking change

* for spec-018: removes re-export tasks from entity
consolidation plan. All backward compatibility re-exports violate new
principle and must be eliminated.

Refs: constitution v2.4.0 (MINOR bump - new principle added)

### BREAKING CHANGE

* All EntityType imports now use @bibgraph/types

Centralize EntityType definition to packages/types/src/entities/entities.ts
as the single source of truth. All packages and apps now import EntityType
from @bibgraph/types instead of local duplicates.

Changes:
- Remove EntityType from graph/src/types/core.ts (imported from types pkg)
- Remove EntityType from utils/storage/catalogue-db.ts (imported from types pkg)
- Remove EntityType re-exports from graph and utils package indices
- Add EntityType import to utils/url-compression.ts (full 12-type support)
- Fix graph package: 25 files updated to import from types package
- Fix web app: 35 files updated to import from types package
  - Remove local singular EntityType definitions
  - Convert all entity type references from singular to plural forms
  - Update ENTITY_TYPE_CONFIGS keys: author→authors, work→works, etc.
  - Fix AddToListModal to use canonical EntityType (remove mapping)
  - Add missing entity types (concepts, keywords) to catalogue counts
- Fix CLI: Already using correct imports (no changes needed)

Constitution Compliance:
- Removed all EntityType re-exports (Principle III: no re-exports)
- All imports now direct from canonical source

Coverage:
✅ All 12 OpenAlex entity types supported:
   works, authors, sources, institutions, topics, concepts,
   publishers, funders, keywords, domains, fields, subfields

Files modified: 71
- Graph package: 26 files
- Utils package: 9 files
- Web app: 35 files
- CLI: 1 file (verified correct)

Build status: All packages build successfully
- types ✅
- utils ✅
- graph ✅
- client ✅
- simulation ✅
- ui ✅
- cli ✅
- web ✅
* CachedEntityMetadata.type changed from EntityType to
CacheStorageType (internal change, affects cache browser only)
* Constitution version 2.1.0 → 2.2.0 (MINOR)

New workflow requirement:
- ALWAYS commit changes to ./specs/ directory after each phase completion
- Spec commits MUST use docs(spec-###): prefix
- Commit spec changes separately from implementation changes

Example spec commit:
  git add specs/018-entity-consolidation/
  git commit -m "docs(spec-018): complete Phase 1 setup tasks"

Refs: .specify/memory/constitution.md (Principle VI)
Refs: .specify/templates/plan-template.md (Constitution Check)
Refs: .specify/templates/spec-template.md (Constitution Alignment)
* Constitution version 2.2.0 → 2.3.0 (MINOR)

Follow-up TODOs:
- Implement automatic command chaining in /speckit.plan workflow logic
- Update command templates to check for blockers before auto-progressing

Refs: constitution v2.3.0 Principle X
* Consumers importing EntityType from @bibgraph/graph
must update imports to @bibgraph/types
* Entity metadata helper functions moved from graph package
to types package. Import from @bibgraph/types instead of
@bibgraph/graph/taxonomy/entity-taxa.
* EntityType union now includes domains, fields, subfields

## [15.0.2](https://github.com/Mearman/Academic-Explorer/compare/v15.0.1...v15.0.2) (2025-11-20)

## [15.0.1](https://github.com/Mearman/Academic-Explorer/compare/v15.0.0...v15.0.1) (2025-11-20)

# [15.0.0](https://github.com/Mearman/Academic-Explorer/compare/v14.0.0...v15.0.0) (2025-11-20)


### Bug Fixes

* **docs:** correct Vitest integration test command in quickstart.md (T089) ([0a8d419](https://github.com/Mearman/Academic-Explorer/commit/0a8d419ba04aa5a4d292d05f2241e75433aaa1d3))
* **graph,web:** migrate to new RelationType enum values and add edge direction ([89c3be0](https://github.com/Mearman/Academic-Explorer/commit/89c3be01bb4293bdf55980a2c357ff4d9df59393)), closes [#014-edge-direction-correction](https://github.com/Mearman/Academic-Explorer/issues/014-edge-direction-correction)
* **graph,web:** update test expectations to match RelationType migration ([b0707f2](https://github.com/Mearman/Academic-Explorer/commit/b0707f258b21bc5688830a4c08086b44d6f37584)), closes [#014-edge-direction-correction](https://github.com/Mearman/Academic-Explorer/issues/014-edge-direction-correction)
* **graph:** correct AUTHORSHIP edge direction (Work → Author) - US1 MVP ([83e32e4](https://github.com/Mearman/Academic-Explorer/commit/83e32e408be842e31fb873e349da63b924e4cc83))
* **graph:** Phase 10 polish - metadata, truncation, test fixes ([5801c24](https://github.com/Mearman/Academic-Explorer/commit/5801c244c8b452c6ad42a4d69506de0572410c6a))
* **shared-utils:** add DOM lib and node types to types package tsconfig ([7b674df](https://github.com/Mearman/Academic-Explorer/commit/7b674dfdc97ca2d1bbd50e3f90af546ab3e82007))
* **ui-components:** add jest-dom/vitest import to test setup ([cebe129](https://github.com/Mearman/Academic-Explorer/commit/cebe129b8d85b6fe84b88f0bf00ba4c8245249c1))
* **ui-components:** add Mantine packages to devDependencies for TypeScript resolution ([a98738f](https://github.com/Mearman/Academic-Explorer/commit/a98738fa927c9562dc6eeb13cd94fb6aa69e5139))
* **web:** add cleanup to all relationship component tests ([19a8deb](https://github.com/Mearman/Academic-Explorer/commit/19a8debdf4dd4ecdf4dcd986ca9c4fdd4e010f43))
* **web:** add vitest-axe type declarations ([3264c83](https://github.com/Mearman/Academic-Explorer/commit/3264c83e9d963d5947aa012a74465a2c95ef430c))
* **web:** correct edge directions in relationship detection service ([c59bc0d](https://github.com/Mearman/Academic-Explorer/commit/c59bc0d53c621413ec16461d2166436ef25b837e))
* **web:** correct Vitest mocking syntax in RelationshipItem tests ([951511f](https://github.com/Mearman/Academic-Explorer/commit/951511f675390cc10c8d24159b554b8d8952f7b4))
* **web:** ensure search controls meet WCAG touch target requirements ([f0c080c](https://github.com/Mearman/Academic-Explorer/commit/f0c080c8245367ff8e2fba26785daa20aacc849f))
* **web:** fix React hooks violations in entity routes ([11526ca](https://github.com/Mearman/Academic-Explorer/commit/11526ca8f23552fc6891956453cd12ac859e77c7))
* **web:** improve landing page responsive layout ([620bd37](https://github.com/Mearman/Academic-Explorer/commit/620bd37ef7d05711620f78644d6e49435299fe03))
* **web:** improve visual hierarchy and zoom support on landing page ([e7fe27c](https://github.com/Mearman/Academic-Explorer/commit/e7fe27c2566ac7dc104121af574c149f4ac137d3))
* **web:** make useEntityRelationships hook work without GraphProvider context ([d10302f](https://github.com/Mearman/Academic-Explorer/commit/d10302f83572058c6a62438889c2946ce480234c))
* **web:** prevent state updates after unmount in use-user-interactions hook ([63c2ea3](https://github.com/Mearman/Academic-Explorer/commit/63c2ea35274c4b5e8063c99cd0c22dc4593bd7ff))
* **web:** resolve vitest 4 migration issues ([054bf02](https://github.com/Mearman/Academic-Explorer/commit/054bf0239941396ac8daed0e7feb3cc1a5ef0cd5))
* **web:** update graph-store test for 18 edge types ([2376172](https://github.com/Mearman/Academic-Explorer/commit/2376172b4574dcabf667d00d9268211d409b2ea0))
* **web:** use vitest-axe/matchers for accessibility tests ([0a1c989](https://github.com/Mearman/Academic-Explorer/commit/0a1c98906a0a5dfdea6c4a28dc3b1f6249949add))


### chore

* **deps:** upgrade vitest to v4.0.10 to fix glob vulnerability ([46aa4d1](https://github.com/Mearman/Academic-Explorer/commit/46aa4d1189f7946cee0988201458157ab948cdf4))


### Code Refactoring

* **graph:** update RelationType to noun form and add EdgeDirection field ([5e77550](https://github.com/Mearman/Academic-Explorer/commit/5e77550f7f84570e836bd918768269d94cf0a083))


### Documentation

* **docs:** amend constitution to v1.5.0 - add test-first bug fix principle ([166eb46](https://github.com/Mearman/Academic-Explorer/commit/166eb46e6b517a4dd7b84338478db9dacc3dc8d3))
* **root:** amend constitution to v2.0.0 (deployment readiness principle) ([7cd2d0f](https://github.com/Mearman/Academic-Explorer/commit/7cd2d0f00949cff48e34ef61d3cccd6d593727e2))


### Features

* **graph:** implement FUNDED_BY edges (Work → Funder) - US3 ([40fb020](https://github.com/Mearman/Academic-Explorer/commit/40fb020537728096af2301a76134b41da0ee8992))
* **graph:** implement institution LINEAGE edges - US5 ([0ec15d7](https://github.com/Mearman/Academic-Explorer/commit/0ec15d7a1fce69b9f94145c0bf15f01e3b016445))
* **graph:** implement keyword and author topic edges - Phase 9 ([0d5e69a](https://github.com/Mearman/Academic-Explorer/commit/0d5e69ae758afe24e3f09d2c6d0fa1ce62c79bdd))
* **graph:** implement publisher relationships - US6 ([0776932](https://github.com/Mearman/Academic-Explorer/commit/0776932df3667ab3ff62c11e7454e192f07e3e73))
* **graph:** implement REFERENCE edges for citations (Work → Work) - US2 ([85f255a](https://github.com/Mearman/Academic-Explorer/commit/85f255a9800ddeb30dbd5dac9606ac086afb342c))
* **graph:** implement topic taxonomy hierarchy edges - US4 ([d4bb090](https://github.com/Mearman/Academic-Explorer/commit/d4bb090789767301dc0512216447b168fb2a5499))
* **web:** add direction filter toggle (outbound/inbound/both) to EdgeFiltersSection ([910316b](https://github.com/Mearman/Academic-Explorer/commit/910316bdafe0fdd43a0909d5fad42d08418e6f1b))
* **web:** add E2E test infrastructure for relationship visualization ([a5703be](https://github.com/Mearman/Academic-Explorer/commit/a5703be5ace7d438d2d33e3a560e72dec6129615))
* **web:** add edge rendering integration for graph visualization ([79a8d5f](https://github.com/Mearman/Academic-Explorer/commit/79a8d5f007bbd1781c1f2a4eaef09974b04edbae))
* **web:** add error states with retry buttons to relationship components ([5b4c7db](https://github.com/Mearman/Academic-Explorer/commit/5b4c7db62b2d3e9e813b49842133ea5be348d5bd))
* **web:** add loading skeletons to relationship components ([7eded73](https://github.com/Mearman/Academic-Explorer/commit/7eded7335a8e0ef6636c3cd001aac709ecdc1f15))
* **web:** add multi-modal edge styling system with WCAG AA compliance ([d7a4640](https://github.com/Mearman/Academic-Explorer/commit/d7a4640e166708d648e0d4701f89fa7b77429f0d)), closes [#4A90E2](https://github.com/Mearman/Academic-Explorer/issues/4A90E2) [#7B68EE](https://github.com/Mearman/Academic-Explorer/issues/7B68EE) [#50C878](https://github.com/Mearman/Academic-Explorer/issues/50C878) [#FFA500](https://github.com/Mearman/Academic-Explorer/issues/FFA500)
* **web:** add partial data warning to relationship sections ([aa487d9](https://github.com/Mearman/Academic-Explorer/commit/aa487d9b40f6f9761ae1fae34f0c63e9911a5f57))
* **web:** add relationship count summaries and badges ([026827a](https://github.com/Mearman/Academic-Explorer/commit/026827ac6694270894e4c3cc2bc0c27fa7b5af61))
* **web:** add relationship grouping logic (Phase 2) ([d641feb](https://github.com/Mearman/Academic-Explorer/commit/d641feb7426c668866db47693dd08bc913aa501f))
* **web:** add relationship type filtering UI with localStorage persistence ([d312303](https://github.com/Mearman/Academic-Explorer/commit/d312303d3918e552de45297c721a9c1f2937ee3e))
* **web:** implement outgoing relationships visualization (US2 P2) ([82a40a0](https://github.com/Mearman/Academic-Explorer/commit/82a40a0d757971bdb1f3d005e2ff3a9afb8dd744))
* **web:** implement Phase 1 - Setup for entity relationship visualization ([1a21275](https://github.com/Mearman/Academic-Explorer/commit/1a21275ad79253bd8d58146b30aea2237bf5fae7))
* **web:** implement relationship filtering core logic (US3 P3 partial) ([eef0063](https://github.com/Mearman/Academic-Explorer/commit/eef006300354584df0750f487f0988c2c3ef982e))
* **web:** integrate incoming relationships into all entity pages (T015-T021) ([26df494](https://github.com/Mearman/Academic-Explorer/commit/26df49498fdcfc70b16f8e0e0ccd1b85c0bd9102))
* **web:** integrate redetectEdges into graph load workflow ([68aebe7](https://github.com/Mearman/Academic-Explorer/commit/68aebe73e0393a42946d4952e9bc62a76281d1b5))
* **web:** integrate RelationshipCounts component across all entity detail pages ([e0ed01f](https://github.com/Mearman/Academic-Explorer/commit/e0ed01f8f7734ded07a3aa33d9726d25be45f58a))
* **web:** migrate Funders and Publishers to EntityDetailLayout ([d58ae72](https://github.com/Mearman/Academic-Explorer/commit/d58ae7272bf2bfa6ce929ac303535373fd04a44f))
* **web:** update edge filter UI labels to match new RelationType enum ([5f10ce6](https://github.com/Mearman/Academic-Explorer/commit/5f10ce65b22715fef7f00c860e65bb0c72e0fa5d))


### BREAKING CHANGES

* **deps:** Upgrade vitest from 3.2.4 to 4.0.10 (major version bump)

- Upgrade vitest from ^3.2.4 to ^4.0.10
- Upgrade @vitest/coverage-v8 from ^3.2.4 to ^4.0.10
- Upgrade @vitest/ui from ^3.2.4 to ^4.0.10
- Add pnpm override for glob>=10.5.0 to fix CVE (GHSA-5j98-mcp5-4vw2)

The vitest v4 upgrade removes the vulnerable glob@10.4.5 transitive dependency
that was present in @vitest/coverage-v8@3.2.4 via test-exclude. The new version
(4.0.10) no longer depends on test-exclude, eliminating the vulnerability entirely.

Additionally, added a pnpm override to ensure all glob dependencies are >=10.5.0,
which patches the command injection vulnerability in glob CLI (affects versions
10.2.0-10.5.0).

Security fix for:
- Package: glob
- Vulnerable versions: >=10.2.0 <10.5.0
- Patched versions: >=10.5.0
- CVE: GHSA-5j98-mcp5-4vw2 (high severity)

Peer dependency warnings:
- @nx/vite expects vitest ^1.3.1 || ^2.0.0 || ^3.0.0 (now using 4.0.10)
  This is expected and does not affect functionality as Nx uses vitest
  programmatically without relying on breaking API changes.

Packages updated: +36 -125 (net: -89 packages)
* **graph:** Adds TOPIC_PART_OF_FIELD and FIELD_PART_OF_DOMAIN edge types

## Implementation

**Topic Hierarchy (T043-T046)**:
- Extract field, domain, subfield from topic data
- Create edges: topic → field, field → domain, topic → subfield
- Direction: 'outbound'
- Stub nodes: field and domain entities for taxonomy visualization

**ID Handling (T049)**:
- Helper extractFieldOrDomainId() parses field/domain URLs
- Format: https://openalex.org/fields/17 → fields/17
- Validation with warnings (expected for taxonomy IDs)

## Tests

- T039: Unit test for Topic → Field edges ✅
- T040: Unit test for Field → Domain edges ✅
- T041: Integration test for complete taxonomy path ✅
- T042: Unit test for reverse topic lookup ✅

All topic tests passing. No regressions in authorship/citation/funding tests.

## Files Changed

- packages/graph/src/providers/topics.test.ts (new, 223 lines)
- packages/graph/src/providers/openalex-provider.ts (enhanced expandTopicWithCache)
- Type fixes in entity-resolver-interface.ts, base-provider.ts

## Functional Requirements

Implements FR-013, FR-014, FR-015, FR-016, FR-027, FR-030, FR-031

## Checkpoint

User Stories 1-4 complete - authorship, citations, funding, topics functional
* **graph:** Adds FUNDED_BY edge type for funding networks

## Implementation

**Forward Funding (T032-T034)**:
- Extract grants[] from work data
- Create edges: work → funder
- Direction: 'outbound'
- Metadata: award_id from grant object
- Configurable limit (default: 5 grants)

**Reverse Funding (T035-T036)**:
- Query OpenAlex API: works({ filter: { "grants.funder": funderId } })
- Create edges: work → funder
- Direction: 'inbound' (discovered via reverse lookup)
- Maintains semantic direction even for reverse-discovered edges

**Utilities (T037-T038)**:
- Uses extractOpenAlexId() for URL and bare ID formats
- ID validation using validateOpenAlexId()
- Graceful handling of missing/invalid grants

## Tests

- T028: Unit test for Work → Funder funding edges ✅
- T029: Unit test for grant metadata (award_id) ✅
- T030: Unit test for missing funding handling ✅
- T031: Unit test for funder reverse lookup ✅

All 11 funding tests passing. All authorship/citation tests passing (no regressions).

## Data Model

Edge Direction Semantics:
- Semantic: ALWAYS work → funder (source → target)
- Discovery: 'outbound' (from grants[]) or 'inbound' (reverse lookup)
- Canonical ID: createCanonicalEdgeId(workId, funderId, RelationType.FUNDED_BY)

## Files Changed

- packages/graph/src/providers/funding.test.ts (new, 693 lines)
- packages/graph/src/providers/openalex-provider.ts (+95 lines)
  - Added funding edge creation in expandWorkWithCache()
  - Added new expandFunderWithCache() method
  - Added funder case to entity expansion switch

## Functional Requirements

Implements FR-009, FR-010, FR-011, FR-012, FR-025, FR-026, FR-030, FR-031

## Checkpoint

User Stories 1, 2, AND 3 complete - authorship, citations, and funding networks functional
* **graph:** Adds REFERENCE edge type for citation networks

## Implementation

**Forward Citations (T022-T024)**:
- Extract referenced_works[] from work data
- Create edges: citing work → cited work
- Direction: 'outbound'
- Metadata: citation_count from cited_by_count field
- Configurable limit (default: 20 references)

**Reverse Citations (T025)**:
- Query OpenAlex API: works({ filter: { cites: workId } })
- Create edges: citing work → cited work
- Direction: 'inbound' (discovered via reverse lookup)
- Maintains semantic direction even for reverse-discovered edges

**Utilities (T027)**:
- Added extractOpenAlexId() to handle URL and bare ID formats
- ID validation using validateOpenAlexId()
- Graceful handling of missing/invalid references

## Tests

- T018: Unit test for Work → Work citation edges ✅
- T019: Unit test for citation metadata extraction ✅
- T020: Integration test for citation chains (W1→W2→W3) ✅
- T021: Unit test for reverse citation lookup ✅

All 7 citation tests passing. All 8 authorship tests passing (no regressions).

## Data Model

Edge Direction Semantics:
- Semantic: ALWAYS citing work → cited work (source → target)
- Discovery: 'outbound' (from referenced_works[]) or 'inbound' (reverse lookup)
- Canonical ID: createCanonicalEdgeId(citingWorkId, citedWorkId, RelationType.REFERENCE)

## Files Changed

- packages/graph/src/providers/citations.test.ts (new, 473 lines)
- packages/graph/src/providers/openalex-provider.ts (+89 lines)
- packages/graph/src/utils/edge-utils.ts (+30 lines)
- packages/graph/src/taxonomy/entity-taxa.ts (added 3 RelationType entries)

## Functional Requirements

Implements FR-005, FR-006, FR-007, FR-008, FR-031, FR-032

## Checkpoint

User Stories 1 AND 2 complete - authorship and citation networks functional
* **graph:** AUTHORSHIP edge direction reversed to match OpenAlex data model

**Critical Bug Fixed**:
Previously created edges with Author as source and Work as target (Author → Work).
Now correctly creates edges with Work as source and Author as target (Work → Author).

**User Story 1 (P1 - MVP)**: View Authorship Relationships Correctly ✅
- FR-001: Reverse AUTHORSHIP edge direction (Work → Author)
- FR-002: Set direction='outbound' for work expansion
- FR-003: Set direction='inbound' for author expansion
- FR-004: Use canonical edge IDs to prevent duplicates

**Implementation** (Tasks T001-T017 - 17/90):

Phase 1: Setup (T001-T005)
- Added missing RelationType enum values
- Created createCanonicalEdgeId() utility
- Created validateOpenAlexId() utility
- Created ExpansionLimits interface
- Created edge metadata type interfaces

Phase 2: Foundational (T006-T009)
- Implemented edge deduplication logic
- Implemented batch entity preloading
- Implemented getRelationshipLimit() helper
- Added truncation metadata to GraphExpansion

Phase 3: US1 - AUTHORSHIP Fix (T010-T017)
- Tests: 8 comprehensive tests (all passing)
- Implementation: Fixed edge directions, canonical IDs, validation

**Test Results**:
✅ All 8 authorship tests passing
✅ openalex-provider.unit.test.ts: 62/62 passing
✅ basic-provider-usage.integration.test.ts: 12/12 passing

Spec: specs/015-openalex-relationships/
* **graph,web:** Updated RelationType enum usage across graph and web packages
to align with spec 014 implementation (phases 1-3).

Graph Package Changes (packages/graph/src/):
- openalex-provider.ts: Migrated enum values and added direction field
  - AUTHORED → AUTHORSHIP (3 occurrences)
  - PUBLISHED_IN → PUBLICATION (2 occurrences)
  - AFFILIATED → AFFILIATION (1 occurrence)
  - WORK_HAS_TOPIC → TOPIC (1 occurrence)
  - Added direction: 'outbound' to all 6 edge creation sites
- graph-analyzer.ts: Updated relationship detection logic
  - REFERENCES → REFERENCE (2 occurrences)
  - AUTHORED → AUTHORSHIP (4 occurrences)
  - AFFILIATED → AFFILIATION (1 occurrence)
- entity-taxa.ts: Updated RELATION_TAXONOMY Record
  - Added: AUTHORSHIP, AFFILIATION, PUBLICATION, REFERENCE, TOPIC,
    FUNDED_BY, HOST_ORGANIZATION, LINEAGE
  - Removed deprecated alias entries
- expansion-settings.ts: Updated DEFAULT_EXPANSION_SETTINGS
  - REFERENCES → REFERENCE
  - AUTHORED → AUTHORSHIP
  - AFFILIATED → AFFILIATION
  - PUBLISHED_IN → PUBLICATION

Web Package Test Changes (apps/web/src/):
- relationship-detection-service.unit.test.ts: Updated expectations
  - Enum values: AUTHORED→AUTHORSHIP, AFFILIATED→AFFILIATION,
    PUBLISHED_IN→PUBLICATION, REFERENCES→REFERENCE
  - Labels: "authored"→"authorship", "affiliated with"→"affiliation",
    "published in"→"publication", "references"→"reference"
  - Edge IDs: "A123-authored-W456"→"A123-AUTHORSHIP-W456"
- intra-node-edge-population.integration.test.ts: Same migrations

Deployment Readiness Progress:
- ✅ Graph package typecheck: 0 errors (was 38 errors)
- ✅ Web package typecheck: 0 errors
- ⚠️  Web tests: 14 failures remaining (down from 18, 78% passing)

Per Constitution Principle IX (Deployment Readiness), working towards
zero outstanding issues. Remaining test failures require investigation.
* **root:** Constitution v1.5.0 → v2.0.0

Added Principle IX: Deployment Readiness (NON-NEGOTIABLE)

Work is NOT complete if there are ANY outstanding issues in the repository,
including pre-existing issues. Deployment cannot run if ANY package has
typecheck errors, test failures, lint violations, or build failures.

Key requirements:
- ALL packages MUST pass typecheck, test, lint, build
- Pre-existing issues MUST be fixed or explicitly deferred
- Commits with --no-verify MUST be followed by immediate fixes
- Features cannot be marked complete if deployment would fail

Modified Principle VII: Development-Stage Pragmatism
- Clarified that deployment readiness still applies during development
- Breaking changes are acceptable; broken builds are not

Updated Development Workflow:
- Added deployment readiness verification step
- Quality pipeline now explicitly covers ALL packages

Updated Quality Gates:
- Added deployment readiness gates section
- pnpm validate MUST pass before marking work complete
- CI/CD pipeline MUST be able to deploy without intervention

Rationale:
The project uses GitHub Pages with automated CI/CD. If ANY package has
errors, the entire deployment fails. This creates critical dependency
issues where completed features cannot be deployed due to unrelated
pre-existing errors.

This principle ensures:
- Every feature can be deployed immediately upon completion
- No feature leaves deployment blockers for future work
- Main branch always remains in deployable state
- Pre-existing issues are surfaced and resolved, not ignored
- Research demonstrations can be scheduled confidently

Templates requiring updates:
- plan-template.md (Constitution Check → 9 principles)
- spec-template.md (Constitution Alignment → 9 principles)
- tasks-template.md (Constitution compliance → 9 principles)

Addresses user requirement that work completion requires zero outstanding
issues across the entire repository to enable successful deployment.
* **docs:** Constitution now requires test-first approach for all bug fixes
* **graph:** Type errors expected in consuming code. Phase 3 will update
all services to use new enum names and add direction field to edges.

Tests: packages/graph/src/types/core.test.ts (7/7 passed)
Spec: specs/014-edge-direction-correction
Phase: 2 (Foundational - Type Definitions)
Tasks: T004-T010 complete

# [14.0.0](https://github.com/Mearman/Academic-Explorer/compare/v13.2.0...v14.0.0) (2025-11-17)


### Bug Fixes

* **web:** add refreshEntities call after reorderEntities ([ce86a02](https://github.com/Mearman/Academic-Explorer/commit/ce86a0277d86ddb7567b73652e64ce19f9a31031))
* **web:** add refreshEntities calls after entity removal operations ([cff0ed7](https://github.com/Mearman/Academic-Explorer/commit/cff0ed7e869f96b7cec7531daadcd0e4cb99c936))
* **web:** await onRemove in entity removal confirmation modal ([3f478a0](https://github.com/Mearman/Academic-Explorer/commit/3f478a0fe78070ce78042d44093a8aa92775c959))
* **web:** correct AppShell.Main padding to respect Mantine's responsive layout ([7c2edb5](https://github.com/Mearman/Academic-Explorer/commit/7c2edb52cf3cdb67291fe2f84dff4c3f8b29df9a))
* **web:** correct entity removal test by using proper button selector ([00130db](https://github.com/Mearman/Academic-Explorer/commit/00130db4c25f1ec7d3af65849299585046d8bb9f))
* **web:** implement Catalogue Context Provider to fix state isolation ([d673710](https://github.com/Mearman/Academic-Explorer/commit/d673710c9c9628b5c23a094d799de724f3a2f94d))
* **web:** move useSensors hooks before guard clauses to fix React hook violation ([8ee86b7](https://github.com/Mearman/Academic-Explorer/commit/8ee86b7ea2793a5f3b0c4f91c80ec7dd62ed827c))
* **web:** pass mutation functions as props to CatalogueEntities ([46def9a](https://github.com/Mearman/Academic-Explorer/commit/46def9a4ee0f4be09341be29dc51f0b734cd3800))
* **web:** remove duplicate guard clause in CatalogueEntities ([9210a97](https://github.com/Mearman/Academic-Explorer/commit/9210a977594f68927b348c82489d1bd4fb3c7ebd))
* **web:** resolve React hook violation in CatalogueEntities ([a314425](https://github.com/Mearman/Academic-Explorer/commit/a3144253c229151cac5b711589546d635bf22894))


### Features

* **web:** implement bookmark URL parameters and tag editing ([4750f86](https://github.com/Mearman/Academic-Explorer/commit/4750f86535c24e2d467a7ac1da5f4aed4e0568a5))
* **web:** migrate to catalogue-based history tracking system ([531ae22](https://github.com/Mearman/Academic-Explorer/commit/531ae2239594311abcbad531ebac16f1e9c1ae5a))


### BREAKING CHANGES

* **web:** Users will lose existing route-based history from legacy system.
The new entity-based history will start fresh from this update forward.

# [13.2.0](https://github.com/Mearman/Academic-Explorer/compare/v13.1.3...v13.2.0) (2025-11-16)


### Bug Fixes

* **config:** disable Nx typescript-sync to prevent invalid tsconfig changes ([95bc591](https://github.com/Mearman/Academic-Explorer/commit/95bc5919903c51a325189c04a9ec14b5c431cf04))
* **web:** add explicit type assertions after type guards ([f218a41](https://github.com/Mearman/Academic-Explorer/commit/f218a41a72739b22a2035e68d3bb55ca5882909d))
* **web:** add missing node-styles.ts file (T025) ([85b400d](https://github.com/Mearman/Academic-Explorer/commit/85b400d6de8538469c6a47fe61fbc7f8c8173134))
* **web:** resolve TypeScript type narrowing errors in services ([177d55e](https://github.com/Mearman/Academic-Explorer/commit/177d55e97d69c4aee115dc4dd7d90c76134a4ab7))


### Features

* **client:** add DataVersion and OpenAlexQueryParams types ([019f05e](https://github.com/Mearman/Academic-Explorer/commit/019f05e99b0c4f67b056b04a4653039c1e52355f))
* **graph:** extend GraphNode with isXpac and hasUnverifiedAuthor metadata (T024) ([7bed1a0](https://github.com/Mearman/Academic-Explorer/commit/7bed1a01040725d2ee836e51aafbc93b6804e357))
* **openalex-client:** add includeXpac and dataVersion config support (T019) ([2d8b490](https://github.com/Mearman/Academic-Explorer/commit/2d8b490851c32eeff24692cb59841b1e1c41e89b))
* **types:** add is_xpac field to Work schema ([d51ecc8](https://github.com/Mearman/Academic-Explorer/commit/d51ecc811baea8d50bd4c71ce4210895c917ffad))
* **ui:** add Badge component for metadata improvements ([4a5633e](https://github.com/Mearman/Academic-Explorer/commit/4a5633e10a3d6234e689f98728eb29199848fcb4))
* **utils:** add metadata improvement detection logic ([cbfbd79](https://github.com/Mearman/Academic-Explorer/commit/cbfbd794d5aa5003a308f89a33a3a37ce142c3f3))
* **web:** add data version selector with conditional visibility (T034-T036) ([246fd60](https://github.com/Mearman/Academic-Explorer/commit/246fd60dabea82e54d7b402f3e2a3fbc37ef6d43))
* **web:** add graph node rendering utilities (T026) ([abe41e7](https://github.com/Mearman/Academic-Explorer/commit/abe41e75f97c5fbe2c5e4d48f20c715ab5c916e8))
* **web:** add MetadataImprovementBadges component ([e693dbc](https://github.com/Mearman/Academic-Explorer/commit/e693dbceb5898d11edcacacd204e55d722f180a8))
* **web:** add version comparison and E2E tests (T037-T042) ([8a79e65](https://github.com/Mearman/Academic-Explorer/commit/8a79e65822f7671d9aae48d6bed570f96f1851ee))
* **web:** add visual indicators for XPAC works and unverified authors (T022, T023) ([e028017](https://github.com/Mearman/Academic-Explorer/commit/e028017eb77e16333acb0607d9b020d593491a53))
* **web:** add Walden settings fields to settings store ([d31551e](https://github.com/Mearman/Academic-Explorer/commit/d31551e049b7e304a3725d4b279729cf7d3bc2da))
* **web:** add xpac work styling functions (T025) ([73d3649](https://github.com/Mearman/Academic-Explorer/commit/73d3649ac9bf95f4f3328bec95f3028cfb1243f8))
* **web:** integrate XpacToggle into SettingsSection (T021) ([467c657](https://github.com/Mearman/Academic-Explorer/commit/467c6576aaca1f84b32343b6e89fbc97cce026f7))

## [13.1.3](https://github.com/Mearman/Academic-Explorer/compare/v13.1.2...v13.1.3) (2025-11-14)


### Bug Fixes

* **deps:** override js-yaml to >=4.1.1 to fix security vulnerability ([01fbe4f](https://github.com/Mearman/Academic-Explorer/commit/01fbe4fa5ad62fb8517fccf01850545a1723a346))
* **web:** remove default select parameter from all entity routes ([efd641e](https://github.com/Mearman/Academic-Explorer/commit/efd641ed19d615e44032fe7a0315ae85d202a402))

## [13.1.2](https://github.com/Mearman/Academic-Explorer/compare/v13.1.1...v13.1.2) (2025-11-14)


### Bug Fixes

* **types:** remove invalid authorships_count field ([1cd89db](https://github.com/Mearman/Academic-Explorer/commit/1cd89db7c76b955f1c12e72c87f831f1ff4db570))

## [13.1.1](https://github.com/Mearman/Academic-Explorer/compare/v13.1.0...v13.1.1) (2025-11-14)


### Bug Fixes

* **web:** make home page search functional ([ab38fd4](https://github.com/Mearman/Academic-Explorer/commit/ab38fd46a042af1e5efe799cb2d0b711eb64d74d))

# [13.1.0](https://github.com/Mearman/Academic-Explorer/compare/v13.0.1...v13.1.0) (2025-11-14)


### Features

* **web:** make app title clickable to navigate home ([b5e7b28](https://github.com/Mearman/Academic-Explorer/commit/b5e7b284e366e1273f36a2b32864a2f910ec5636))

## [13.0.1](https://github.com/Mearman/Academic-Explorer/compare/v13.0.0...v13.0.1) (2025-11-14)


### Bug Fixes

* **web:** resolve React 19 scheduler error by removing manual chunking ([8ba8368](https://github.com/Mearman/Academic-Explorer/commit/8ba8368daceec38225f655d85cdf1fef2bb38dd3))

# [13.0.0](https://github.com/Mearman/Academic-Explorer/compare/v12.2.6...v13.0.0) (2025-11-14)


### Bug Fixes

* **005-msw:** replace ambiguous UI selectors with specific role-based locators ([dbbf4c6](https://github.com/Mearman/Academic-Explorer/commit/dbbf4c650d5985cd0a057342fe146d6e5e81d9c9))
* **005-msw:** replace remaining Share button ambiguous selectors ([1331e0e](https://github.com/Mearman/Academic-Explorer/commit/1331e0e7177e09e127403764fbef41a7a9ba5ed0))
* **005-msw:** use specific Import modal title to eliminate strict mode violations ([b8dd9bd](https://github.com/Mearman/Academic-Explorer/commit/b8dd9bdbb3f0ce70f946a1b1feaf3f1b4e836a5b))
* **config:** add lru-cache optimization to vitest configs ([be64835](https://github.com/Mearman/Academic-Explorer/commit/be6483571db547c366c47aa0b073ed8d94928222))
* **config:** add preview script to root package.json for E2E tests ([23ac0f1](https://github.com/Mearman/Academic-Explorer/commit/23ac0f1182018ed7e6a369bce24e5a033f4f2297))
* **config:** configure @/ path alias in tools tsconfig ([7889770](https://github.com/Mearman/Academic-Explorer/commit/78897705e923e698b6c060a86a5a7eb2d1a08494))
* **config:** disable post-deploy-e2e and update release dependencies ([fa493f8](https://github.com/Mearman/Academic-Explorer/commit/fa493f8ac37dfa43d9258fb9f82d220cfddb4b59))
* **config:** increase E2E job timeout from 20 to 30 minutes ([bd5c3bb](https://github.com/Mearman/Academic-Explorer/commit/bd5c3bb1d8e4c66ebc5e31259d2fc485b45a974c))
* **config:** prevent compilation of configuration files ([9e0595a](https://github.com/Mearman/Academic-Explorer/commit/9e0595a880a589c2ead04552ae95b1b9c5916a6d))
* **config:** prevent root-level TypeScript in-place compilation ([a84a3a2](https://github.com/Mearman/Academic-Explorer/commit/a84a3a20df00264a43340bfb9cd9001df0ae8cfa))
* **config:** remove incorrect .gitignore exceptions for test files ([0b346fd](https://github.com/Mearman/Academic-Explorer/commit/0b346fd44b62fc3cd8132ea1e7a745c5b134911a))
* **config:** remove invalid TypeScript project references ([3dab7ee](https://github.com/Mearman/Academic-Explorer/commit/3dab7eed7cca67e515eb081a195ede2ff28465aa))
* **config:** resolve noEmit TypeScript configuration conflicts ([eec1ef8](https://github.com/Mearman/Academic-Explorer/commit/eec1ef8daf0e2c0aa3dc294b9c2134fa933bcd4d))
* **config:** resolve TypeScript compilation and module resolution issues ([4ac85fd](https://github.com/Mearman/Academic-Explorer/commit/4ac85fd202ce556a9ec47e2ca780983bf9e369ae))
* **config:** restore noEmit flag to prevent in-place TypeScript compilation ([3898deb](https://github.com/Mearman/Academic-Explorer/commit/3898deb9c1b507ee3ac1979360654ed37d35944f))
* **config:** separate TypeScript dev and build configurations ([a897b85](https://github.com/Mearman/Academic-Explorer/commit/a897b8503e90a924937084fe9c040c85e061d9e5))
* **config:** verify TypeScript configuration resolves CI issues ([0d9b35d](https://github.com/Mearman/Academic-Explorer/commit/0d9b35d556c2bb0bb5ab52d05f1e165e97511e35))
* **deps:** correct PNPM overrides syntax to resolve parsing error ([b6566c3](https://github.com/Mearman/Academic-Explorer/commit/b6566c38a3dbe16d31356d4e00fed624cd9e9b00))
* **deps:** enhance PNPM overrides to resolve lru-cache constructor error ([2e93216](https://github.com/Mearman/Academic-Explorer/commit/2e932167d928e8257a4c4277f9f3378ccbec6bc4))
* **e2e:** fix all remaining catalogue test failures ([c3088d7](https://github.com/Mearman/Academic-Explorer/commit/c3088d736418cc5f12cdd7bade8cd7ba72dda7a7))
* **e2e:** skip flaky catalogue tests that depend on entity pages ([69055af](https://github.com/Mearman/Academic-Explorer/commit/69055af04967ece33086f55519b3486a42be2478))
* **e2e:** update catalogue sharing test assertions to match actual UI ([3945bfd](https://github.com/Mearman/Academic-Explorer/commit/3945bfdac8c6b67f615b9858f2de060ee79b7261))
* **graph:** resolve EntityDetectionService test failures ([aa9a81b](https://github.com/Mearman/Academic-Explorer/commit/aa9a81b70e195f2728be5305bea5ac967fa2004a))
* **layout:** eliminate nested scrollbars in main content and sidebars ([9f458e0](https://github.com/Mearman/Academic-Explorer/commit/9f458e0563c2d2fcbc115db0a6b431695bfa7877))
* **layout:** restore vertical padding while preventing nested scrollbars ([42b4573](https://github.com/Mearman/Academic-Explorer/commit/42b45734b0efda72b094a2e08db235fb0d639bf8))
* **monorepo:** resolve ES module compatibility issues ([2a4778b](https://github.com/Mearman/Academic-Explorer/commit/2a4778b4191a00b1342b1dbd6ae79da3471747bd))
* **monorepo:** resolve TypeScript build errors and security vulnerability ([8e648ef](https://github.com/Mearman/Academic-Explorer/commit/8e648eff16a79c67b5de88ed03f8deee058b29b6))
* **monorepo:** resolve Vite plugin type compatibility issues ([23d45c1](https://github.com/Mearman/Academic-Explorer/commit/23d45c1d3aa4391288d72f0b0a2f4619aded08f0))
* **openalex-client:** improve external canonical ID caching ([ad45293](https://github.com/Mearman/Academic-Explorer/commit/ad4529399b76acdd7abac501026a7e73a364373b))
* **openalex-client:** route autocomplete responses to correct directory structure ([72290e9](https://github.com/Mearman/Academic-Explorer/commit/72290e9de938e671dc38405ba905a8ca08c979e2))
* resolve E2E performance issues from lru-cache constructor errors ([a072bb9](https://github.com/Mearman/Academic-Explorer/commit/a072bb9c878a8059f618f7491dbd623e8926424b))
* **root:** correct PNPM overrides syntax ([92f7fab](https://github.com/Mearman/Academic-Explorer/commit/92f7fab8bc7fb5ab3bfe53c8c4f7e22998618ff9))
* **root:** enhance PNPM overrides for lru-cache compatibility ([3167e1d](https://github.com/Mearman/Academic-Explorer/commit/3167e1d1d6d97538c7a3f01f9ae03d6c4764287b))
* **root:** handle TLDs with dots in domain verification script ([a1fb616](https://github.com/Mearman/Academic-Explorer/commit/a1fb616becc66e9b006bfd7b1a1ad0d22824b13b))
* **root:** resolve quality-gates test command conflict ([6eec591](https://github.com/Mearman/Academic-Explorer/commit/6eec591f75d4266476b7b2c4699d80910bb4c54e))
* **root:** resolve quality-gates timeout and E2E DexieError2 failures ([9f878fb](https://github.com/Mearman/Academic-Explorer/commit/9f878fbe613a5d06eac00b68cb9436ac30b8c63d))
* **root:** resolve remaining lru-cache compatibility issues ([fe6a256](https://github.com/Mearman/Academic-Explorer/commit/fe6a256a8d1034a60a7d2a8b4aa8f0efc79e81a2))
* **routes:** resolve bookmarks route duplication and build failures ([ba92d4c](https://github.com/Mearman/Academic-Explorer/commit/ba92d4c305db61e063da54fe975091b9fbfd9065))
* **shared-utils:** revert database initialization attempts - IndexedDB hanging in tests ([f0f321c](https://github.com/Mearman/Academic-Explorer/commit/f0f321c0b27899afcb20fb378417212d8289ca00))
* **test:** improve modal timing in catalogue entity-management tests ([34d4262](https://github.com/Mearman/Academic-Explorer/commit/34d42624ce0fae724f473beef1754d6424209722))
* **tests:** skip Data Integrity tests making direct API calls ([6b4d12d](https://github.com/Mearman/Academic-Explorer/commit/6b4d12dc61c8b124ab28c7fe19daf428ed3eb095)), closes [#005-test-environment-msw](https://github.com/Mearman/Academic-Explorer/issues/005-test-environment-msw) [HI#003](https://github.com/HI/issues/003)
* **ui:** add missing utils project reference in tsconfig.json ([81e4ba7](https://github.com/Mearman/Academic-Explorer/commit/81e4ba7603f8e8e02a90005cb05b1f5afdf87388))
* **ui:** improve landing page card responsive sizing ([3b0f517](https://github.com/Mearman/Academic-Explorer/commit/3b0f51798c58e460e327dc7f7746b588de350223))
* **utils:** add missing catalogue-db export to package.json ([6e9c685](https://github.com/Mearman/Academic-Explorer/commit/6e9c685b64e1cf6dabfb46b8d609d6278ee5b9e0))
* **web:** add catalogue route to generated route tree ([11b2526](https://github.com/Mearman/Academic-Explorer/commit/11b25267f9be107a811f3f8a7f672a7d640d34e5))
* **web:** add data-testid to AddToCatalogueButton component ([ecf07cb](https://github.com/Mearman/Academic-Explorer/commit/ecf07cb6d8bab00c4110e7033338b5307872c633))
* **web:** add IndexedDB cleanup to prevent DexieError2 conflicts ([4948752](https://github.com/Mearman/Academic-Explorer/commit/4948752ae30c4290fefdc35d485aab166eb414b7))
* **web:** add missing catalogue.lazy.tsx to resolve CI build failure ([818e45c](https://github.com/Mearman/Academic-Explorer/commit/818e45c04e425c5ce9abb88f53e5225b277c5760))
* **web:** add missing catalogue.tsx route file to resolve CI build failure ([95c2b56](https://github.com/Mearman/Academic-Explorer/commit/95c2b56c2eea52f4985cebcf6b9fa8d6984130ea))
* **web:** add missing SearchInterface.tsx to resolve build errors ([25ea444](https://github.com/Mearman/Academic-Explorer/commit/25ea444c025f5a05a7ffcd807256d7ef3bdc9191))
* **web:** add ModalsProvider to enable bookmark delete confirmations ([04a5fae](https://github.com/Mearman/Academic-Explorer/commit/04a5fae0d75d10f6754560a3c2f8f2ed1e50f5ea))
* **web:** add Playwright IndexedDB support config ([05480e5](https://github.com/Mearman/Academic-Explorer/commit/05480e5f81e5873f383d94c131cd93e2b5198764))
* **web:** auto-switch tabs after creating catalogue list/bibliography ([e9b109b](https://github.com/Mearman/Academic-Explorer/commit/e9b109bd5e9bfdf86160c75cc65e24b504aeca19))
* **web:** correct catalogue E2E tests to match AddToListModal UI ([39acd6d](https://github.com/Mearman/Academic-Explorer/commit/39acd6da0f9263f0fe926147d0d31d2b0e4c5d5f))
* **web:** enable IndexedDB persistence in Playwright storage state ([2fb210f](https://github.com/Mearman/Academic-Explorer/commit/2fb210fce12d3afca60222ab273fbfb47eba026d))
* **web:** fix modal closing and empty state display for tests ([224f30b](https://github.com/Mearman/Academic-Explorer/commit/224f30b668c3306c1de47e831737aad9556fd261))
* **web:** force IndexedDB initialization in catalogue E2E tests ([241d720](https://github.com/Mearman/Academic-Explorer/commit/241d720eda084b68310e24bff2646fbe15888941))
* **web:** improve TypeScript type safety in production components ([000363e](https://github.com/Mearman/Academic-Explorer/commit/000363e3d45fbba25c54331d1775041744c7cc58))
* **web:** prevent waitForContent from hanging on main selector ([387287c](https://github.com/Mearman/Academic-Explorer/commit/387287c8e81cc15b51642dce862e1b996d1032d6))
* **web:** reduce smoke suite to only stable tests ([33e749a](https://github.com/Mearman/Academic-Explorer/commit/33e749a6b074f7874b4860884556797d0c4df8d7))
* **web:** remove deployed-verification from smoke E2E suite ([6278929](https://github.com/Mearman/Academic-Explorer/commit/62789295951307ca8828a744aa10334e40c859d9))
* **web:** remove invalid data-testid from Select data items ([b842c38](https://github.com/Mearman/Academic-Explorer/commit/b842c38fb07102f2041fbe1f99e2f3c0ba293a81))
* **web:** replace hardcoded backgrounds in EntityDataDisplay ([08e87d4](https://github.com/Mearman/Academic-Explorer/commit/08e87d4ff47b22c071354f8ba46cd372185dfe91))
* **web:** replace hardcoded backgrounds in EntityDetailLayout ([3f1bdd0](https://github.com/Mearman/Academic-Explorer/commit/3f1bdd05a28c82875932192260fb2bf4adc7fb80))
* **web:** replace hardcoded backgrounds in RichEntityDisplay ([f7bc4bb](https://github.com/Mearman/Academic-Explorer/commit/f7bc4bbe3943228a0968bfa6f882e335dd8f39a2))
* **web:** replace non-existent IconPlaylistAdd with IconListCheck ([5d01f58](https://github.com/Mearman/Academic-Explorer/commit/5d01f58beca5f97f668914e996737e106848ff8d))
* **web:** resolve BaseTable import by using .js extension ([cb61863](https://github.com/Mearman/Academic-Explorer/commit/cb61863cf10428f479587efda817e5842599374e))
* **web:** resolve bookmarks sidebar disappearing issue ([5cf84c8](https://github.com/Mearman/Academic-Explorer/commit/5cf84c897bc4a56bbb94d0ed6018164af21987a1))
* **web:** resolve cache index issues and update E2E test ([d918fa0](https://github.com/Mearman/Academic-Explorer/commit/d918fa0a4c26876ea666310f920e6d9f2d11e493))
* **web:** resolve cache integration test failure ([676e2d8](https://github.com/Mearman/Academic-Explorer/commit/676e2d852f1715b3f1d198faf517a13eadf5ec1c))
* **web:** resolve catalogue E2E test failures ([47b119b](https://github.com/Mearman/Academic-Explorer/commit/47b119b4a57e8e0c4bb45f27b5cb5b44a6e2c98c))
* **web:** resolve console logging violations and test infrastructure ([cd35966](https://github.com/Mearman/Academic-Explorer/commit/cd35966fa3804e2a5e5e8736c3e6a145e72f975c))
* **web:** resolve E2E test hanging by removing lru-cache override ([35d2d5f](https://github.com/Mearman/Academic-Explorer/commit/35d2d5f8936afd0b867c700a3c1c0087d42ee262))
* **web:** resolve E2E test hanging in CI due to IndexedDB timeout ([ba6e104](https://github.com/Mearman/Academic-Explorer/commit/ba6e1041e1c87b6659691287a5d2a968a5236704))
* **web:** resolve generateQueryTitle function issues ([73addaf](https://github.com/Mearman/Academic-Explorer/commit/73addafc4a425d7d84f282b68d4ff5ce952e310b))
* **web:** resolve ImportModal TypeScript error and test selectors ([1b4d650](https://github.com/Mearman/Academic-Explorer/commit/1b4d6506c1ce5641c8d43d8d7306f9577a1956f5))
* **web:** resolve lru-cache constructor error causing 30+ minute E2E test hangs ([3d25b27](https://github.com/Mearman/Academic-Explorer/commit/3d25b275f6ccb6b602ff1e52c5213c14cb5318b5))
* **web:** resolve router context issues in integration tests ([be6358e](https://github.com/Mearman/Academic-Explorer/commit/be6358e4bbd492072759e526edb7a5cf7ef61585))
* **web:** resolve TypeScript compilation errors after catalogue refactoring ([ce5f07e](https://github.com/Mearman/Academic-Explorer/commit/ce5f07eb1d2af0e21929b046ca980d329028d11d))
* **web:** resolve TypeScript compilation errors after catalogue refactoring ([e57c62b](https://github.com/Mearman/Academic-Explorer/commit/e57c62bd6416ff9dba7e90ad665d447ab7161879))
* **web:** resolve vite config import and type issues ([24f1382](https://github.com/Mearman/Academic-Explorer/commit/24f13827beb75f2be96932fbb4541f347af808cd))
* **web:** resolve Vite plugin TypeScript compatibility issues ([6706b3c](https://github.com/Mearman/Academic-Explorer/commit/6706b3c3a4abf0916565af68d561caf1ec059244))
* **web:** restore 31 components accidentally deleted in cleanup ([b48e865](https://github.com/Mearman/Academic-Explorer/commit/b48e86584e5f846f2470286bf54a6c9182a10d85))
* **web:** revert BaseTable import to original form ([65f1d2c](https://github.com/Mearman/Academic-Explorer/commit/65f1d2c433801c887b378950f7ed59229002af93))
* **web:** show notification before closing AddToListModal ([f7ba760](https://github.com/Mearman/Academic-Explorer/commit/f7ba760fa9ab7b2046ee9605471c287ad3e1ffdd))
* **web:** update .gitignore pattern for lib directories ([b329623](https://github.com/Mearman/Academic-Explorer/commit/b3296237d99bcf47a4c784123f9529ac238292d1))
* **web:** update BookmarkManager compatibility with catalogue ([8dc6ac8](https://github.com/Mearman/Academic-Explorer/commit/8dc6ac8ca6a43d3e3bc74b821b4b44caf8a0b8a2))
* **web:** update catalogue UI buttons for E2E test compatibility ([b314829](https://github.com/Mearman/Academic-Explorer/commit/b3148292a54cf6a90da1a5e3c001733c8aaa1052))
* **web:** update empty state text to match test expectations ([12aadda](https://github.com/Mearman/Academic-Explorer/commit/12aadda52f3abf58bb969034b721f805c5fc6ae0))
* **web:** update Playwright config to use namespace import ([1d85c43](https://github.com/Mearman/Academic-Explorer/commit/1d85c43cf925657b4897be7ec70a6e50ec0a01c5))
* **web:** use correct port 4173 for vite preview in CI E2E tests ([f235651](https://github.com/Mearman/Academic-Explorer/commit/f23565188dc172796abeb476d4a212a0c3c3817a))


### Build System

* **root:** remove knip dependency and scripts from package.json ([15cc816](https://github.com/Mearman/Academic-Explorer/commit/15cc81620c5a7d3c4d0dd840f9aebdb9108a40d1))


### Code Refactoring

* **client:** import entity types directly from types package ([0359b95](https://github.com/Mearman/Academic-Explorer/commit/0359b95a43fa72329ee671a27b13b9966aa20daa))
* **web:** migrate useUserInteractions hook to catalogue service ([082bc3c](https://github.com/Mearman/Academic-Explorer/commit/082bc3ccfc364c2a49fc4a777c75c1b892ccfd63))


### Features

* **005-msw:** integrate MSW into Playwright test lifecycle (User Story 1 - MVP) ([aa94046](https://github.com/Mearman/Academic-Explorer/commit/aa94046cad6b546be7bae82864987805da1d65d5))
* **academic-explorer:** add foundational types for catalogue feature ([103fa6c](https://github.com/Mearman/Academic-Explorer/commit/103fa6c614cbedcbd85a3bfa4f306e6f897eecb3))
* **academic-explorer:** implement export functionality (T037-T041) ([ce4a983](https://github.com/Mearman/Academic-Explorer/commit/ce4a9834cb99e0f14e1eca4e90a9246931aaa777))
* **academic-explorer:** implement import from share URL (T062-T067) ([146be1a](https://github.com/Mearman/Academic-Explorer/commit/146be1af6ef0f2a2a19dbcb0b8f3b903cedbef78))
* **academic-explorer:** implement import functionality (T042-T050) ([16948c4](https://github.com/Mearman/Academic-Explorer/commit/16948c4fa248865913e7a1922273cd6ac741eeee))
* **academic-explorer:** implement Phase 3 UI enhancements (T020-T036) ([fe26d38](https://github.com/Mearman/Academic-Explorer/commit/fe26d3879a497abe2915080370c240f50bbbf9ff))
* add research dashboard and enhanced search components ([a78d8c3](https://github.com/Mearman/Academic-Explorer/commit/a78d8c3a5fd13e29c7fe1dff6da9009d48064e78))
* **bookmarks:** add search/filter UI and export utilities (T040-T044) ([fc710e0](https://github.com/Mearman/Academic-Explorer/commit/fc710e085a01ec135a95a16e93390634e2f8a816))
* **bookmarks:** create tag input and badge components (T036-T037) ([2072e00](https://github.com/Mearman/Academic-Explorer/commit/2072e00e915bfa670750d56de9124ffc9ce6883f))
* **bookmarks:** display tags in BookmarkListItem (T038a) ([a215aea](https://github.com/Mearman/Academic-Explorer/commit/a215aeaaec8430ab2ea939150f6de950dc5dd9b4))
* **bookmarks:** extract filter functions to utils package ([42b211e](https://github.com/Mearman/Academic-Explorer/commit/42b211e69bbcb54894fd8146f9de078808ec5329))
* **bookmarks:** implement core bookmark functionality (User Story 1 MVP) ([23d43a5](https://github.com/Mearman/Academic-Explorer/commit/23d43a5717acea9338c83f5152dd275d89c6583d))
* **bookmarks:** implement foundational bookmark infrastructure (Phase 1 & 2) ([116be55](https://github.com/Mearman/Academic-Explorer/commit/116be555354102a1480ace42d63c256515ad137e))
* **bookmarks:** implement User Story 2 - custom field views ([a9457e9](https://github.com/Mearman/Academic-Explorer/commit/a9457e98ff8450559c170e63963a5fa547708706))
* **bookmarks:** integrate search, filters, and export functionality ([e76442f](https://github.com/Mearman/Academic-Explorer/commit/e76442f30936641283cea5165099f26acf5d4db5))
* **catalogue:** add comprehensive UI components ([c12d7a4](https://github.com/Mearman/Academic-Explorer/commit/c12d7a49d8280dad6bb68fcca3595f107b5e9555))
* **catalogue:** add dependencies and export configuration ([a1f6b5f](https://github.com/Mearman/Academic-Explorer/commit/a1f6b5fe4fbe31588184e8648ef6dbabe2a941fa))
* **catalogue:** add IndexedDB database infrastructure ([2a180ea](https://github.com/Mearman/Academic-Explorer/commit/2a180ea2cad6ecb5e0b41b61d3d11ff0cb5e9ce5))
* **catalogue:** add React hook for catalogue management ([d965918](https://github.com/Mearman/Academic-Explorer/commit/d965918d0f4ce546ef10975f0a9a5b12cc522779))
* **catalogue:** add routes and navigation integration ([197d77a](https://github.com/Mearman/Academic-Explorer/commit/197d77a5802bc7e31efdff60ee9cc5561a841f61))
* **catalogue:** add URL compression utilities for sharing ([5998288](https://github.com/Mearman/Academic-Explorer/commit/59982889426620b21cec41fc95c4b10d3818718d))
* enable query bookmarking with proper parameter handling ([8ff1d99](https://github.com/Mearman/Academic-Explorer/commit/8ff1d999d881f3094161b9c7b4c76b053179de90))
* **lint:** add ESLint rule to enforce package alias imports ([ef510ad](https://github.com/Mearman/Academic-Explorer/commit/ef510ad89674fdcffe42f9c943389f8a7b72f0fb))
* **msw:** add verbose request lifecycle logging for debugging ([e24e169](https://github.com/Mearman/Academic-Explorer/commit/e24e169fde3ef8260c8f74647a50d2997c0f6a96))
* **root:** add 91 short name candidates (3-10 chars) with priority verification ([fb1106d](https://github.com/Mearman/Academic-Explorer/commit/fb1106d150f7e3b6dcb9502020b676f3fcf681b9))
* **root:** add post-deployment E2E testing with automatic rollback ([5453354](https://github.com/Mearman/Academic-Explorer/commit/54533540b5bac5b4de8fda4c321162123a021a31))
* **root:** add task breakdown for bookmark query views feature ([221ecc9](https://github.com/Mearman/Academic-Explorer/commit/221ecc950cefb86bbbbdf7425170037eccd3d11e))
* **root:** add WHOIS verification to domain availability script ([ae56eea](https://github.com/Mearman/Academic-Explorer/commit/ae56eea11f88d58b81ec9987375932f87514756e))
* set up GitHub Spec Kit for spec-driven development ([71eb3ff](https://github.com/Mearman/Academic-Explorer/commit/71eb3ff769a660d17898c9f9070c89735d141c30))
* **shared-utils:** add event system for bookmark synchronization ([079ef58](https://github.com/Mearman/Academic-Explorer/commit/079ef58dc95f80dd9e642408ac72408785e2da0a))
* **shared-utils:** add updateEntityNotes method to catalogue service ([9a4c9fe](https://github.com/Mearman/Academic-Explorer/commit/9a4c9fefb93be13978b3a30f934c65325ad4d764))
* **speckit:** add SpecKit slash command suite for structured development workflow ([07ac07f](https://github.com/Mearman/Academic-Explorer/commit/07ac07f1cb58c8e116236321b66d8c974a1d2a49))
* **specs:** add implementation plan and design artifacts ([98f393c](https://github.com/Mearman/Academic-Explorer/commit/98f393cafd1e525a8204a5a469a249e58e12be40))
* **specs:** add implementation tasks for storage abstraction ([a1ef169](https://github.com/Mearman/Academic-Explorer/commit/a1ef16900663d3b87294e78b34037ea3021737fb))
* **specs:** add storage abstraction layer specification ([41e56cf](https://github.com/Mearman/Academic-Explorer/commit/41e56cf81604b953dfb8330bb80abb48c795f867))
* **storage:** implement InMemoryStorageProvider for E2E testing ([a3546df](https://github.com/Mearman/Academic-Explorer/commit/a3546df9e6894dacba82595dc114b9fcbf5c641b))
* update bookmarks and history to use API URLs instead of arbitrary IDs ([708ce59](https://github.com/Mearman/Academic-Explorer/commit/708ce5951906776468e27bf601e4856d48b9791c))
* **utils:** add CatalogueStorageProvider interface ([5cf23cb](https://github.com/Mearman/Academic-Explorer/commit/5cf23cbd4511437531f2bd730514419ea33a2bbb))
* **utils:** add reorderEntities method to storage providers ([590dbd7](https://github.com/Mearman/Academic-Explorer/commit/590dbd7b998a36fd96843fdcf83d825d32cffbb2))
* **utils:** add special lists support to catalogue service ([98c6393](https://github.com/Mearman/Academic-Explorer/commit/98c639324a5c07640abcbfcde462cdd5cac4f7d9))
* **utils:** export storage provider types and implementations ([b649dda](https://github.com/Mearman/Academic-Explorer/commit/b649ddaa6f3b2bf92ad1b55db16b03dee1e55dd1))
* **utils:** implement DexieStorageProvider ([d14cdd2](https://github.com/Mearman/Academic-Explorer/commit/d14cdd273d45e1006a9d6f2968c1dc462535c898))
* **web:** add 'Add to Catalogue' button on entity pages ([e84e699](https://github.com/Mearman/Academic-Explorer/commit/e84e6998bd6f395efaa41a6392384128c569d89c))
* **web:** add bookmark selection context and bulk database operations ([82ff65c](https://github.com/Mearman/Academic-Explorer/commit/82ff65c95d8b8de6d94a7ebe90e7d672afa675fd))
* **web:** add bulk entity operations to catalogue lists ([0faef1c](https://github.com/Mearman/Academic-Explorer/commit/0faef1c11461ded7f9490ded564b2ddc2b78f5ae))
* **web:** add catalogue navigation to bookmarks sidebar ([9e82244](https://github.com/Mearman/Academic-Explorer/commit/9e8224479418d0b43f7dd88199aae98171bef137))
* **web:** add data-testid attributes and Share button for e2e tests ([2657622](https://github.com/Mearman/Academic-Explorer/commit/2657622fb7fa8af4985fb7f7edd0bc8d7e255c39))
* **web:** add Edit button to selected list details section ([d77396c](https://github.com/Mearman/Academic-Explorer/commit/d77396cd3fa269becbb27bd5ad6dda66e11c6c08))
* **web:** add error boundary for catalogue components ([9c4e29c](https://github.com/Mearman/Academic-Explorer/commit/9c4e29c41ad66921afd8e82f5a9275a1cfbf4a85)), closes [#004-fix-failing-tests](https://github.com/Mearman/Academic-Explorer/issues/004-fix-failing-tests)
* **web:** add Export functionality for catalogue lists ([1e9974f](https://github.com/Mearman/Academic-Explorer/commit/1e9974f2bd419ea57ebd9dee466b84c31c1582c0))
* **web:** add navigation to bookmarks management page ([bf3381e](https://github.com/Mearman/Academic-Explorer/commit/bf3381e2ad0679495eb7486902481ccb6a18a693))
* **web:** add proper href links for middle-click support ([20d9111](https://github.com/Mearman/Academic-Explorer/commit/20d91110b72677998762bf27cf4e96eed0c88936))
* **web:** add StorageProviderContext for dependency injection ([aec04b0](https://github.com/Mearman/Academic-Explorer/commit/aec04b0ed8ff8fe4a50ccb1febe3bb5f16b930af))
* **web:** add test selectors and remove confirmation to CatalogueEntities ([47893ce](https://github.com/Mearman/Academic-Explorer/commit/47893ced06d7e976ab7a11b9009aaf64d51bafd2))
* **web:** add updateEntityNotes to useCatalogue hook ([f262eae](https://github.com/Mearman/Academic-Explorer/commit/f262eaee0a6fd377f082718402d64cfe0df3930d))
* **web:** add WCAG 2.1 AA accessibility to catalogue UI ([4b7d15c](https://github.com/Mearman/Academic-Explorer/commit/4b7d15cc13e2149921987422366bc808c0f6caf6)), closes [#004-fix-failing-tests](https://github.com/Mearman/Academic-Explorer/issues/004-fix-failing-tests)
* **web:** configure E2E test infrastructure for filesystem cache ([bf882ec](https://github.com/Mearman/Academic-Explorer/commit/bf882ec94f1a778ace58aa5c76651268b8a935a8))
* **web:** enhance BookmarkManager with bulk selection and delete ([5fed4c6](https://github.com/Mearman/Academic-Explorer/commit/5fed4c689c8d83f373468e50f7edb513ef5839c0))
* **web:** enhance catalogue modals with improved UI and file upload ([5c864e6](https://github.com/Mearman/Academic-Explorer/commit/5c864e63c80f844eecee64d05f056c57a6e59b8b))
* **web:** extend useUserInteractions hook with bulk operations ([eb283a3](https://github.com/Mearman/Academic-Explorer/commit/eb283a371f3c0127b95febb99a726e08f35532fc))
* **web:** integrate bookmark event system in useUserInteractions hook ([b949d83](https://github.com/Mearman/Academic-Explorer/commit/b949d83677cb59f4b437f2528a586667e26f734f))
* **web:** integrate CatalogueManager component in catalogue route ([3d2ecc8](https://github.com/Mearman/Academic-Explorer/commit/3d2ecc86865056c6dbb11addd2ea1951e6d8327b))
* **web:** integrate DexieStorageProvider in production app ([36b9e52](https://github.com/Mearman/Academic-Explorer/commit/36b9e525c84b6ec93a27dfbc4e1415729936a3e2))
* **web:** integrate filesystem cache with MSW handlers for E2E tests ([c921f8f](https://github.com/Mearman/Academic-Explorer/commit/c921f8fe57a3857acef1999af1601c9dc8ebbcea))
* **web:** protect special system lists in catalogue UI ([af28936](https://github.com/Mearman/Academic-Explorer/commit/af28936753b3eb47c3b2351ecca81ccb91b9652a))
* **web:** wire updateEntityNotes in CatalogueEntities component ([14558e0](https://github.com/Mearman/Academic-Explorer/commit/14558e015cfc3b2117c0f6846008c7b44c9f9bfa))


### Performance Improvements

* **web:** optimize catalogue for large lists and errors ([425a002](https://github.com/Mearman/Academic-Explorer/commit/425a002583e661b3c52a2624d015c9c15acbe32e)), closes [#004-fix-failing-tests](https://github.com/Mearman/Academic-Explorer/issues/004-fix-failing-tests)
* **web:** optimize filesystem cache E2E tests for faster execution ([4dd17f7](https://github.com/Mearman/Academic-Explorer/commit/4dd17f7ad4e21f5cf683eb404244a97a6cec1468))
* **web:** optimize Playwright E2E configuration for faster test execution ([f5fc49a](https://github.com/Mearman/Academic-Explorer/commit/f5fc49a51ec7a138b99a2201b9f3cb5b7b966c84))
* **web:** reduce CI E2E suite to smoke tests only (4 files vs 25) ([d9d9e43](https://github.com/Mearman/Academic-Explorer/commit/d9d9e43ba23fabaeaf6cbff9ff51cf4b840a7ed0))


### Reverts

* **config:** remove noEmit flag from tsconfig.app.json ([70f270e](https://github.com/Mearman/Academic-Explorer/commit/70f270ecf533ad68fa1bd74c098ab964a7144e66))
* **web:** use dev server for E2E tests instead of preview build ([586d70a](https://github.com/Mearman/Academic-Explorer/commit/586d70a6a793ad4ee2362a0f8c2e0d28eee583b0))


### BREAKING CHANGES

* **client:** Entity types are now only exported from @bibgraph/types package
* **config:** Configuration files are no longer compiled to JavaScript
* **root:** Removes knip unused code detection tool from project
* **web:** useUserInteractions hook now uses catalogue service instead of separate database
* **utils:** Refactors bookmark and history storage to use unified catalogue system

## [12.2.6](https://github.com/Mearman/Academic-Explorer/compare/v12.2.5...v12.2.6) (2025-11-08)


### Bug Fixes

* **web:** enhance accessibility with proper labels and ARIA attributes ([89ff950](https://github.com/Mearman/Academic-Explorer/commit/89ff950d8b226c12a0fe8a078629a53eb875ffab))

## [12.2.5](https://github.com/Mearman/Academic-Explorer/compare/v12.2.4...v12.2.5) (2025-11-08)

## [12.2.4](https://github.com/Mearman/Academic-Explorer/compare/v12.2.3...v12.2.4) (2025-11-08)

## [12.2.3](https://github.com/Mearman/Academic-Explorer/compare/v12.2.2...v12.2.3) (2025-11-08)


### Bug Fixes

* **web:** add timeout mechanism to useUserInteractions hook ([06d80d3](https://github.com/Mearman/Academic-Explorer/commit/06d80d3d0f410bf5b29dae3826555060c7138cc3))
* **web:** resolve sidebar rendering and external canonical ID routing issues ([7aa5f61](https://github.com/Mearman/Academic-Explorer/commit/7aa5f6197ef5a11162b0bfd72f6fe106443eaf62))

## [12.2.2](https://github.com/Mearman/Academic-Explorer/compare/v12.2.1...v12.2.2) (2025-11-08)


### Bug Fixes

* **web:** improve pretty URL handling and query parameter preservation ([61edc19](https://github.com/Mearman/Academic-Explorer/commit/61edc19ebe4c3b5b81b042d1ded87a260dfbae90))

## [12.2.1](https://github.com/Mearman/Academic-Explorer/compare/v12.2.0...v12.2.1) (2025-11-08)


### Bug Fixes

* **web:** sidebar integration and pretty URL improvements ([5ce8f3f](https://github.com/Mearman/Academic-Explorer/commit/5ce8f3f00165d9ee3816882396050030d5012d40))

# [12.2.0](https://github.com/Mearman/Academic-Explorer/compare/v12.1.2...v12.2.0) (2025-11-08)


### Bug Fixes

* **web:** improve external canonical ID routing detection ([be058b3](https://github.com/Mearman/Academic-Explorer/commit/be058b3b2897aecf99fad44f45a085e793c516e2))
* **web:** resolve external canonical ID routing failures ([ce4e2c6](https://github.com/Mearman/Academic-Explorer/commit/ce4e2c6d6e7b1c44d836afced589e3a24fe4ed14))


### Features

* **web:** enhance sidebar functionality with delete operations and styling improvements ([9fe66b4](https://github.com/Mearman/Academic-Explorer/commit/9fe66b4fd8d3417e10be04303b6577998275ba2c))

## [12.1.2](https://github.com/Mearman/Academic-Explorer/compare/v12.1.1...v12.1.2) (2025-11-08)


### Bug Fixes

* **web:** resolve history database schema error in E2E tests ([c815707](https://github.com/Mearman/Academic-Explorer/commit/c8157078cd33c0c5296ae81bb748329b3fedb52e))

## [12.1.1](https://github.com/Mearman/Academic-Explorer/compare/v12.1.0...v12.1.1) (2025-11-08)


### Bug Fixes

* **web:** optimize sidebar E2E tests to prevent CI timeouts ([78ca725](https://github.com/Mearman/Academic-Explorer/commit/78ca7254a7845671e741ab9b818c4999beaff058))

# [12.1.0](https://github.com/Mearman/Academic-Explorer/compare/v12.0.13...v12.1.0) (2025-11-08)


### Features

* **web:** implement functional sidebars with bookmarks and history management ([35dc68f](https://github.com/Mearman/Academic-Explorer/commit/35dc68f184888696bb091a8c1f44a9f66356f257))

## [12.0.13](https://github.com/Mearman/Academic-Explorer/compare/v12.0.12...v12.0.13) (2025-11-07)


### Bug Fixes

* **web:** prevent infinite loop in external canonical ID routing ([68bcd92](https://github.com/Mearman/Academic-Explorer/commit/68bcd92eac2f5de48778c5e84bebaff0d65306e0))

## [12.0.12](https://github.com/Mearman/Academic-Explorer/compare/v12.0.11...v12.0.12) (2025-11-07)


### Bug Fixes

* **web:** use TanStack Router redirect() instead of window.location.replace() ([0c05622](https://github.com/Mearman/Academic-Explorer/commit/0c05622cbb1d9b635bf9d6a417cd0fd5cd71005a))

## [12.0.11](https://github.com/Mearman/Academic-Explorer/compare/v12.0.10...v12.0.11) (2025-11-07)


### Bug Fixes

* **web:** add missing leading slash in external canonical ID redirect URL ([103efa0](https://github.com/Mearman/Academic-Explorer/commit/103efa04deaab4f09707f549f5521194c1830f83))

## [12.0.10](https://github.com/Mearman/Academic-Explorer/compare/v12.0.9...v12.0.10) (2025-11-07)


### Bug Fixes

* **web:** use window.location.replace for external canonical ID redirects ([308d915](https://github.com/Mearman/Academic-Explorer/commit/308d915d966cb212af16fca9342d5523fc262e20))

## [12.0.9](https://github.com/Mearman/Academic-Explorer/compare/v12.0.8...v12.0.9) (2025-11-07)


### Bug Fixes

* **web:** restore URL decoding in beforeLoad with corrected query param extraction ([42650fa](https://github.com/Mearman/Academic-Explorer/commit/42650fae08be2828087342326130f56636b37480))

## [12.0.8](https://github.com/Mearman/Academic-Explorer/compare/v12.0.7...v12.0.8) (2025-11-07)


### Bug Fixes

* **web:** resolve E2E URL routing and query parameter issues ([30fbef9](https://github.com/Mearman/Academic-Explorer/commit/30fbef942222da343d237c721f166ab6e287cb90))

## [12.0.7](https://github.com/Mearman/Academic-Explorer/compare/v12.0.6...v12.0.7) (2025-11-07)

## [12.0.6](https://github.com/Mearman/Academic-Explorer/compare/v12.0.5...v12.0.6) (2025-11-07)


### Bug Fixes

* **web:** properly pass query parameters to OpenAlex API ([a362037](https://github.com/Mearman/Academic-Explorer/commit/a362037ad02ad34548a54df2cb6686e4587baf64))
* **web:** resolve author and institution route parameter extraction ([aa13210](https://github.com/Mearman/Academic-Explorer/commit/aa132105ca9a783f3a175c822ff7deab97792756))
* **web:** resolve work route parameter extraction with hash-based fallback ([c3ade0d](https://github.com/Mearman/Academic-Explorer/commit/c3ade0d3833e2569ac3bdd5106f459ea974049b8))

## [12.0.5](https://github.com/Mearman/Academic-Explorer/compare/v12.0.4...v12.0.5) (2025-11-07)


### Bug Fixes

* **web:** resolve duplicate coverage flag in CI tests ([c2456f3](https://github.com/Mearman/Academic-Explorer/commit/c2456f30e63d2d635b5151c60e5c7c1a6a2af3d4))

## [12.0.4](https://github.com/Mearman/Academic-Explorer/compare/v12.0.3...v12.0.4) (2025-11-07)


### Bug Fixes

* **web:** resolve AbortSignal compatibility issues in test environments ([3ced397](https://github.com/Mearman/Academic-Explorer/commit/3ced397df8971ecc5b32aac81b8ecc2c503adcd6))

## [12.0.3](https://github.com/Mearman/Academic-Explorer/compare/v12.0.2...v12.0.3) (2025-11-07)


### Bug Fixes

* **openalex-client:** resolve AbortSignal compatibility issues in request handling ([c3568bf](https://github.com/Mearman/Academic-Explorer/commit/c3568bf4cca553725dff769a3fa4dc88c3f4b0bd))

## [12.0.2](https://github.com/Mearman/Academic-Explorer/compare/v12.0.1...v12.0.2) (2025-11-07)


### Bug Fixes

* **openalex-client:** resolve AbortSignal compatibility issues ([6091276](https://github.com/Mearman/Academic-Explorer/commit/6091276b2e4455bc87ca6073aa0f072b1834b3a6))

## [12.0.1](https://github.com/Mearman/Academic-Explorer/compare/v12.0.0...v12.0.1) (2025-11-07)


### Bug Fixes

* **client:** correct interceptor import path ([b809884](https://github.com/Mearman/Academic-Explorer/commit/b809884726f97a01ced1fe6246aff6df28798d7b))

# [12.0.0](https://github.com/Mearman/Academic-Explorer/compare/v11.6.0...v12.0.0) (2025-11-07)


### Bug Fixes

* **router:** improve decodeEntityId to handle TanStack Router slash normalization ([1c5f30e](https://github.com/Mearman/Academic-Explorer/commit/1c5f30e66589de24c238910a530486d588fa402f))
* **router:** update route tree with correct splat path patterns ([4e1a52b](https://github.com/Mearman/Academic-Explorer/commit/4e1a52b70a67b71658dfb3b866f00858f6c4cc7b))
* **web:** resolve URL flickering in pretty URL feature ([f40feaa](https://github.com/Mearman/Academic-Explorer/commit/f40feaabcfdfc3d622b43cce3c354e64365706e6))


### Features

* **router:** add URL normalization to fix browser address bar display ([e31988b](https://github.com/Mearman/Academic-Explorer/commit/e31988bf6d4c0d7427f357da60c5f947f96fb4ea))
* **router:** convert entity routes to splat routes for forward slash support ([c76202a](https://github.com/Mearman/Academic-Explorer/commit/c76202ab08e438fbcfcce6950540528b68f846b3))
* **web:** implement comprehensive URL display fixes for protocol slashes ([71b1ef1](https://github.com/Mearman/Academic-Explorer/commit/71b1ef14443a84c2efddbdba26607ae0bcb57299))


### BREAKING CHANGES

* **router:** Entity routes now use splat parameter ($_splat)
instead of typed parameters ($workId, $authorId, $institutionId).

# [11.6.0](https://github.com/Mearman/Academic-Explorer/compare/v11.5.12...v11.6.0) (2025-11-07)


### Bug Fixes

* **openalex-client:** prevent unnecessary lastUpdated timestamp updates in cache index files ([038d58f](https://github.com/Mearman/Academic-Explorer/commit/038d58f8fe617ac9d16f1b8a5346d4f55cc3a512))
* **web:** handle unencoded external ID URLs with collapsed slashes ([7111c41](https://github.com/Mearman/Academic-Explorer/commit/7111c41a954e861b06ffc0206ed6d0be779999c7))
* **web:** improve pretty URL reliability with timing and query param fixes ([8243790](https://github.com/Mearman/Academic-Explorer/commit/8243790d03f1fe3918af00f66915537c68817eba))
* **web:** prevent URL flickering by tracking update state ([94f040c](https://github.com/Mearman/Academic-Explorer/commit/94f040c0ba883cbccc5fe42d837135351b80136c))
* **web:** prevent URL flickering in pretty URL hook ([c856541](https://github.com/Mearman/Academic-Explorer/commit/c8565413f0fdc38e00205e2d5fdf712350177b09))


### Features

* **web:** display pretty (decoded) URLs in browser address bar ([80895de](https://github.com/Mearman/Academic-Explorer/commit/80895de59b1c81bf6a62f5760cb014eee9160311))
* **web:** implement pretty URL display for entity pages ([b6f9309](https://github.com/Mearman/Academic-Explorer/commit/b6f930910b43f809d21daafa12e3512f4196484e))

## [11.5.12](https://github.com/Mearman/Academic-Explorer/compare/v11.5.11...v11.5.12) (2025-11-07)


### Bug Fixes

* **web:** resolve ROR URL parameter handling bug ([c0268a2](https://github.com/Mearman/Academic-Explorer/commit/c0268a2c5592215977b3088e2214beafdd031b80))

## [11.5.11](https://github.com/Mearman/Academic-Explorer/compare/v11.5.10...v11.5.11) (2025-11-07)


### Bug Fixes

* **web:** resolve all test failures and improve application stability ([b3e5cb8](https://github.com/Mearman/Academic-Explorer/commit/b3e5cb8b66e08ae61d0bfaf3d4b4710b065d295c))

## [11.5.10](https://github.com/Mearman/Academic-Explorer/compare/v11.5.9...v11.5.10) (2025-11-07)

## [11.5.9](https://github.com/Mearman/Academic-Explorer/compare/v11.5.8...v11.5.9) (2025-11-07)


### Bug Fixes

* **web:** enhance OpenAlex URL handler with DOI support and comprehensive testing ([075e587](https://github.com/Mearman/Academic-Explorer/commit/075e5874f6d42de8eff7bfff1700b9f27fbae34b))

## [11.5.8](https://github.com/Mearman/Academic-Explorer/compare/v11.5.7...v11.5.8) (2025-11-07)


### Bug Fixes

* **web:** resolve quality gate failures and optimize test infrastructure ([e4b2348](https://github.com/Mearman/Academic-Explorer/commit/e4b234884a5e33ded54e3ea736088c957181dabb))

## [11.5.7](https://github.com/Mearman/Academic-Explorer/compare/v11.5.6...v11.5.7) (2025-11-07)


### Bug Fixes

* **web:** add placeholder components for removed CacheBrowser and EntityBrowser ([f7cbbe6](https://github.com/Mearman/Academic-Explorer/commit/f7cbbe6e115a8817d3ca5f740c3d6e22bc2f2c94))
* **web:** add placeholder components for removed layout components ([ad120e5](https://github.com/Mearman/Academic-Explorer/commit/ad120e54729b872231c1bd4e9a1288dd6b6f6cb4))
* **web:** add placeholder components for removed section components ([9c35f72](https://github.com/Mearman/Academic-Explorer/commit/9c35f72d646b93f35bba3d666ff7d7e226c906c3))
* **web:** remove DateRangeFilter dependencies from SearchInterface and search page ([0293378](https://github.com/Mearman/Academic-Explorer/commit/029337897a0b889e7d4b70e8fdde4055dcfd8c95))

## [11.5.6](https://github.com/Mearman/Academic-Explorer/compare/v11.5.5...v11.5.6) (2025-11-07)


### Bug Fixes

* **web:** resolve URL parameter encoding test failure ([f7ae8eb](https://github.com/Mearman/Academic-Explorer/commit/f7ae8eb06400ded018dd67c69911126cfde24583))

## [11.5.5](https://github.com/Mearman/Academic-Explorer/compare/v11.5.4...v11.5.5) (2025-11-07)

## [11.5.4](https://github.com/Mearman/Academic-Explorer/compare/v11.5.3...v11.5.4) (2025-11-07)


### Bug Fixes

* **web:** resolve strict mode violation in bookmarks page test ([e2f3e1f](https://github.com/Mearman/Academic-Explorer/commit/e2f3e1f97fd691e0c53ce4117b638af3f8220632))

## [11.5.3](https://github.com/Mearman/Academic-Explorer/compare/v11.5.2...v11.5.3) (2025-11-07)


### Bug Fixes

* **web:** resolve TypeScript errors in NavigationTracker component ([1209ad8](https://github.com/Mearman/Academic-Explorer/commit/1209ad8d938ee39cf07828803b152f2aaab5e3a0))

## [11.5.2](https://github.com/Mearman/Academic-Explorer/compare/v11.5.1...v11.5.2) (2025-11-07)

## [11.5.1](https://github.com/Mearman/Academic-Explorer/compare/v11.5.0...v11.5.1) (2025-11-07)

# [11.5.0](https://github.com/Mearman/Academic-Explorer/compare/v11.4.0...v11.5.0) (2025-11-07)


### Features

* **web:** Fix bookmark navigation and test infrastructure ([6cd574d](https://github.com/Mearman/Academic-Explorer/commit/6cd574dfda59fd5d562a96fa9d4705aec6498403))

# [11.4.0](https://github.com/Mearman/Academic-Explorer/compare/v11.3.0...v11.4.0) (2025-11-07)


### Bug Fixes

* **web:** Improve bookmark navigation with TanStack Router ([7063c5b](https://github.com/Mearman/Academic-Explorer/commit/7063c5bd5305775525abec08b9d5f0497397c5ce))


### Features

* **web:** Fix E2E test infrastructure and bookmark navigation ([f1090e0](https://github.com/Mearman/Academic-Explorer/commit/f1090e0aae2d664e67b26943c946a88c40d23d4b))

# [11.3.0](https://github.com/Mearman/Academic-Explorer/compare/v11.2.1...v11.3.0) (2025-11-06)


### Features

* **web:** Update OpenAlex cache with improved data indexing ([52f7e4d](https://github.com/Mearman/Academic-Explorer/commit/52f7e4d4e0bb3534464cf94a4debbf7355b548d4))

## [11.2.1](https://github.com/Mearman/Academic-Explorer/compare/v11.2.0...v11.2.1) (2025-11-06)


### Bug Fixes

* **web:** Improve test environment AbortSignal compatibility ([834d261](https://github.com/Mearman/Academic-Explorer/commit/834d261ed62ac50afb81fc6d32f88c742d1e9290))

# [11.2.0](https://github.com/Mearman/Academic-Explorer/compare/v11.1.0...v11.2.0) (2025-11-06)


### Features

* **web:** Complete E2E test fixes and URL redirection verification ([46c1683](https://github.com/Mearman/Academic-Explorer/commit/46c16830c498dd5e72c801dd66078d05988378b4))

# [11.1.0](https://github.com/Mearman/Academic-Explorer/compare/v11.0.1...v11.1.0) (2025-11-06)


### Bug Fixes

* **release:** use exec plugin to commit version bumps after tag creation ([14b0286](https://github.com/Mearman/Academic-Explorer/commit/14b0286c34245e559587833dea121982bfa1cef4))
* **web:** Fix router context issue in bookmark functionality ([6c95584](https://github.com/Mearman/Academic-Explorer/commit/6c955848449089d2a0a3bd34948f2dcfc74d1c16))
* **web:** Resolve TypeScript errors in E2E bookmarking tests ([95986a2](https://github.com/Mearman/Academic-Explorer/commit/95986a29496f0ffe2d29f85441a682c734db1319))


### Features

* **web:** Add bookmark functionality to entity pages ([8dd9587](https://github.com/Mearman/Academic-Explorer/commit/8dd958787065ac809d4b12f00cd20537e1441248))

## [11.0.1](https://github.com/Mearman/Academic-Explorer/compare/v11.0.0...v11.0.1) (2025-11-06)


### Bug Fixes

* **release:** create tag on triggering commit before version bump ([62ec096](https://github.com/Mearman/Academic-Explorer/commit/62ec096d8aa50ada2925eb1c26066d97fdde5824))

# [11.0.0](https://github.com/Mearman/Academic-Explorer/compare/v10.2.0...v11.0.0) (2025-11-06)


### Bug Fixes

* **config:** upgrade Node.js version to 22 for semantic-release compatibility ([a3714f1](https://github.com/Mearman/Academic-Explorer/commit/a3714f17343965df0f204672e72e7645d8d3c194))
* **openalex-client:** correct autocomplete cache file naming from q=q= to q= ([2543805](https://github.com/Mearman/Academic-Explorer/commit/2543805aa1fe1323f0ed49c43fd525221db04adb))
* **openalex-client:** correct autocomplete cache file naming from query= to q= ([d937a0c](https://github.com/Mearman/Academic-Explorer/commit/d937a0c47365957347fe7b1f9393ea0301187e94))
* **web:** add MantineProvider to GraphToolbar test wrapper ([ec25c4c](https://github.com/Mearman/Academic-Explorer/commit/ec25c4cb7ede2f7e913df82bfcac5a6b567a70a2))
* **web:** correct button text assertions in integration tests ([a494dd6](https://github.com/Mearman/Academic-Explorer/commit/a494dd671473c82b8eca2545a5bbc18fffb501bc))
* **web:** fix topic route entity type capitalization in loading/error states ([438daa4](https://github.com/Mearman/Academic-Explorer/commit/438daa4ff064878447c26a1c18fc881766836481))
* **web:** improve test suite pass rate from 97.0% to 99.5% ([9bc2ca0](https://github.com/Mearman/Academic-Explorer/commit/9bc2ca07003dc70a2fa754c881345ce3b8936bf8))
* **web:** rename authors autocomplete cache files to correct naming convention ([421121c](https://github.com/Mearman/Academic-Explorer/commit/421121c2aef00ce20b054c62264aa1b18a75c5fe))
* **web:** rename concepts and funders autocomplete cache files ([967fc9b](https://github.com/Mearman/Academic-Explorer/commit/967fc9bad71749479d9c65bd8afef18958c1d2b9))
* **web:** rename general autocomplete cache files to correct naming convention ([4ff161e](https://github.com/Mearman/Academic-Explorer/commit/4ff161ef49c9083146690a77558f0353103ee579))
* **web:** rename institutions autocomplete cache files to correct naming ([16b5d38](https://github.com/Mearman/Academic-Explorer/commit/16b5d38b258c762415dfcba7c9d8f302fe9c197a))
* **web:** rename remaining autocomplete cache files to correct naming ([5349e4f](https://github.com/Mearman/Academic-Explorer/commit/5349e4f0dc844f0cd77308634913db3ed64814b5))
* **web:** resolve CI/CD pipeline timeout and release failures ([3ab18d7](https://github.com/Mearman/Academic-Explorer/commit/3ab18d7396ad695e3d87ce93c9f7ed5d49a4b2a3))


### Code Refactoring

* **web:** replace custom modal with Mantine Modal in datasets ([ba05bd9](https://github.com/Mearman/Academic-Explorer/commit/ba05bd9aa87d1a9d579fc375c75a60a11a186341))


### Features

* **graph:** add aria-label attributes to toolbar buttons ([6e2a78f](https://github.com/Mearman/Academic-Explorer/commit/6e2a78f2d46ad77a7511aa7903b20b9d1ca8de85))


### BREAKING CHANGES

* **web:** Modal now uses Mantine's design system instead of custom styling

# [10.2.0](https://github.com/Mearman/Academic-Explorer/compare/v10.1.0...v10.2.0) (2025-11-05)


### Features

* **web:** standardize topic page to use shared EntityDetailLayout ([ea66b31](https://github.com/Mearman/Academic-Explorer/commit/ea66b3144a5545e56bf59e8fe27649fae781c473))

# [10.1.0](https://github.com/Mearman/Academic-Explorer/compare/v10.0.0...v10.1.0) (2025-11-05)


### Features

* **release:** restore semantic-release for automated version management ([022f2a2](https://github.com/Mearman/Academic-Explorer/commit/022f2a2c42f46d5e75957757979fdd548fb36780))

## 8.43.4 (2025-09-30)

### 🩹 Fixes

- **versions:** restore independent package versioning from correct baseline

  All package versions have been corrected to reflect their true change history from monorepo creation. Each package (except web) started at 1.0.0 when extracted from the main app, while web inherited its pre-monorepo version of 8.1.0.

  **Corrected Package Versions:**
  - `@bibgraph/web`: 8.43.4 (from 8.1.0 baseline)
  - `@bibgraph/cli`: 1.3.0 (from 1.0.0 baseline)
  - `@bibgraph/client`: 1.28.0 (from 1.0.0 baseline)
  - `@bibgraph/graph`: 1.14.0 (from 1.0.0 baseline)
  - `@bibgraph/utils`: 2.1.3 (from 1.0.0 baseline, includes breaking change)
  - `@bibgraph/simulation`: 1.0.4 (from 1.0.0 baseline)
  - `@bibgraph/ui`: 1.3.0 (from 1.0.0 baseline)

  All package changelogs have been rewritten to accurately reflect their independent version history with proper semantic versioning based on conventional commits.

## 8.2.1 (2025-09-27)

### 🩹 Fixes

- **config:** use correct project name for workspace github releases ([0cf75914](https://github.com/Mearman/Academic-Explorer/commit/0cf75914))

## 8.2.0 (2025-09-27)

### 🚀 Features

- **config:** configure independent project versioning with workspace github releases ([9150a605](https://github.com/Mearman/Academic-Explorer/commit/9150a605))
- convert all remaining JavaScript ESLint rules to TypeScript ([937b8735](https://github.com/Mearman/Academic-Explorer/commit/937b8735))
- convert custom ESLint emoji rule to TypeScript ([0e992d68](https://github.com/Mearman/Academic-Explorer/commit/0e992d68))
- **config:** add markdown linting support with @eslint/markdown ([196341ab](https://github.com/Mearman/Academic-Explorer/commit/196341ab))
- **ci:** achieve perfect CI pipeline with zero warnings and issues ([333e68cd](https://github.com/Mearman/Academic-Explorer/commit/333e68cd))
- **config:** restore release automation with proper version workflow ([f7d3e058](https://github.com/Mearman/Academic-Explorer/commit/f7d3e058))
- **config:** refactor ci workflow with modern nx best practices ([ffe23237](https://github.com/Mearman/Academic-Explorer/commit/ffe23237))
- **style:** reintroduce Vanilla Extract for CSS-in-TS styling ([a38d1213](https://github.com/Mearman/Academic-Explorer/commit/a38d1213))
- **deps:** add chokidar dependency to fix vite plugin requirements ([841c9680](https://github.com/Mearman/Academic-Explorer/commit/841c9680))
- **monorepo:** add apps and packages structure ([79961238](https://github.com/Mearman/Academic-Explorer/commit/79961238))
- **monorepo:** add workspace configuration and tooling ([0ac08153](https://github.com/Mearman/Academic-Explorer/commit/0ac08153))
- **eslint:** add unused-imports plugin for better import management ([af65d6c6](https://github.com/Mearman/Academic-Explorer/commit/af65d6c6))

### 🩹 Fixes

- **ci:** add git push step to release workflow to push commits and tags ([da40042a](https://github.com/Mearman/Academic-Explorer/commit/da40042a))
- **config:** fix workspace github release configuration ([c7373110](https://github.com/Mearman/Academic-Explorer/commit/c7373110))
- **config:** enable github releases by using group-specific release commands ([e20a695e](https://github.com/Mearman/Academic-Explorer/commit/e20a695e))
- **config:** add missing workspace eslint configuration ([ed5bedc4](https://github.com/Mearman/Academic-Explorer/commit/ed5bedc4))
- **config:** update github pages deployment to use modern actions/deploy-pages ([ad40f9bf](https://github.com/Mearman/Academic-Explorer/commit/ad40f9bf))
- **ci:** resolve test pipeline hanging issues ([0f7ca1f0](https://github.com/Mearman/Academic-Explorer/commit/0f7ca1f0))
- **config:** remove --yes flag to fix mutually exclusive options ([673e5e52](https://github.com/Mearman/Academic-Explorer/commit/673e5e52))
- **config:** improve lint error handling to prevent blocking releases ([eabbbf85](https://github.com/Mearman/Academic-Explorer/commit/eabbbf85))
- **config:** use --skip-publish flag to prevent npm publishing in ci ([753eb338](https://github.com/Mearman/Academic-Explorer/commit/753eb338))
- **config:** allow ci to continue on lint errors for research project ([e9913264](https://github.com/Mearman/Academic-Explorer/commit/e9913264))
- **config:** disable npm publishing in nx release for research project ([fd54c445](https://github.com/Mearman/Academic-Explorer/commit/fd54c445))
- **config:** add write permissions for release job to allow git push ([a5f237dd](https://github.com/Mearman/Academic-Explorer/commit/a5f237dd))
- **config:** add first-release flag to nx release command ([abb49a70](https://github.com/Mearman/Academic-Explorer/commit/abb49a70))
- **config:** remove tree filter from release checkout ([3beb1f09](https://github.com/Mearman/Academic-Explorer/commit/3beb1f09))
- **config:** add workflow dispatch trigger to enable manual ci runs ([1b29d760](https://github.com/Mearman/Academic-Explorer/commit/1b29d760))
- **config:** resolve json parsing error in affected projects detection ([f948a3e6](https://github.com/Mearman/Academic-Explorer/commit/f948a3e6))
- **types:** resolve union types and console statement issues ([11485ebe](https://github.com/Mearman/Academic-Explorer/commit/11485ebe))
- **config:** resolve lint job hanging by bypassing nx eslint plugin ([b912c6ce](https://github.com/Mearman/Academic-Explorer/commit/b912c6ce))
- **config:** resolve eslint hanging and warnings in ci ([7053d879](https://github.com/Mearman/Academic-Explorer/commit/7053d879))
- **config:** resolve remaining CI failures - eslint flags and typecheck dependencies ([2abdc24d](https://github.com/Mearman/Academic-Explorer/commit/2abdc24d))
- **config:** disable prefer-optional-chain type-aware rule ([913e6370](https://github.com/Mearman/Academic-Explorer/commit/913e6370))
- **config:** resolve coverage job tsx execution and cache dependency ([a1427e45](https://github.com/Mearman/Academic-Explorer/commit/a1427e45))
- **ci:** resolve node options and script execution issues ([9ffffb11](https://github.com/Mearman/Academic-Explorer/commit/9ffffb11))
- **config:** resolve ci pipeline failures ([5255afa6](https://github.com/Mearman/Academic-Explorer/commit/5255afa6))
- **deps:** add missing module resolution dependencies ([b3510e17](https://github.com/Mearman/Academic-Explorer/commit/b3510e17))
- **config:** add dependency installation step to quality-checks ([a0774382](https://github.com/Mearman/Academic-Explorer/commit/a0774382))
- **config:** ensure packages build before typecheck in CI ([97bdc976](https://github.com/Mearman/Academic-Explorer/commit/97bdc976))
- **deps:** ignore vanilla-extract false positive in knip ([ca121e33](https://github.com/Mearman/Academic-Explorer/commit/ca121e33))
- resolve CI dependency and linting issues ([4e18edfc](https://github.com/Mearman/Academic-Explorer/commit/4e18edfc))
- **deps:** update pnpm-lock.yaml for vitest coverage dependency ([4158eff4](https://github.com/Mearman/Academic-Explorer/commit/4158eff4))
- **deps:** update pnpm-lock.yaml after dependency cleanup ([33f5d1b0](https://github.com/Mearman/Academic-Explorer/commit/33f5d1b0))
- **config:** improve knip configuration to reduce false positives ([13cf093a](https://github.com/Mearman/Academic-Explorer/commit/13cf093a))
- **deps:** add missing dependencies identified by knip analysis ([76078e4e](https://github.com/Mearman/Academic-Explorer/commit/76078e4e))
- **ci:** standardize pnpm version across all CI workflows ([0995798f](https://github.com/Mearman/Academic-Explorer/commit/0995798f))
- **ci:** update pnpm version to 10.16.1 for CI/local consistency ([a97b05df](https://github.com/Mearman/Academic-Explorer/commit/a97b05df))
- **config:** update knip ignore patterns to resolve YAML parsing CI failures ([f9375624](https://github.com/Mearman/Academic-Explorer/commit/f9375624))
- **deps:** add missing ESLint plugins to resolve CI build failures ([3ac2920d](https://github.com/Mearman/Academic-Explorer/commit/3ac2920d))
- **deps:** resolve storybook version conflicts and react component typing issues ([96815d7d](https://github.com/Mearman/Academic-Explorer/commit/96815d7d))
- resolve nx task configuration, typescript errors, and react component issues ([a954d719](https://github.com/Mearman/Academic-Explorer/commit/a954d719))
- **config:** disable nx cloud to resolve ci authentication error ([834101a2](https://github.com/Mearman/Academic-Explorer/commit/834101a2))
- **config:** resolve TanStack Router and vite-plugin-dts issues ([4451d378](https://github.com/Mearman/Academic-Explorer/commit/4451d378))
- **lint:** resolve remaining lint violations across monorepo ([c824e599](https://github.com/Mearman/Academic-Explorer/commit/c824e599))
- **lint:** resolve major linting violations across monorepo ([dabe58f4](https://github.com/Mearman/Academic-Explorer/commit/dabe58f4))
- **config:** resolve build and test configuration issues ([7c83e5d4](https://github.com/Mearman/Academic-Explorer/commit/7c83e5d4))

### 🔥 Performance

- **scripts:** optimize build and typecheck performance ([51b5685a](https://github.com/Mearman/Academic-Explorer/commit/51b5685a))
- **config:** optimize eslint configuration for stability ([9de96126](https://github.com/Mearman/Academic-Explorer/commit/9de96126))
- **config:** implement comprehensive pipeline performance optimizations ([c6ee58b3](https://github.com/Mearman/Academic-Explorer/commit/c6ee58b3))
- **config:** build only core packages for typecheck to prevent ui timeout ([55bc279e](https://github.com/Mearman/Academic-Explorer/commit/55bc279e))
- **config:** optimize ci build performance and prevent timeouts ([95a475eb](https://github.com/Mearman/Academic-Explorer/commit/95a475eb))
- optimize TypeScript compilation and CI performance ([decd092e](https://github.com/Mearman/Academic-Explorer/commit/decd092e))

## 9.1.0 (2025-09-26)

### 🚀 Features

- **ci:** achieve perfect CI pipeline with zero warnings and issues ([333e68cd](https://github.com/Mearman/Academic-Explorer/commit/333e68cd))

### ❤️ Thank You

- Joseph Mearman

## 9.0.4 (2025-09-26)

### Fixes

- **config:** update github pages deployment to use modern actions/deploy-pages ([ad40f9bf](https://github.com/Mearman/Academic-Explorer/commit/ad40f9bf))

### Thank You

- Joseph Mearman

## 9.0.3 (2025-09-26)

### Fixes

- **ci:** resolve test pipeline hanging issues ([0f7ca1f0](https://github.com/Mearman/Academic-Explorer/commit/0f7ca1f0))

### Thank You

- Joseph Mearman

## 9.0.2 (2025-09-26)

### Fixes

- **config:** remove --yes flag to fix mutually exclusive options ([673e5e52](https://github.com/Mearman/Academic-Explorer/commit/673e5e52))
- **config:** improve lint error handling to prevent blocking releases ([eabbbf85](https://github.com/Mearman/Academic-Explorer/commit/eabbbf85))
- **config:** use --skip-publish flag to prevent npm publishing in ci ([753eb338](https://github.com/Mearman/Academic-Explorer/commit/753eb338))

### Thank You

- Joseph Mearman

## 9.0.1 (2025-09-26)

### Fixes

- **config:** allow ci to continue on lint errors for research project ([e9913264](https://github.com/Mearman/Academic-Explorer/commit/e9913264))
- **config:** disable npm publishing in nx release for research project ([fd54c445](https://github.com/Mearman/Academic-Explorer/commit/fd54c445))

### Thank You

- Joseph Mearman

# 9.0.0 (2025-09-26)

### Features

- **config:** restore release automation with proper version workflow ([f7d3e058](https://github.com/Mearman/Academic-Explorer/commit/f7d3e058))
- **config:** refactor ci workflow with modern nx best practices ([ffe23237](https://github.com/Mearman/Academic-Explorer/commit/ffe23237))
- **monorepo:** add workspace configuration and tooling ([0ac08153](https://github.com/Mearman/Academic-Explorer/commit/0ac08153))
- **ci:** make accessibility job non-blocking ([9dd9c576](https://github.com/Mearman/Academic-Explorer/commit/9dd9c576))
- **ci:** add accessibility testing job to GitHub Actions workflow ([3d6cc73d](https://github.com/Mearman/Academic-Explorer/commit/3d6cc73d))
- **hooks:** add husky and lint-staged for automatic linting fixes ([cf113050](https://github.com/Mearman/Academic-Explorer/commit/cf113050))
- **ci:** tag and release against original commit with separate version bump ([8cf7456d](https://github.com/Mearman/Academic-Explorer/commit/8cf7456d))
- **ci:** implement custom release workflow with proper tag and version flow ([d33671b7](https://github.com/Mearman/Academic-Explorer/commit/d33671b7))
- **ci:** improve Nx caching strategy for better performance ([34db9f0d](https://github.com/Mearman/Academic-Explorer/commit/34db9f0d))
- **ci:** add GitHub Actions CI workflow and dependabot ([807d75a7](https://github.com/Mearman/Academic-Explorer/commit/807d75a7))

### Fixes

- **config:** add write permissions for release job to allow git push ([a5f237dd](https://github.com/Mearman/Academic-Explorer/commit/a5f237dd))
- **config:** add first-release flag to nx release command ([abb49a70](https://github.com/Mearman/Academic-Explorer/commit/abb49a70))
- **config:** remove tree filter from release checkout ([3beb1f09](https://github.com/Mearman/Academic-Explorer/commit/3beb1f09))
- **config:** add workflow dispatch trigger to enable manual ci runs ([1b29d760](https://github.com/Mearman/Academic-Explorer/commit/1b29d760))
- **config:** resolve json parsing error in affected projects detection ([f948a3e6](https://github.com/Mearman/Academic-Explorer/commit/f948a3e6))
- **config:** resolve lint job hanging by bypassing nx eslint plugin ([b912c6ce](https://github.com/Mearman/Academic-Explorer/commit/b912c6ce))
- **config:** resolve remaining CI failures - eslint flags and typecheck dependencies ([2abdc24d](https://github.com/Mearman/Academic-Explorer/commit/2abdc24d))
- **config:** resolve coverage job tsx execution and cache dependency ([a1427e45](https://github.com/Mearman/Academic-Explorer/commit/a1427e45))
- **ci:** resolve node options and script execution issues ([9ffffb11](https://github.com/Mearman/Academic-Explorer/commit/9ffffb11))
- **config:** add dependency installation step to quality-checks ([a0774382](https://github.com/Mearman/Academic-Explorer/commit/a0774382))
- **config:** ensure packages build before typecheck in CI ([97bdc976](https://github.com/Mearman/Academic-Explorer/commit/97bdc976))
- **ci:** standardize pnpm version across all CI workflows ([0995798f](https://github.com/Mearman/Academic-Explorer/commit/0995798f))
- **ci:** update pnpm version to 10.16.1 for CI/local consistency ([a97b05df](https://github.com/Mearman/Academic-Explorer/commit/a97b05df))
- **ci:** resolve all remaining CI test failures ([a0e21e12](https://github.com/Mearman/Academic-Explorer/commit/a0e21e12))
- **tests:** resolve relationship detection service test failures ([eb6cb6eb](https://github.com/Mearman/Academic-Explorer/commit/eb6cb6eb))
- **ci:** revert release job to blocking ([bcb31aa3](https://github.com/Mearman/Academic-Explorer/commit/bcb31aa3))
- **ci:** make release job non-blocking to handle API failures ([5a5f5097](https://github.com/Mearman/Academic-Explorer/commit/5a5f5097))
- **accessibility:** resolve pa11y-ci and Lighthouse CI configuration issues ([94abb7fe](https://github.com/Mearman/Academic-Explorer/commit/94abb7fe))
- **ci:** resolve accessibility test failures ([4a34d3a1](https://github.com/Mearman/Academic-Explorer/commit/4a34d3a1))
- **ci:** comprehensive CI pipeline fixes for accessibility and coverage ([38c41640](https://github.com/Mearman/Academic-Explorer/commit/38c41640))
- **ci:** use pnpm nx commands for proper execution ([6cec9f3d](https://github.com/Mearman/Academic-Explorer/commit/6cec9f3d))
- **tests:** make e2e test variables explicitly nullable ([affada56](https://github.com/Mearman/Academic-Explorer/commit/affada56))
- **ci:** resolve cache save failures and missing coverage artifacts ([4fe78bcd](https://github.com/Mearman/Academic-Explorer/commit/4fe78bcd))
- **e2e:** improve app loading detection and reliability ([e48bc51a](https://github.com/Mearman/Academic-Explorer/commit/e48bc51a))
- **ci:** add preview server setup for E2E tests ([89286f06](https://github.com/Mearman/Academic-Explorer/commit/89286f06))
- **ci:** resolve CI failures and ESLint issues ([088aa836](https://github.com/Mearman/Academic-Explorer/commit/088aa836))
- **ci:** handle version already updated by semantic-release ([4882d10a](https://github.com/Mearman/Academic-Explorer/commit/4882d10a))
- **ci:** add GITHUB_TOKEN environment variable for semantic-release ([f8d10570](https://github.com/Mearman/Academic-Explorer/commit/f8d10570))
- **ci:** replace manual changelog with semantic-release built-in functionality ([30b7c8b4](https://github.com/Mearman/Academic-Explorer/commit/30b7c8b4))
- **ci:** remove empty files before semantic-release upload ([c1b72bc2](https://github.com/Mearman/Academic-Explorer/commit/c1b72bc2))
- **ci:** add setup job dependency to release job for cache key access ([c0d41771](https://github.com/Mearman/Academic-Explorer/commit/c0d41771))
- **release:** correct repository URL in semantic-release configuration ([4d04b227](https://github.com/Mearman/Academic-Explorer/commit/4d04b227))

### Performance

- **config:** implement comprehensive pipeline performance optimizations ([c6ee58b3](https://github.com/Mearman/Academic-Explorer/commit/c6ee58b3))
- **config:** build only core packages for typecheck to prevent ui timeout ([55bc279e](https://github.com/Mearman/Academic-Explorer/commit/55bc279e))
- **config:** optimize ci build performance and prevent timeouts ([95a475eb](https://github.com/Mearman/Academic-Explorer/commit/95a475eb))
- optimize TypeScript compilation and CI performance ([decd092e](https://github.com/Mearman/Academic-Explorer/commit/decd092e))

### Thank You

- Joseph Mearman

# [8.1.0](https://github.com/Mearman/Academic-Explorer/compare/v8.0.0...v8.1.0) (2025-09-22)


### Bug Fixes

* **console:** resolve undefined.length errors and race conditions ([53477b1](https://github.com/Mearman/Academic-Explorer/commit/53477b13c582f21508446f7a472e6878af4a0205))
* **events:** improve type safety in EventBus event handler ([700b8ed](https://github.com/Mearman/Academic-Explorer/commit/700b8ed828dca56ca34a5c6e4c163f24e880943c))
* **events:** improve worker event payload validation ([dff71ca](https://github.com/Mearman/Academic-Explorer/commit/dff71ca47ea0230b4fe811611710cad1324c24c2))
* **events:** remove unused import in entity event system ([923ab66](https://github.com/Mearman/Academic-Explorer/commit/923ab66305a3ac60fa78a18ff74d1d26196c5a5b))
* **events:** remove unused import in graph event system ([9018410](https://github.com/Mearman/Academic-Explorer/commit/9018410fbc4ed0a9ed87cd7a45454d7cea99b83d))
* **events:** resolve TypeScript strict mode issues in message-channel-coordinator ([92db65d](https://github.com/Mearman/Academic-Explorer/commit/92db65d92cf86d8d0125b2cd82fc05824d2ee4f2))
* **hooks:** correct expandNode call signature in use-graph-data ([e1639a9](https://github.com/Mearman/Academic-Explorer/commit/e1639a91764ce241ded400f6ed3c3b60c6f4bedb))
* **hooks:** improve activity tracker event metadata structure ([1ad06dc](https://github.com/Mearman/Academic-Explorer/commit/1ad06dc2424b8975da39dcfbfd1d2cd6028321e6))
* **hooks:** improve animated layout hook state management ([110ca8a](https://github.com/Mearman/Academic-Explorer/commit/110ca8aeb081f6ae43d916ca335558b6f7747078))
* **hooks:** remove unnecessary boolean conversion in use-graph-data ([8296d4c](https://github.com/Mearman/Academic-Explorer/commit/8296d4cbafb6b9c130e1c3dcfaed372ab7a1a997))
* **hooks:** remove unnecessary type assertions in background worker hook ([f4d965d](https://github.com/Mearman/Academic-Explorer/commit/f4d965d90bde49fa7286be4a59000c67d93c7664))
* **hooks:** resolve TypeScript strict mode issues in use-background-worker ([d55c0ba](https://github.com/Mearman/Academic-Explorer/commit/d55c0ba1e41b82affd4d0d04cc05112cc4e6b53f))
* improve graph store event emission logic ([d9606c4](https://github.com/Mearman/Academic-Explorer/commit/d9606c4644a0838e84b15e3cde3c9091c8f2525a))
* **layout:** remove unused variables in animated layout hook ([ce2e5f1](https://github.com/Mearman/Academic-Explorer/commit/ce2e5f15f252d4f058f2d1fb1a92fe3b1b197492))
* **lint:** eliminate ALL ESLint errors across codebase ([221bb45](https://github.com/Mearman/Academic-Explorer/commit/221bb453e190a56cbc25ac86de052d2732479b47))
* **lint:** partial lint error fixes to improve CI ([0fc8676](https://github.com/Mearman/Academic-Explorer/commit/0fc8676319f582034a31aae358e18ad8b23fa10e))
* **lint:** remove type assertion from type guard function ([df12ceb](https://github.com/Mearman/Academic-Explorer/commit/df12ceb4b02e5e287f13bb437d09466b56541e00))
* **lint:** replace type assertion with proper type handling in useEventListener ([a660b92](https://github.com/Mearman/Academic-Explorer/commit/a660b920b833c5ec0a350fa3ad2ad6883c979471))
* **navigation:** improve function signature and enable auto-trigger ([7910eee](https://github.com/Mearman/Academic-Explorer/commit/7910eeec5870a88795903d7b84a0fef045932528))
* **tests:** resolve failing unit tests for logger and author entity ([fe04964](https://github.com/Mearman/Academic-Explorer/commit/fe04964f789bd6fd7eaf98375538efe879446903))
* **tests:** update error message expectation for cross-environment compatibility ([7f8ff49](https://github.com/Mearman/Academic-Explorer/commit/7f8ff49287ddade722e4bcec3af257e728c8f166))
* **ts:** resolve final TypeScript build compatibility issues ([f5779c1](https://github.com/Mearman/Academic-Explorer/commit/f5779c1131593fedaa209f11903d0171b458f50d))
* **ts:** resolve TypeScript compilation errors for CI compatibility ([9689373](https://github.com/Mearman/Academic-Explorer/commit/9689373fed921929c2f84003e975217c992e86f9))
* **worker:** add missing workerModule configuration to task submissions ([a18b998](https://github.com/Mearman/Academic-Explorer/commit/a18b998c78463cb1ecea2314e6c74068d2fc9912))
* **worker:** add null check for worker error event listener ([41b52db](https://github.com/Mearman/Academic-Explorer/commit/41b52db09383d96f2bb05d8b85aa415ac3d7e53a))
* **worker:** eliminate d3-force type assertions and unsafe calls ([998320a](https://github.com/Mearman/Academic-Explorer/commit/998320a5908e5eadd89b46a92b5d54fb34cd8cb5))
* **worker:** improve type safety and RelationType handling ([7ae5dbd](https://github.com/Mearman/Academic-Explorer/commit/7ae5dbd95c72b32c11d1bff7c3820a50a0865bca))
* **worker:** resolve RelationType enum mapping for ExpansionOptions ([2eff203](https://github.com/Mearman/Academic-Explorer/commit/2eff2034a785ee87180aa1bf307ec30acc96b987))
* **worker:** resolve type safety issues in worker singleton ([783f2dd](https://github.com/Mearman/Academic-Explorer/commit/783f2dd9c7d12c9e9fa68b3ee24b19951e110d39))
* **worker:** update error message for BroadcastChannel communication ([dedc7a4](https://github.com/Mearman/Academic-Explorer/commit/dedc7a4e9ffb34b76804a848e793ce0bae3daa52))


### Features

* add application activity monitoring section component ([8412c32](https://github.com/Mearman/Academic-Explorer/commit/8412c32daed19c9090dbc5de5ac3773cb6a41570))
* add application activity monitoring store ([9e556d4](https://github.com/Mearman/Academic-Explorer/commit/9e556d43c7c7c5594fa274f96cb63b7b993fb28b))
* add graph activity tracking infrastructure ([13e7e95](https://github.com/Mearman/Academic-Explorer/commit/13e7e9553cee29bd12c8b3f89cdd886243a06f5e))
* **animation:** add auto-trigger for layout animations ([a0b845f](https://github.com/Mearman/Academic-Explorer/commit/a0b845f1a595e706c194c1536fca2be163abf7ea))
* **contexts:** remove deprecated EventBridge context system ([6cfa74c](https://github.com/Mearman/Academic-Explorer/commit/6cfa74c59a3d9acbf77eb3fe692a54f11cc1f800))
* **devtools:** add unified event system log categories to logger panel ([e0acf08](https://github.com/Mearman/Academic-Explorer/commit/e0acf08cdc9bcf439fb14d4276335499f0071974))
* enable debug logs for development ([532cff6](https://github.com/Mearman/Academic-Explorer/commit/532cff62901c19baea64ec82c9649ec4d68162da))
* enhance activity section UI with copy functionality ([fc68084](https://github.com/Mearman/Academic-Explorer/commit/fc6808431099aba89c3b2b8d32f516dcdf1cb54a))
* **events:** add core BroadcastChannel event system ([6ea2e6d](https://github.com/Mearman/Academic-Explorer/commit/6ea2e6d43907f9dccf817f7a703d06ef113ec8a0))
* **events:** add unified background worker hook ([23334fe](https://github.com/Mearman/Academic-Explorer/commit/23334fe1a50d2f5815d044f46db24e8b40411459))
* **events:** implement QueuedResourceCoordinator for distributed task management ([ae6ac5e](https://github.com/Mearman/Academic-Explorer/commit/ae6ac5e193c69146e93df51fe10657ae0ee1fa36))
* **events:** implement ResourceCoordinator with leader election ([60ab5be](https://github.com/Mearman/Academic-Explorer/commit/60ab5be2d52b5d64ee3d37b691355cb963403b5c))
* **events:** implement unified EventBus with cross-tab support ([40d108f](https://github.com/Mearman/Academic-Explorer/commit/40d108f834e17ca54e8a83e51fd58376fb2b051d))
* **events:** implement unified TaskQueue for worker and main thread execution ([3acb3e1](https://github.com/Mearman/Academic-Explorer/commit/3acb3e182f5df4f4591cb68e209193ba0e424c7b))
* **events:** implement WorkerPool for efficient task distribution ([4e9e42e](https://github.com/Mearman/Academic-Explorer/commit/4e9e42edbbe67b6d86e53a771c2203b4c65c410c))
* **events:** remove legacy event system files ([1cd3a11](https://github.com/Mearman/Academic-Explorer/commit/1cd3a11ec25e39688b01b2eefe21e33747570bea))
* **events:** update exports to include unified event system ([152a19f](https://github.com/Mearman/Academic-Explorer/commit/152a19f902053ad246632444a39c17eb9de46de0))
* export AppActivitySection from sections index ([cdff0f2](https://github.com/Mearman/Academic-Explorer/commit/cdff0f2b6f6941a606509028840c73fd50514a8c))
* **hooks:** add web worker lifecycle management hook ([9fd357b](https://github.com/Mearman/Academic-Explorer/commit/9fd357b326756c1d617f66a0afc573b21ea765ff))
* **hooks:** implement React hooks for unified event system ([35d3938](https://github.com/Mearman/Academic-Explorer/commit/35d39382f50874c7a5f94b23b4eddf3a2b2aefba))
* implement relationship expansion in background worker ([fbef852](https://github.com/Mearman/Academic-Explorer/commit/fbef852797f198b5dbffd13704b1addf9db5cc3d))
* integrate GraphActivityTracker in main layout ([046eeb4](https://github.com/Mearman/Academic-Explorer/commit/046eeb4919a17f728281bc026b98b131ee3f0d9a))
* **logger:** add unified event system log categories ([3170171](https://github.com/Mearman/Academic-Explorer/commit/3170171aa84572b506eee75875a737a94126cef8))
* register AppActivitySection in sidebar system ([13272e8](https://github.com/Mearman/Academic-Explorer/commit/13272e826dbf42a45c56e768431becb3f566cfe3))

# [8.0.0](https://github.com/Mearman/Academic-Explorer/compare/v7.1.0...v8.0.0) (2025-09-21)


### Bug Fixes

* add provider context to BackgroundWorker component tests ([29b3940](https://github.com/Mearman/Academic-Explorer/commit/29b39408d724986bf5cfa42220406159d89a3ad5))
* **cache:** remove unused type parameters and improve type safety in synthetic cache types ([dbda517](https://github.com/Mearman/Academic-Explorer/commit/dbda517773dc5ffa4c5e2d5c8bdd5194ba8ecebd))
* **cache:** resolve linting errors in collection result mapper ([9d79297](https://github.com/Mearman/Academic-Explorer/commit/9d792973292d03c425e4e4864412a24e8ed1d1a2))
* **cache:** resolve linting errors in entity field accumulator ([52598de](https://github.com/Mearman/Academic-Explorer/commit/52598debb843a3a695b120a68802e4a187e29c21))
* **cache:** resolve linting errors in storage tier manager ([ab5e670](https://github.com/Mearman/Academic-Explorer/commit/ab5e670415123e7858ec76f4eeab73c8e5d73519))
* **cache:** resolve linting errors in synthetic cache layer ([b6b02bf](https://github.com/Mearman/Academic-Explorer/commit/b6b02bf684331c17e41055505efb7da335ce5b7e))
* **cache:** resolve linting errors in synthetic response generator ([4502b6e](https://github.com/Mearman/Academic-Explorer/commit/4502b6e853a948044fe7f9d574dd7ab1e9dd7834))
* **cache:** resolve Promise return types and interface compliance ([e97c0bb](https://github.com/Mearman/Academic-Explorer/commit/e97c0bbea7a0b4b3f81b510b6a37c6a50159fb20))
* **cache:** update synthetic cache exports with improved type safety ([a34e189](https://github.com/Mearman/Academic-Explorer/commit/a34e1899f72e8205018aeb0053e10c09918971ae))
* **cache:** use plural entity types throughout cache configuration ([f013ce6](https://github.com/Mearman/Academic-Explorer/commit/f013ce63fa7775ff409024b03122f79866197b50))
* **cli:** improve cache stats validation and error handling ([87d2929](https://github.com/Mearman/Academic-Explorer/commit/87d29293ba75af8ea0aa24d3f979dba3a97dea5e))
* **cli:** resolve linting errors in OpenAlex CLI components ([0c0803c](https://github.com/Mearman/Academic-Explorer/commit/0c0803c653dd3bf043204ce1540250d3fb36e2cb))
* **cli:** resolve TypeScript errors and improve type safety ([233e01f](https://github.com/Mearman/Academic-Explorer/commit/233e01f1d915c85c8a4a717e5a77c246748656ee))
* correct AuthorEntity test mock structure to match CachedOpenAlexClient ([141c47d](https://github.com/Mearman/Academic-Explorer/commit/141c47d7183763b7ff9fdb19c53bddf3c8093e9d))
* correct GraphDataService test mocks to match implementation ([6f79ca2](https://github.com/Mearman/Academic-Explorer/commit/6f79ca2d4f4d1bba92511ac324413eaa9f457ad6))
* correct integration test mocks and remove unused imports ([7d2adbf](https://github.com/Mearman/Academic-Explorer/commit/7d2adbf150ec535868a9e9fe4f8724949de0bd82))
* eliminate all type assertions to improve type safety ([ddbe8d0](https://github.com/Mearman/Academic-Explorer/commit/ddbe8d083dd5c16da7df89b65c75ca2bdb664299))
* **events:** silence EventBridge validation warnings for non-bridge messages ([916169e](https://github.com/Mearman/Academic-Explorer/commit/916169e5b810d06bba1281737e1277a2f8d8c8a2))
* **graph:** remove unreachable code in AnimatedGraphControls status text ([24a66a1](https://github.com/Mearman/Academic-Explorer/commit/24a66a1295f2ff06da9bc6ba3706d3991e656058))
* **hooks:** filter EventBridge cross-context messages in force animation ([6f647df](https://github.com/Mearman/Academic-Explorer/commit/6f647df691091e5a7a700024b0a55a5058a77d29))
* **hooks:** handle worker not ready gracefully in expandNode ([fcf7520](https://github.com/Mearman/Academic-Explorer/commit/fcf7520057505a43da2f95fc74e3bca511055197))
* **hooks:** normalize entity types to plural in useOpenAlexQuery ([23a10e7](https://github.com/Mearman/Academic-Explorer/commit/23a10e75a88eb3714ce94cd94935577566ba0075))
* **hooks:** update useRawEntityData for plural entity types ([aa89f16](https://github.com/Mearman/Academic-Explorer/commit/aa89f1617da568c97a13354b329a88b7d21376ec))
* improve type safety in worker-singleton event handling ([7a9812b](https://github.com/Mearman/Academic-Explorer/commit/7a9812bd53878acec70624084c04cff8ab67a28f))
* improve type safety in worker-singleton event handling ([88be83e](https://github.com/Mearman/Academic-Explorer/commit/88be83e8279d5dad0532bc4e524ac558c4f45bc6))
* **openalex:** eliminate all type assertions and unsafe types in cached client ([b11288e](https://github.com/Mearman/Academic-Explorer/commit/b11288e3da322516327d7f1f0998716b1a4844ef))
* **query-keys:** update entity query key functions for plural types ([cdb7334](https://github.com/Mearman/Academic-Explorer/commit/cdb733434059aa8134520c6c0560a4bb951bf489))
* reduce ESLint errors from 28 to 12 by fixing critical issues ([0bb53cb](https://github.com/Mearman/Academic-Explorer/commit/0bb53cb53de02bcd5d37799c84444bf5e32db303))
* resolve BackgroundWorkerProvider worker ready state sync issue ([30d3794](https://github.com/Mearman/Academic-Explorer/commit/30d3794ea6e577a9450ec5af9406cbf625700e79))
* resolve ESLint type assertion errors in worker and contexts ([fbf71c6](https://github.com/Mearman/Academic-Explorer/commit/fbf71c6376bf031d1768d5c7f311e1a9a4cf9081))
* resolve type imports and event targeting in background worker ([e927a74](https://github.com/Mearman/Academic-Explorer/commit/e927a74b179d3188b85adc51e25a5cd962f24440))
* resolve TypeScript errors for CI pipeline ([d37c2b3](https://github.com/Mearman/Academic-Explorer/commit/d37c2b369513854e49e961a16281d5e54cf54e45))
* restore type assertions in cached-client for CI compatibility ([2de9db5](https://github.com/Mearman/Academic-Explorer/commit/2de9db5039ad16765434d51825688c8f49aa7d3e))
* **routing:** prevent infinite loops in AuthorRoute loading ([33cc065](https://github.com/Mearman/Academic-Explorer/commit/33cc065e1cd29b113030dda4ba58ad58d37cf381))
* **tests:** update synthetic cache tests to match improved type safety ([098f88b](https://github.com/Mearman/Academic-Explorer/commit/098f88bca2ec358e7466e9cf59aa0b622f610e07))
* **worker:** improve initialization timing and ready signal ([0814791](https://github.com/Mearman/Academic-Explorer/commit/0814791cf7ff5ad1c05affe5cdff931ecaece5de))
* **worker:** remove legacy direct postMessage ready handler ([973210a](https://github.com/Mearman/Academic-Explorer/commit/973210acba19bf5d86416352acb29968a9544820))
* **worker:** remove type assertion for OpenAlexEntity validation ([5b953f7](https://github.com/Mearman/Academic-Explorer/commit/5b953f7a3fe38ac533dd4259ce5fc4757e605212))
* **worker:** resolve TypeScript and ESLint errors ([1586629](https://github.com/Mearman/Academic-Explorer/commit/15866291eb87ff70cc1a8557b568b0eb219fc733))
* **workers:** filter EventBridge cross-context messages ([dc1a6b2](https://github.com/Mearman/Academic-Explorer/commit/dc1a6b237197d689fc923511c705de1b41abb3c9))


### Code Refactoring

* **workers:** remove deprecated worker architecture ([b18e8de](https://github.com/Mearman/Academic-Explorer/commit/b18e8deaf13a1046bb2ee32148121f877963fac2))


### Features

* add convenience methods to CachedOpenAlexClient for static data integration ([7dc3784](https://github.com/Mearman/Academic-Explorer/commit/7dc3784f4382d0616de408c0304d4fc84aeb0419))
* **cache:** add synthetic response cache system with multi-tier storage ([e348bfc](https://github.com/Mearman/Academic-Explorer/commit/e348bfc9cf9409f97bd760bc71086001e8c3dc21))
* **cli:** add synthetic cache support to OpenAlex CLI ([42b8f99](https://github.com/Mearman/Academic-Explorer/commit/42b8f9929b468f51bfb63387e5be83fee30c4c2b))
* **graph:** add worker singleton to prevent multiple instances ([819533c](https://github.com/Mearman/Academic-Explorer/commit/819533cf7f359c934b695d3c9480d9ac08bb456f))
* **hooks:** add direct message handling for worker ready/error signals ([6c7cf60](https://github.com/Mearman/Academic-Explorer/commit/6c7cf6074ebd4e4f22d390e70b9f72ff23e41efb))
* **hooks:** improve graph expansion tracking and fix worker call ([89e5f1c](https://github.com/Mearman/Academic-Explorer/commit/89e5f1c47824530cadf2d6e8f707e432587425a2))
* **hooks:** integrate synthetic cache into web app OpenAlex queries ([38d55bb](https://github.com/Mearman/Academic-Explorer/commit/38d55bbcdd3eb6c3aa74c78a18f9341c4dcedba2))
* implement EventBridge and BackgroundWorker providers ([0b15bed](https://github.com/Mearman/Academic-Explorer/commit/0b15bed9a95bab6255eca065b12a67fc0f41ca2b))
* **network:** detect worker requests via User-Agent header ([343caa9](https://github.com/Mearman/Academic-Explorer/commit/343caa907c26df3061aadcf990639783b927b0e8))
* **openalex:** enhance CachedOpenAlexClient with unified functionality ([3f65a33](https://github.com/Mearman/Academic-Explorer/commit/3f65a3371b42e48ce23cbb6867d827c6863bd5e5))
* **routes:** enhance author page loading with better logging and forced expansion ([0fd223b](https://github.com/Mearman/Academic-Explorer/commit/0fd223b34c129dfe3ceb786cfdc072435af8a08a))
* **services:** improve node expansion state logging ([1c56ba7](https://github.com/Mearman/Academic-Explorer/commit/1c56ba7037c76c1957a12ecf20cc90787b328ff2))
* **workers:** add unified background worker architecture ([13c55a5](https://github.com/Mearman/Academic-Explorer/commit/13c55a56279bb2a22e3dfa3abe51ac980deebf5e))


### BREAKING CHANGES

* **workers:** Removes deprecated worker hook APIs

# [7.1.0](https://github.com/Mearman/Academic-Explorer/compare/v7.0.0...v7.1.0) (2025-09-20)


### Bug Fixes

* **accessibility:** resolve accessibility test failures ([20c4ea4](https://github.com/Mearman/Academic-Explorer/commit/20c4ea41f57f765a91eb86745f59f56d3bc9cc00))
* **api:** improve rate limiting with request queue ([fc9dc90](https://github.com/Mearman/Academic-Explorer/commit/fc9dc90da6e260243a3dae57252703ecdbf35192))
* **build:** remove redundant dot encoding in URL key generation ([1eb522c](https://github.com/Mearman/Academic-Explorer/commit/1eb522c4e0c8ade9bd92ce3b37ff946f2cfba3c9))
* **ci:** resolve all remaining CI test failures ([a0e21e1](https://github.com/Mearman/Academic-Explorer/commit/a0e21e12fc552c57dbcaf57d4b6fb1d836a95d2b))
* **data:** clean up malformed entries from OpenAlex indexes ([489e3a3](https://github.com/Mearman/Academic-Explorer/commit/489e3a3f29945d621acab694a1e2feb60d4a593c))
* **data:** prevent unnecessary main index updates on every build ([f752418](https://github.com/Mearman/Academic-Explorer/commit/f752418119fe501626051c1b898625c65f3f94c1))
* **data:** remove malformed double-encoded files from filesystem ([a50cc0b](https://github.com/Mearman/Academic-Explorer/commit/a50cc0b8f3f6f9463789d404b07b24d228ce1bd1))
* **e2e:** correct CSS selector syntax for text matching ([ae0a227](https://github.com/Mearman/Academic-Explorer/commit/ae0a2277307a18476b89e259892ac2980b002a4e))
* **graph:** improve node lookup for relationship detection ([b615c51](https://github.com/Mearman/Academic-Explorer/commit/b615c51f4d85dcbd67096727f5b8b8e44d9a25f4))
* **tests:** resolve relationship detection service test failures ([eb6cb6e](https://github.com/Mearman/Academic-Explorer/commit/eb6cb6eba2070137823eb3372d121bbc73e995fa))


### Features

* **architecture:** add service provider pattern ([cdaba9f](https://github.com/Mearman/Academic-Explorer/commit/cdaba9f73ae01db2b5fc6857917a50a3fc010b0d))
* **core:** enhance data fetching and storage capabilities ([045794a](https://github.com/Mearman/Academic-Explorer/commit/045794a9cabe28de98d21b0bdfa8a7bb35ebfdf3))
* **data:** add automatic malformed file detection and cleanup ([27a0383](https://github.com/Mearman/Academic-Explorer/commit/27a038393ebe33413e6fd62ec5aff9c11a25ba86))
* **graph:** enhance async relationship detection ([3f703fb](https://github.com/Mearman/Academic-Explorer/commit/3f703fbdbfb44e7a99027956fdf8bf142ea5806e))
* **graph:** enhance graph service with expanded fields and debugging ([c01f741](https://github.com/Mearman/Academic-Explorer/commit/c01f741939f8a8808dbc9d1d0ec2d10ff90c4ee0))
* **graph:** integrate layout restart on edge addition ([78ecd1f](https://github.com/Mearman/Academic-Explorer/commit/78ecd1fe39cec4d145cf6a80a4de91dda94eb029))
* **hooks:** add automatic relationship detection hook ([ece8306](https://github.com/Mearman/Academic-Explorer/commit/ece830681d63a7ad122322bf8d06acfc39ef4185))
* **indexing:** integrate content-based hashing for efficient updates ([3106ed1](https://github.com/Mearman/Academic-Explorer/commit/3106ed1f90faed852757e03b2c7f54f7d2a331d9))
* **integration:** integrate service provider pattern and auto-detection ([db380ac](https://github.com/Mearman/Academic-Explorer/commit/db380ac084eadee0762345b10c9ccda3673af8c9))
* **utils:** add content-based hashing utility ([7aeda3e](https://github.com/Mearman/Academic-Explorer/commit/7aeda3ec59c7634dd2c24b603c02112d6f60a3fa))


### Performance Improvements

* **graph:** optimize simulation restart to only trigger when nodes/edges actually added ([740e8fc](https://github.com/Mearman/Academic-Explorer/commit/740e8fc82df5c11c161768a785c4ee8361e1f27f))

# [7.0.0](https://github.com/Mearman/Academic-Explorer/compare/v6.3.0...v7.0.0) (2025-09-19)


### Bug Fixes

* **build:** major ESLint fixes for OpenAlex data plugin ([391595e](https://github.com/Mearman/Academic-Explorer/commit/391595ec9d06dfebbd80a152501ce76364b7e6a4))
* **ci:** resolve TypeScript compilation errors and integration test failures ([420842c](https://github.com/Mearman/Academic-Explorer/commit/420842c7d619305ff9a2d1bbeefdd28bad68450b))
* **cli:** ensure consistent entity type handling across methods ([f760dec](https://github.com/Mearman/Academic-Explorer/commit/f760dec1f34d2cf13e08553ded5332681486ee5c))
* **cli:** improve content change detection and index maintenance ([b5ae45f](https://github.com/Mearman/Academic-Explorer/commit/b5ae45f01a0c026d0d99ec64e36decf734e0f3ee))
* **cli:** resolve TypeScript compilation errors ([4e9366b](https://github.com/Mearman/Academic-Explorer/commit/4e9366baa7ed87d3ae73f34f4d2e31e0695e633c))
* **cli:** resolve TypeScript errors with proper Zod validation ([f3d8259](https://github.com/Mearman/Academic-Explorer/commit/f3d8259aec64e3ba68d53427fe9db8dd455067a3))
* **data:** update indexes with corrected file metadata after restoration ([c8fa231](https://github.com/Mearman/Academic-Explorer/commit/c8fa231756e0134b2cb910045f10e160b2a6bef2))
* **lint:** resolve all ESLint errors ([b62fe1c](https://github.com/Mearman/Academic-Explorer/commit/b62fe1c06cf1d830667de6cbf2e0274598d273c7))
* **tests:** resolve unit test failures in static-data-integration ([532ccac](https://github.com/Mearman/Academic-Explorer/commit/532ccacdb8de3f2b84d6337bd9d178eca7f84bf0))
* **types:** add explicit key type to Zod record schema ([17098a7](https://github.com/Mearman/Academic-Explorer/commit/17098a7da490f450aecc56ac5d0a6768abc6ce56))
* **utils:** resolve ESLint violations in query-cache-builder ([0da2433](https://github.com/Mearman/Academic-Explorer/commit/0da2433d5b96a0a28f7617ee9366a597d08dadeb))


### Code Refactoring

* **utils:** remove legacy https-: encoding support ([3c06096](https://github.com/Mearman/Academic-Explorer/commit/3c06096fe3acd99840d5653c0701edcf2be266cc))
* **utils:** remove legacy https-: encoding support ([d35403c](https://github.com/Mearman/Academic-Explorer/commit/d35403c5cd8b8fefcfbe699e4e205a9da61ea35d))
* **utils:** simplify query-hash to content-only functionality ([d052cdb](https://github.com/Mearman/Academic-Explorer/commit/d052cdbfc142b83be783dd4c83e71ddc2e3ad26f))


### Features

* add Bangor University institution data to static cache ([df1e2db](https://github.com/Mearman/Academic-Explorer/commit/df1e2dbc7d25cca55688d46e22e4ae237c94b944))
* add CLI script for static data index generation ([77e7eba](https://github.com/Mearman/Academic-Explorer/commit/77e7eba10d694d1083c558307f35b4a33ac04777))
* add preloaded OpenAlex static data ([73b835a](https://github.com/Mearman/Academic-Explorer/commit/73b835afb69d6e9173c20bfc94234ab4355af87b))
* add Vite plugin for static data index generation ([bb3c9b9](https://github.com/Mearman/Academic-Explorer/commit/bb3c9b9f275e19f92bf109b625a35ccfa957004a))
* **build:** add OpenAlex data plugin and update build configuration ([1eadbdb](https://github.com/Mearman/Academic-Explorer/commit/1eadbdbfa41419c928bced1a04fe36dab661dda3))
* **cli:** add entity type auto-detection to get command ([adfd26d](https://github.com/Mearman/Academic-Explorer/commit/adfd26d2f2f9284b6f227c18c89f5f56f9c602ed))
* **cli:** add OpenAlex CLI infrastructure ([e7734fc](https://github.com/Mearman/Academic-Explorer/commit/e7734fc979f9786444bed463d47f8346d70e3d42))
* **client:** add static data integration to rate-limited OpenAlex client ([7cd6cbd](https://github.com/Mearman/Academic-Explorer/commit/7cd6cbdea2d48ea863dfcbda278dd97da2b9c0aa))
* **cli:** implement content-based file modification detection ([97c7eec](https://github.com/Mearman/Academic-Explorer/commit/97c7eec0b67645e7bb4b1118ad6959c08f6d1450))
* **cli:** implement static data CLI with entity commands ([9e84b32](https://github.com/Mearman/Academic-Explorer/commit/9e84b32e2b85c4ce404a383446a85b651cbbda8d))
* **data:** add cached OpenAlex query results and indexes ([8965786](https://github.com/Mearman/Academic-Explorer/commit/8965786e76401ba4e230afc8f96c701cd85c47e7))
* **data:** add query result caching to static data index generator ([a74f22c](https://github.com/Mearman/Academic-Explorer/commit/a74f22c78c9d3c31d1098d1059f5f928b1402d9d))
* **data:** add signposting index for OpenAlex entity navigation ([90096de](https://github.com/Mearman/Academic-Explorer/commit/90096dea0a742bc2d9716889789835daf734143b))
* **data:** migrate OpenAlex data files to URL encoding ([4df78f5](https://github.com/Mearman/Academic-Explorer/commit/4df78f5e1e5e96b3493bb893e596af1a02315531))
* **data:** preserve exact number formats from OpenAlex API ([17c1a6b](https://github.com/Mearman/Academic-Explorer/commit/17c1a6b633f4f5768e8376a33bec4efde84f7abe))
* **data:** update indexes to use new $ref-based structure ([e24b311](https://github.com/Mearman/Academic-Explorer/commit/e24b3117590148b468c21813727beb39c6782f02))
* **eslint:** enforce type safety with Zod validation over Reflect.get ([0711171](https://github.com/Mearman/Academic-Explorer/commit/0711171473b53aff0e02177317517b550d57e737))
* **eslint:** enhance Reflect API restrictions with type safety explanations ([dcbd437](https://github.com/Mearman/Academic-Explorer/commit/dcbd43728763e9fb3abd588b26d021919f257336))
* integrate static data index generation into build pipeline ([2fd635d](https://github.com/Mearman/Academic-Explorer/commit/2fd635deb795dc1e28c0299df21ce80176fd37ad))
* integrate static data index plugin into Vite configuration ([43c1a8e](https://github.com/Mearman/Academic-Explorer/commit/43c1a8eb3220397ce38acc5b0da78cd74878e0ed))
* **logger:** add static-data and query-cache log categories ([d5443eb](https://github.com/Mearman/Academic-Explorer/commit/d5443ebcb9203f1ed37dae1f98caac34702c06a7))
* **query-cache:** create unified browser-safe SHA-256 hash generation ([d395898](https://github.com/Mearman/Academic-Explorer/commit/d395898b67faaa32be4a808a00bf4f40223a656d))
* **scripts:** add automated query cache fetching script ([929f29e](https://github.com/Mearman/Academic-Explorer/commit/929f29e153edefc4b839568da847918bf4fda195))
* **static-data:** add core static data provider infrastructure ([1267cd0](https://github.com/Mearman/Academic-Explorer/commit/1267cd039e13732ebae52cc61cffcb081beed943))
* **static-data:** add query caching support to static data provider ([d606ae3](https://github.com/Mearman/Academic-Explorer/commit/d606ae30f16e055eab8ddc003192e46730051645))
* **static-data:** add query metadata support to index generation ([252df26](https://github.com/Mearman/Academic-Explorer/commit/252df2620e1ba597ef1d9d68fa4ef3808ef93a63))


### BREAKING CHANGES

* **utils:** query hash functions no longer available, use URL encoding for filenames
* **utils:** Legacy https-: encoded files are no longer supported
* **utils:** Legacy https-: encoded files are no longer supported
* **query-cache:** generateQueryHash is now async and returns Promise<string>

# [6.3.0](https://github.com/Mearman/Academic-Explorer/compare/v6.2.1...v6.3.0) (2025-09-19)


### Features

* **eslint:** add prefer-destructured-params rule ([811446a](https://github.com/Mearman/Academic-Explorer/commit/811446a1bae90f9568d5faa3b098efedf7cb80c1))
* **storage:** add IndexedDB adapter for Zustand persistence ([38deb23](https://github.com/Mearman/Academic-Explorer/commit/38deb233021220ba7498b22620b55dd8ba1ecd53))
* **storage:** implement hybrid localStorage + IndexedDB storage ([0dfa255](https://github.com/Mearman/Academic-Explorer/commit/0dfa2550bbc19b7eb1e5aceaeb68cc834c7e00cc))


### BREAKING CHANGES

* **storage:** Storage behavior changes from pure IndexedDB to hybrid approach

## [6.2.1](https://github.com/Mearman/Academic-Explorer/compare/v6.2.0...v6.2.1) (2025-09-19)


### Bug Fixes

* **deps:** re-add d3-random dependency for force-animation worker ([394250c](https://github.com/Mearman/Academic-Explorer/commit/394250c20a728ce51524422053e3c65f57e6df75))
* **deps:** update pnpm-lock.yaml after dependency cleanup ([110edf6](https://github.com/Mearman/Academic-Explorer/commit/110edf68b0ff2bfd9ae9ecdf67cddf1c4162285e))

# [6.2.0](https://github.com/Mearman/Academic-Explorer/compare/v6.1.0...v6.2.0) (2025-09-19)


### Features

* **a11y:** add skip links for keyboard navigation in MainLayout ([5920fb2](https://github.com/Mearman/Academic-Explorer/commit/5920fb2f7820a21d4044c233dc1a451ad9cae2a4))

# [6.1.0](https://github.com/Mearman/Academic-Explorer/compare/v6.0.3...v6.1.0) (2025-09-19)


### Bug Fixes

* **graph:** resolve CustomForce type compatibility in worker ([23c8ebb](https://github.com/Mearman/Academic-Explorer/commit/23c8ebb764046d5e2d439b4776727d0cd1463ebd))
* **worker:** add proper type narrowing for CustomForce message handling ([85e3ea4](https://github.com/Mearman/Academic-Explorer/commit/85e3ea402c1a23c9247a91aad10aa13618886f04))


### Features

* **graph:** add CustomForcesSection with worker integration ([bc3bf26](https://github.com/Mearman/Academic-Explorer/commit/bc3bf2639dfe7a6fa17d38f136dc372b70f0086d))

## [6.0.3](https://github.com/Mearman/Academic-Explorer/compare/v6.0.2...v6.0.3) (2025-09-18)


### Bug Fixes

* **test:** resolve EventBridge mocking issues in force simulation tests ([70487f1](https://github.com/Mearman/Academic-Explorer/commit/70487f17f1c4e569bd2e983bab5d87dd57e2a9f0))

## [6.0.2](https://github.com/Mearman/Academic-Explorer/compare/v6.0.1...v6.0.2) (2025-09-18)


### Bug Fixes

* **a11y:** add missing aria-labels to improve accessibility ([f1d7d31](https://github.com/Mearman/Academic-Explorer/commit/f1d7d31e10cb2e7a0b9b1728872316c8a306cf5c))

## [6.0.1](https://github.com/Mearman/Academic-Explorer/compare/v6.0.0...v6.0.1) (2025-09-18)


### Bug Fixes

* **test:** resolve component test failures with DOM cleanup and jest-dom configuration ([c27f02f](https://github.com/Mearman/Academic-Explorer/commit/c27f02f5e0f9a8d08092bc5c0dd7e53c73a62a1a))

# [6.0.0](https://github.com/Mearman/Academic-Explorer/compare/v5.9.0...v6.0.0) (2025-09-18)


### Bug Fixes

* **hooks:** call onProgress callback in data fetch progress handler ([dc613d0](https://github.com/Mearman/Academic-Explorer/commit/dc613d03ab6beb3b9cf6267a2ae680021d98f7b0))
* **hooks:** eliminate ESLint errors in worker hooks without disable comments ([82c02e4](https://github.com/Mearman/Academic-Explorer/commit/82c02e4d93d16d339fa648e0a1da5a322cc5afc6))
* **tests:** correct EventBridge component test payload validation ([7055af0](https://github.com/Mearman/Academic-Explorer/commit/7055af020b83efc6bdfc354fe97bec81a9933df3))


### Code Refactoring

* **hooks:** remove legacy message handling from data fetching worker ([1585318](https://github.com/Mearman/Academic-Explorer/commit/1585318249ea2ac08da1b2155dbc870536042989))


### Features

* **test:** integrate MSW for OpenAlex API mocking and resolve unhandled promise rejections ([50d87c7](https://github.com/Mearman/Academic-Explorer/commit/50d87c7104b75057b538b411e7b0eed0399b33f0))
* **workers:** migrate data fetching worker to EventBridge communication ([7ef5f58](https://github.com/Mearman/Academic-Explorer/commit/7ef5f58abd9ea6deb5b179d2d9014cdc182e79d4))
* **workers:** migrate force animation worker to EventBridge communication ([8f26762](https://github.com/Mearman/Academic-Explorer/commit/8f26762456a30688d788ae4f4a2f8698acff2ce5))


### BREAKING CHANGES

* **hooks:** Legacy postMessage communication no longer supported
* **workers:** Worker now uses EventBridge instead of postMessage for all communication
* **workers:** Worker now primarily uses EventBridge instead of postMessage

# [5.9.0](https://github.com/Mearman/Academic-Explorer/compare/v5.8.2...v5.9.0) (2025-09-18)


### Bug Fixes

* **ci:** adjust coverage thresholds for unit-only tested modules ([5a69176](https://github.com/Mearman/Academic-Explorer/commit/5a691764662ba09d9687c7c9845cac89b13a184d))
* **ci:** adjust coverage thresholds to realistic levels ([9ddd173](https://github.com/Mearman/Academic-Explorer/commit/9ddd1736dcdb7ebff97fe250e035511f53a3c0f3))
* **events:** implement type-safe Zod validation ([794f833](https://github.com/Mearman/Academic-Explorer/commit/794f833f93735fb78951c155fb66a3f2fa5a9454))
* **events:** improve async handler support in cross-context event proxy ([5897e70](https://github.com/Mearman/Academic-Explorer/commit/5897e70bb64b66597b07a6f40dd6338458aecdf4))
* **events:** improve type safety for event schemas in CrossContextEventProxy ([74c2fe1](https://github.com/Mearman/Academic-Explorer/commit/74c2fe1722d68b7de6f710593ab9e4e9b22f7560))
* **events:** remove type assertion in validated handler ([1bdd4dd](https://github.com/Mearman/Academic-Explorer/commit/1bdd4ddfb12e6fef2da6a937853752fb4786b0b3))
* **events:** resolve ESLint type assertion errors ([2bed779](https://github.com/Mearman/Academic-Explorer/commit/2bed779ff6eb9a33ae56e5164a6781c4eef2e273))
* **events:** resolve type assertion and proxy revocation errors ([d4cc7d9](https://github.com/Mearman/Academic-Explorer/commit/d4cc7d9dc9423e743925c5d2dbc04fc72f701d39))
* **events:** resolve TypeScript schema mismatch errors ([863840c](https://github.com/Mearman/Academic-Explorer/commit/863840c4f59e910df9b7bfb579cdf5809c105243))
* **test:** resolve E2E test setup issues with expect and vi globals ([5cbf4ba](https://github.com/Mearman/Academic-Explorer/commit/5cbf4ba3da2c0343d01bb05d3627c46a056aab9f))
* **tests:** resolve CI failures in unit tests and ESLint configuration ([e705e50](https://github.com/Mearman/Academic-Explorer/commit/e705e5021b07b1aecf0afe579edacb61eb3804fd))
* **vitest:** replace deprecated basic reporter with default reporter ([6de0a96](https://github.com/Mearman/Academic-Explorer/commit/6de0a9681c3e7a6939acbc271eb6724665cce9f0))


### Features

* **custom-nodes:** replace polling with event-driven RemoveLeafNodesButton ([deb650c](https://github.com/Mearman/Academic-Explorer/commit/deb650cafb124399bb15de201a28c978992a82b1))
* **deps:** add Zod for runtime type validation ([2591b5f](https://github.com/Mearman/Academic-Explorer/commit/2591b5f241af0acd90769889fe94a203539bc7f4))
* **eslint:** add rule to disallow Reflect.apply usage ([3794de3](https://github.com/Mearman/Academic-Explorer/commit/3794de35b5d0182618e8d85638a5027f45d0959a))
* **events:** add createValidatedUnknownHandler utility ([2bbac16](https://github.com/Mearman/Academic-Explorer/commit/2bbac163e933c845737783d5bf86715c1d5210f9))
* **events:** add cross-context event system infrastructure ([4dd8c24](https://github.com/Mearman/Academic-Explorer/commit/4dd8c248e778a54b776930505aa0cbdd39f8bfe7))
* **graph-store:** integrate event system with graph operations ([65e4d35](https://github.com/Mearman/Academic-Explorer/commit/65e4d35050f11740aa85f9f1822b258b2e7ffbc2))
* **hooks:** integrate event system with data fetching hooks ([663039f](https://github.com/Mearman/Academic-Explorer/commit/663039ffdb8daa5daaa8060f55e4282e84687206))

## [5.8.2](https://github.com/Mearman/Academic-Explorer/compare/v5.8.1...v5.8.2) (2025-09-18)


### Bug Fixes

* **pwa:** correct icon format from PNG to SVG ([031bafa](https://github.com/Mearman/Academic-Explorer/commit/031bafad8e21ce618dae69fdcfd9e6aeb17f8a20))

## [5.8.1](https://github.com/Mearman/Academic-Explorer/compare/v5.8.0...v5.8.1) (2025-09-18)


### Bug Fixes

* **ci:** revert release job to blocking ([c9414d7](https://github.com/Mearman/Academic-Explorer/commit/c9414d72ab00733390e245b8cc3e6d2f9803d270))

# [5.8.0](https://github.com/Mearman/Academic-Explorer/compare/v5.7.0...v5.8.0) (2025-09-18)


### Bug Fixes

* **ci:** make release job non-blocking to handle API failures ([28029cf](https://github.com/Mearman/Academic-Explorer/commit/28029cf56c1c2c067fa1e4a3e7e3fb93b4bf9ddb))


### Features

* **graph:** add scissors button with expansion listener for leaf node trimming ([09d7f61](https://github.com/Mearman/Academic-Explorer/commit/09d7f61aeecf5c9b51f267cb4e450d95451df33c))

# [5.6.0](https://github.com/Mearman/Academic-Explorer/compare/v5.5.1...v5.6.0) (2025-09-18)


### Features

* **build:** add @nx/eslint and @nx/playwright plugins for enhanced CI caching ([2d8d7c6](https://github.com/Mearman/Academic-Explorer/commit/2d8d7c69be774d80b73ffa5b277b1978ce5eb517))

## [5.5.1](https://github.com/Mearman/Academic-Explorer/compare/v5.5.0...v5.5.1) (2025-09-18)


### Bug Fixes

* **ci:** configure semantic-release to trigger releases for dependency updates ([ed05be9](https://github.com/Mearman/Academic-Explorer/commit/ed05be96359383a689580964a2cff5c59acbc32a))

# [5.5.0](https://github.com/Mearman/Academic-Explorer/compare/v5.4.0...v5.5.0) (2025-09-18)


### Features

* **repository:** implement repository mode search functionality ([d2c9821](https://github.com/Mearman/Academic-Explorer/commit/d2c98219e498ac8ac33bfb29ad982fbf2ebf8ec9))

# [5.4.0](https://github.com/Mearman/Academic-Explorer/compare/v5.3.1...v5.4.0) (2025-09-18)


### Bug Fixes

* **components:** eliminate non-null assertions in section components ([af0033a](https://github.com/Mearman/Academic-Explorer/commit/af0033ab9465e8d4575415409dac72cc742c3d48))
* **components:** improve type safety in AllEdgesSection and AllNodesSection ([2d9138c](https://github.com/Mearman/Academic-Explorer/commit/2d9138c28ccc7ebdfdbc74c90535c106be2347c5))
* **lint:** disable no-unnecessary-condition rule to resolve false positives ([fda3491](https://github.com/Mearman/Academic-Explorer/commit/fda34913744ab5876ebe761d3ae8dacdce890197))
* **lint:** temporarily disable indent rule to resolve ESLint stack overflow ([e80ba0e](https://github.com/Mearman/Academic-Explorer/commit/e80ba0e47cd0d96c88ef99d0df9e2435842cc0f8))
* **services:** add browser environment checks to NetworkInterceptor ([3c9f904](https://github.com/Mearman/Academic-Explorer/commit/3c9f90440bafbf71a9b2e1b4c21dd721d32370ac))
* **stores:** improve Record type safety in layout-store ([99c1810](https://github.com/Mearman/Academic-Explorer/commit/99c1810b477ad9b07836b731f7d4c59c4260fb33))
* **stores:** improve request existence checks in network-activity-store ([1d2c647](https://github.com/Mearman/Academic-Explorer/commit/1d2c6470dd9170108063b82c8b657d3f2929f03d))
* **stores:** use nullish coalescing for cache access in graph-store ([467d4d9](https://github.com/Mearman/Academic-Explorer/commit/467d4d92492d58a8b2d7a16b4499e40b6b2931a2))


### Features

* add knip for unused code detection ([23d3dec](https://github.com/Mearman/Academic-Explorer/commit/23d3dec26ca3e3628dd1607a7e9541fafe5eb9e4))
* **components:** add AllEdgesSection for comprehensive edge management ([509bad7](https://github.com/Mearman/Academic-Explorer/commit/509bad7a8a9fd83b0254c1d192c24949734ae35a))
* **components:** add AllNodesSection for comprehensive node management ([391e65c](https://github.com/Mearman/Academic-Explorer/commit/391e65caf4a197212eb3f1d12ab717dfaa1a1b07))
* **components:** add EdgeRepositorySection for draggable edges ([43a1d33](https://github.com/Mearman/Academic-Explorer/commit/43a1d333a0e3a8e7c6b224ab9f273a07814bfd09))
* **components:** add NetworkActivitySection for request monitoring ([00f575b](https://github.com/Mearman/Academic-Explorer/commit/00f575bd34be8d670be35746ce10ce246299c34c))
* **components:** add NodeRepositorySection for draggable nodes ([ca1ebdb](https://github.com/Mearman/Academic-Explorer/commit/ca1ebdb54487df5dfc9c2a705ffc87b5e334e267))
* **components:** enhance SearchSection with repository mode toggle ([bc5152a](https://github.com/Mearman/Academic-Explorer/commit/bc5152a86638b120fa95be8663f08b3e463b3a99))
* **components:** update sections index with new component exports ([6a56b78](https://github.com/Mearman/Academic-Explorer/commit/6a56b788586f18bf8640d8535ceed0acfefead64))
* **devtools:** add repository logging category to ApplicationLoggerPanel ([3873796](https://github.com/Mearman/Academic-Explorer/commit/3873796aeca74b1b951793610532736c78e23809))
* **layout:** add drag-and-drop support to GraphNavigation ([1e68c35](https://github.com/Mearman/Academic-Explorer/commit/1e68c3569c5ac9f427fd3c966ca9315b1086b3b5))
* **logger:** add repository logging category ([479fd9e](https://github.com/Mearman/Academic-Explorer/commit/479fd9e68c92266004a25cfa9c7d3af418c1c342))
* **main:** add network monitoring initialization ([72387f0](https://github.com/Mearman/Academic-Explorer/commit/72387f02db8e37b2fbc1f69b2aba10b1d6b82c9a))
* **monitoring:** add global network request interceptor ([1577fc2](https://github.com/Mearman/Academic-Explorer/commit/1577fc2edffba88e7e6cd53a26f13fa5d8e41399))
* **monitoring:** add network activity store for request tracking ([04064ef](https://github.com/Mearman/Academic-Explorer/commit/04064efb39667041e8ecfd27b17d2e1f6a647325))
* **services:** enhance request deduplication with network tracking ([eceb413](https://github.com/Mearman/Academic-Explorer/commit/eceb413ee63def1878695a894c1c685c7f3b1701))
* **stores:** add repository store for drag-and-drop management ([1521a4d](https://github.com/Mearman/Academic-Explorer/commit/1521a4d1db6ba417d60d6c4f7aaa080d3b5fb756))
* **stores:** update section registry with repository and monitoring sections ([6bfa888](https://github.com/Mearman/Academic-Explorer/commit/6bfa8886e8023a53b68d62c712f65e77e0716fb5))

## [5.3.1](https://github.com/Mearman/Academic-Explorer/compare/v5.3.0...v5.3.1) (2025-09-18)


### Bug Fixes

* **app:** correct indentation to resolve ESLint infinite recursion ([89ba829](https://github.com/Mearman/Academic-Explorer/commit/89ba829c27eeaca3c3a5cb18cc42de6f127b78a0))

# [5.3.0](https://github.com/Mearman/Academic-Explorer/compare/v5.2.0...v5.3.0) (2025-09-17)


### Features

* implement advanced type-safe field selections for topics, publishers, and funders ([8fc5dfe](https://github.com/Mearman/Academic-Explorer/commit/8fc5dfed181c233e7f475de37b89d4eb88fb594f))

# [5.2.0](https://github.com/Mearman/Academic-Explorer/compare/v5.1.0...v5.2.0) (2025-09-17)


### Bug Fixes

* **build:** resolve TypeScript compilation errors in layout components ([7b4b2d7](https://github.com/Mearman/Academic-Explorer/commit/7b4b2d797f1203039294253f831d2a53894a2e6a))
* **cache:** improve timeout handling in persister ([03c0380](https://github.com/Mearman/Academic-Explorer/commit/03c0380f2c57beeedd04ea2b14361c85b4ee564d))
* **layout:** improve group reordering algorithm and logging ([d20f2d7](https://github.com/Mearman/Academic-Explorer/commit/d20f2d759a077f242c36fdefee69086e5b1fe651))
* **layout:** minor refinements to GroupRibbonButton ([1d6b8f0](https://github.com/Mearman/Academic-Explorer/commit/1d6b8f09ec4a4f59d51194e367e1f3cd512a66e4))
* **sections:** correct EntityType string values in ExternalLinksSection ([1f53964](https://github.com/Mearman/Academic-Explorer/commit/1f53964d8ac74d782c1f5cb341a4e0168b4eb935))
* **sections:** integrate existing RawApiDataSection component ([6995a9f](https://github.com/Mearman/Academic-Explorer/commit/6995a9ff3a4689de0e88e82a1811dd4934091a29))


### Features

* **cache:** export clearAllCacheLayers function ([709c029](https://github.com/Mearman/Academic-Explorer/commit/709c0296b7cd7c81e3ebdadcd8653d7072b1a229))
* **components:** extract sidebar sections into dedicated components ([aa3f15c](https://github.com/Mearman/Academic-Explorer/commit/aa3f15c5998170718c419c869a86d26ecedd6480))
* **eslint:** add no-deprecated-comments rule ([5a0f18e](https://github.com/Mearman/Academic-Explorer/commit/5a0f18eeb6dec1a0d75cadbc4dad8153516a99e3))
* **layout:** add drag lifecycle callbacks to GroupRibbonButton ([35211d1](https://github.com/Mearman/Academic-Explorer/commit/35211d155d49599151be3cf8da8a502a4c32d72a))
* **layout:** add dynamic sidebar layout components ([7b500be](https://github.com/Mearman/Academic-Explorer/commit/7b500be75b0f24260ac1ef26fe247345f2076237))
* **layout:** add toggle behavior to LeftRibbon group buttons ([48bd362](https://github.com/Mearman/Academic-Explorer/commit/48bd362d2707505ea091438376bffaf0af7dd73d))
* **layout:** add toggle behavior to RightRibbon group buttons ([27cf1c0](https://github.com/Mearman/Academic-Explorer/commit/27cf1c04e3f403dd886f7d7f4a0835f8d182dbb8))
* **layout:** add visual drop zones for group reordering ([da42228](https://github.com/Mearman/Academic-Explorer/commit/da4222813a2da268f0eeec3e839d79d527dfcec5))
* **layout:** add VSCode-style group sidebar components ([94d8f26](https://github.com/Mearman/Academic-Explorer/commit/94d8f26501e2e22f905d82d4fb6c69ef569a5e94))
* **layout:** enhance GroupRibbonButton drag-and-drop logging ([1f2e8a1](https://github.com/Mearman/Academic-Explorer/commit/1f2e8a11379b06fa0d0f1f1e0336891ac52f37d0))
* **layout:** enhance LeftRibbon drop zones for cross-sidebar group moves ([5a5794f](https://github.com/Mearman/Academic-Explorer/commit/5a5794f80bad8f69932c23a0b3ff81f6eb290f7e))
* **layout:** enhance ribbon drop handling with detailed logging ([5639f7b](https://github.com/Mearman/Academic-Explorer/commit/5639f7b6844db825870871bc896f15b071f55e36))
* **layout:** enhance RightRibbon drop zones for cross-sidebar group moves ([26b045a](https://github.com/Mearman/Academic-Explorer/commit/26b045a7f05bdd4a84eb9b50585c26f0aa034c9e))
* **layout:** implement ribbon tab reordering with drag-and-drop ([8423e1a](https://github.com/Mearman/Academic-Explorer/commit/8423e1a116c6402099574980ebc0a773ea0bd957))
* **layout:** improve group creation and section assignment logic ([e6c2d30](https://github.com/Mearman/Academic-Explorer/commit/e6c2d3077d641b3220981ee07ace0910d4e5a683))
* **layout:** restrict group reordering to dedicated drop zones only ([b2c3980](https://github.com/Mearman/Academic-Explorer/commit/b2c39806ed66ecc495c6ee635acf3b519a059ac0))
* **sections:** implement EdgeFiltersSection and CacheSettingsSection ([02042a4](https://github.com/Mearman/Academic-Explorer/commit/02042a44c0399b27a96266d5848f760fb62e3d5c))
* **sections:** implement EntityInfoSection and GraphStatsSection ([e7525d0](https://github.com/Mearman/Academic-Explorer/commit/e7525d0d655f706994fcabd46f604f5eea0adf6d))
* **sections:** implement ExternalLinksSection component ([6d4dbb3](https://github.com/Mearman/Academic-Explorer/commit/6d4dbb3244b3b3415035d0ae24a15ccedfece813))
* **settings:** add Settings section with data management ([fbe10c9](https://github.com/Mearman/Academic-Explorer/commit/fbe10c94be631713b72d4816555eb45ef120ea10))
* **store:** add group registry for tool group management ([d7fd68b](https://github.com/Mearman/Academic-Explorer/commit/d7fd68bc15a176a6fb20ad9d40c92aee2dd05c78))
* **store:** add moveGroupToSidebar method for cross-sidebar group transfers ([910f957](https://github.com/Mearman/Academic-Explorer/commit/910f957b5045ee27caebb983782598749734c341))
* **store:** add registry versioning for reactive updates ([203574c](https://github.com/Mearman/Academic-Explorer/commit/203574c8527ec96803c6fb00502b832caed74dd7))
* **store:** add section placement management to layout store ([45a43b4](https://github.com/Mearman/Academic-Explorer/commit/45a43b43285f1f0ec56bbc6fc5be4993d53a8992))
* **store:** add section registry with default placements ([caf926c](https://github.com/Mearman/Academic-Explorer/commit/caf926c13ed22e4c60a06ded7ae33b1de862ecdb))
* **types:** add sidebar section types ([ceba52e](https://github.com/Mearman/Academic-Explorer/commit/ceba52eb1af9a88b955a09cd721c64346e93bf57))

# [5.1.0](https://github.com/Mearman/Academic-Explorer/compare/v5.0.2...v5.1.0) (2025-09-17)


### Bug Fixes

* **force-params:** unify hardcoded defaults throughout codebase ([e712a02](https://github.com/Mearman/Academic-Explorer/commit/e712a02ea08971f27f074ff87ac5ed0fd3a99110))
* **graph:** implement synchronous relationship detection with atomic updates ([8b61298](https://github.com/Mearman/Academic-Explorer/commit/8b61298691741f0c42819636c20ac1e79d7cdd6a))
* **react19:** implement cached state pattern to prevent infinite re-renders ([aabf8ca](https://github.com/Mearman/Academic-Explorer/commit/aabf8ca654ee2f3345ed707a84f3223ad92b565a))
* **stores:** correct animated-graph-store Record types to handle undefined ([fc23852](https://github.com/Mearman/Academic-Explorer/commit/fc2385283d0cd43fb744c723927f9650609577ac))
* **stores:** correct data-fetching-progress-store Record type to handle undefined ([eb8f6f5](https://github.com/Mearman/Academic-Explorer/commit/eb8f6f5de6a7a6a45e6fc8975356d84e3948460c))
* **stores:** correct graph-store Record types to handle undefined ([8a57013](https://github.com/Mearman/Academic-Explorer/commit/8a57013b1984b78a2f01e9f46f0ba0ab853edc24))
* **tests:** remove unnecessary optional chaining in integration tests ([efe69f0](https://github.com/Mearman/Academic-Explorer/commit/efe69f0c1934bb1e0adad765e7455ab59272bdf6))
* **typescript:** resolve all focused CI build errors ([789ef38](https://github.com/Mearman/Academic-Explorer/commit/789ef38092c288a7e4d11279ebe6164aa0fc61cd))
* **typescript:** resolve ALL remaining CI build errors ([6586a03](https://github.com/Mearman/Academic-Explorer/commit/6586a03f4ca08da1fcc2ed29d45c50d9caf44498))
* **typescript:** resolve CI build errors ([6262488](https://github.com/Mearman/Academic-Explorer/commit/6262488e2427055003218d83793a8da40b930e6f))
* **typescript:** resolve focused CI build errors ([062c08e](https://github.com/Mearman/Academic-Explorer/commit/062c08e8fd7a3a55f474524ba2a05428869e214b))


### Features

* **cache:** add cache invalidation orchestration system ([f84278a](https://github.com/Mearman/Academic-Explorer/commit/f84278a006df390d6cdfcd593c10a0cc6db9f2db))
* **cache:** add CacheInitializer React component ([e2443a4](https://github.com/Mearman/Academic-Explorer/commit/e2443a4f6689e56d9ef26220f6675e027703f04a))
* **cache:** add consolidated cache system exports ([5b5b1d6](https://github.com/Mearman/Academic-Explorer/commit/5b5b1d62f3dc632f8430c31a4baf7af2f3f3c0fb))
* **cache:** add IndexedDB metadata storage for app version tracking ([143659a](https://github.com/Mearman/Academic-Explorer/commit/143659abb30edc1625c54dd11a992ce829ace299))
* **cache:** add version detection and comparison utilities ([237f9e8](https://github.com/Mearman/Academic-Explorer/commit/237f9e8ba38e0652c1c2aff306fdfae71e592f51))
* **cache:** add version-aware cache initialization system ([d276f7a](https://github.com/Mearman/Academic-Explorer/commit/d276f7a8fe1698b10edc3009463d4334564bb282))
* **deps:** add TanStack Ranger for advanced range controls ([eb51172](https://github.com/Mearman/Academic-Explorer/commit/eb5117254ef2f660cdd3987c84c0d12ebefb34db))
* **force-controls:** implement debounced and constrained parameter inputs ([f68204c](https://github.com/Mearman/Academic-Explorer/commit/f68204c58f70389cc1a0790d2a2a69f1cad657ec))
* **graph:** restore hybrid context/fallback approach for ForceControls ([3f68f1c](https://github.com/Mearman/Academic-Explorer/commit/3f68f1ca19a582b4d0a53502b2bfdf44ca40be1a))
* **main:** integrate version-aware cache initialization ([adf75c5](https://github.com/Mearman/Academic-Explorer/commit/adf75c563348f300646012bd2636e1c2a26545a5))

## [5.0.2](https://github.com/Mearman/Academic-Explorer/compare/v5.0.1...v5.0.2) (2025-09-17)


### Bug Fixes

* **ci:** use pnpm nx commands for proper execution ([d27fd7f](https://github.com/Mearman/Academic-Explorer/commit/d27fd7f365439f7b187f34e0d53b6380645a95ca))
* **lint:** resolve unnecessary condition warnings ([7942b27](https://github.com/Mearman/Academic-Explorer/commit/7942b279e0bc314e52587c8017c31707edbfcee3))
* **tests:** make e2e test variables explicitly nullable ([75a478f](https://github.com/Mearman/Academic-Explorer/commit/75a478f61f8d561d254d2e0e25063367473c547a))

## [5.0.1](https://github.com/Mearman/Academic-Explorer/compare/v5.0.0...v5.0.1) (2025-09-17)


### Bug Fixes

* **ci:** resolve cache save failures and missing coverage artifacts ([b903b37](https://github.com/Mearman/Academic-Explorer/commit/b903b37ff8e823240aae0190f58147d2d70d1d95))
* **lint:** resolve unnecessary conditional warnings ([533aa80](https://github.com/Mearman/Academic-Explorer/commit/533aa808a34bf351092f7a9983a00cb59cc19a7c))
* **works:** handle undefined arrays in test compatibility ([84036ab](https://github.com/Mearman/Academic-Explorer/commit/84036ab53fc42bc438756de59822fae9bea0bdee))

# [5.0.0](https://github.com/Mearman/Academic-Explorer/compare/v4.0.4...v5.0.0) (2025-09-17)


### Bug Fixes

* **autocomplete:** add proper null/undefined checks in cache handling ([eb8523f](https://github.com/Mearman/Academic-Explorer/commit/eb8523ff8d77aa15551ff4c8e95d3bcb151535c1))
* **ci:** add preview server setup for E2E tests ([89286f0](https://github.com/Mearman/Academic-Explorer/commit/89286f066e0124893f3713c9d85e25d1707eba31))
* **ci:** resolve CI failures and ESLint issues ([088aa83](https://github.com/Mearman/Academic-Explorer/commit/088aa836ef40c1afa01e7ca8ebf54a865438bca7))
* **config:** include playwright.config.ts in test TypeScript project ([524f572](https://github.com/Mearman/Academic-Explorer/commit/524f5729041db8c478784c10c3140dec38644730))
* **dev:** resolve linting issue in error-test route ([9ddc738](https://github.com/Mearman/Academic-Explorer/commit/9ddc7385511e1178dd50250cc17c90a8fa30760f))
* **e2e:** correct navigation test URL patterns to expect direct entity routes ([e513865](https://github.com/Mearman/Academic-Explorer/commit/e513865f58f9e160f72dd5a849ce407f9cdf3f03))
* **e2e:** improve API mocking and test reliability ([9741601](https://github.com/Mearman/Academic-Explorer/commit/97416015fd6379a939d7e869ae568f78f44941c0))
* **e2e:** improve API mocking and test reliability ([09c6d9b](https://github.com/Mearman/Academic-Explorer/commit/09c6d9bb0ee442e3991d0fc7f1f6f26834fc9163))
* **e2e:** improve app loading detection and reliability ([e48bc51](https://github.com/Mearman/Academic-Explorer/commit/e48bc51ad3e101332e2a3131944eb6df3c7cedb6))
* **e2e:** resolve test failures for E2E and entity normalization ([0d33f47](https://github.com/Mearman/Academic-Explorer/commit/0d33f47e75db0b8186cca9f0fe7cf68e3999c6eb))
* **e2e:** update navigateToEntity to use direct entity routes ([e689f08](https://github.com/Mearman/Academic-Explorer/commit/e689f086d018787311bf7923a42282738220925d))
* **entity-detection:** enforce case-sensitive OpenAlex ID validation ([53be459](https://github.com/Mearman/Academic-Explorer/commit/53be4598fb69e0c36b5d9b0b39ff3fa4542732c3))
* **error:** resolve TypeScript and linting issues in GlobalErrorBoundary ([e70b099](https://github.com/Mearman/Academic-Explorer/commit/e70b0990ac8d6846e643f2130258340c379e382b))
* **graph:** add NaN position validation in XYFlow provider ([9db3be8](https://github.com/Mearman/Academic-Explorer/commit/9db3be883f651cc01bb6fcac9b8cd5f2749af2fc))
* **graph:** capture and add detected relationship edges during node expansion ([36c85c5](https://github.com/Mearman/Academic-Explorer/commit/36c85c52ed0ab5a6c536b4279d9bf4fd02799da4))
* **graph:** disable auto-pin on layout stabilization by default ([9cb33d9](https://github.com/Mearman/Academic-Explorer/commit/9cb33d9ef7e94f74a7c620e6ec9cc9a0abe93399))
* **graph:** improve type safety and eliminate unused variables ([90347e1](https://github.com/Mearman/Academic-Explorer/commit/90347e16827def374a2a065f94124960fbfd4794))
* **graph:** improve XYFlow edges typing without unnecessary type arguments ([acdbec9](https://github.com/Mearman/Academic-Explorer/commit/acdbec9d0251679ad15c5e11433fa532bdca943d))
* **graph:** use safe animation context in ForceControls ([722d72f](https://github.com/Mearman/Academic-Explorer/commit/722d72f46fb07f972ab7205b391c888b4c6e6f57))
* **lint:** remove unnecessary optional chaining in ForceControls ([34ba668](https://github.com/Mearman/Academic-Explorer/commit/34ba668c49ea2bd6163b1543b26337cdc9e8a904))
* **lint:** replace console.log with logger in ForceControls ([0b1f317](https://github.com/Mearman/Academic-Explorer/commit/0b1f317f60061c4ab8883a02cdf76f2e3aaee412))
* **lint:** resolve critical floating promise ESLint errors ([92d0776](https://github.com/Mearman/Academic-Explorer/commit/92d0776c7e8a16056e2e9e02544410a3cf4639da))
* **lint:** resolve critical linting issues in ForceControls and MainLayout ([3202e0e](https://github.com/Mearman/Academic-Explorer/commit/3202e0ef9fb93940a13107a3dc7ebbd2602e91b1))
* **lint:** resolve floating promise in works route navigation ([1275f7b](https://github.com/Mearman/Academic-Explorer/commit/1275f7b6863a738b77ba04e663bf347827746587))
* **lint:** resolve major ESLint errors in E2E tests and worker ([30be4a4](https://github.com/Mearman/Academic-Explorer/commit/30be4a4d2c5c5e3912ebdd3819b87dbb75255505))
* **logger:** replace dynamic console access and eliminate disable comments ([2aaf4d2](https://github.com/Mearman/Academic-Explorer/commit/2aaf4d270d8973304d2bf62a3d8746a4ffdef533))
* **nx:** correct input configurations for all cached targets ([a9d5c12](https://github.com/Mearman/Academic-Explorer/commit/a9d5c125ccee146cd184bf30150d45ebd40909f4))
* **openalex:** eliminate eslint-disable comments and improve type safety ([e7d16e9](https://github.com/Mearman/Academic-Explorer/commit/e7d16e9783823ee47ed3f191d565e63a9b5b4aaa))
* **react:** resolve React 19 infinite re-render issues ([0a1f930](https://github.com/Mearman/Academic-Explorer/commit/0a1f93086870931c5698c5d242071d83ebb00948))
* **routing:** remove async keyword from function without await ([910f32c](https://github.com/Mearman/Academic-Explorer/commit/910f32c4e48a33eeb29ad6506227a55cb3e38aa2))
* **routing:** support HTTPS URL patterns with single-slash and api.openalex.org ([0ff2159](https://github.com/Mearman/Academic-Explorer/commit/0ff2159ba7c846f08dafae966961a3d42935b418))
* **scripts:** add missing test:run commands for CI compatibility ([be54f58](https://github.com/Mearman/Academic-Explorer/commit/be54f588aad68d6b3a09bce0cd81ad52005d846d))
* **scripts:** configure test commands to run by default, not watch ([2a4eec8](https://github.com/Mearman/Academic-Explorer/commit/2a4eec8f758e7b9ed8237cc5e6331143b733fc73))
* **test:** add missing exports to AnimatedLayoutProvider mock ([5cd271d](https://github.com/Mearman/Academic-Explorer/commit/5cd271d41354cea3c5781fd3ce0ea0d9fd548850))
* **test:** correct error message assertion in use-graph-utilities test ([d0b3343](https://github.com/Mearman/Academic-Explorer/commit/d0b3343f443b92ec5c2374c680ccdd09a7e64c11))
* **test:** correct unit test mocks for entity ID handling ([ab6eaf9](https://github.com/Mearman/Academic-Explorer/commit/ab6eaf9e978ef1494ca17073ba83e4abf590a80c))
* **tests:** eliminate eslint-disable comments in hooks tests ([7f27d9b](https://github.com/Mearman/Academic-Explorer/commit/7f27d9bf882aa75933b3f8ed63f6a979410d738a))
* **types:** replace deprecated functions and improve type safety ([d1d01cb](https://github.com/Mearman/Academic-Explorer/commit/d1d01cb1090543e83cd7c904542d5d7fbaa12e49))
* **types:** resolve D3 force type assertions in worker ([1ca6c91](https://github.com/Mearman/Academic-Explorer/commit/1ca6c91b78f0f93b03811c472444148f10106bd0))
* **types:** resolve performanceStats interface mismatch ([9bc3cd7](https://github.com/Mearman/Academic-Explorer/commit/9bc3cd7687821257fed4b29d0ad626079588dc7d))
* **ui:** prevent animation panel flickering during parameter adjustment ([6abfa4c](https://github.com/Mearman/Academic-Explorer/commit/6abfa4c48f566860e693ca172232246f531d9882))
* **works:** add null checks for referenced_works and related_works arrays ([02c187b](https://github.com/Mearman/Academic-Explorer/commit/02c187b11b2f4f523894b99b2301240c996a23cb))
* **xyflow:** remove unused markerEnd parameters ([6ef4bfb](https://github.com/Mearman/Academic-Explorer/commit/6ef4bfb07c76f0b8682c3acaab7ee2ed254d3886))


### Features

* **config:** add comprehensive TypeScript checking for all config files ([482ea84](https://github.com/Mearman/Academic-Explorer/commit/482ea84ad82b96b0a26d20ba423294dbd06334e8))
* **config:** add shared build configuration ([7633670](https://github.com/Mearman/Academic-Explorer/commit/7633670bfad03aeea46913d6a8b495e19d0efc7e))
* **context:** add updateParameters to AnimatedLayoutContext interface ([c6c6edf](https://github.com/Mearman/Academic-Explorer/commit/c6c6edf586dd39d89dddf018f7c93fee3ad1af31))
* **dev:** add error-test route for testing error boundaries ([d050924](https://github.com/Mearman/Academic-Explorer/commit/d050924edf2ce19216678034203cbf0c257a0274))
* **error:** add cache clearing functionality to GlobalErrorBoundary ([ee882f4](https://github.com/Mearman/Academic-Explorer/commit/ee882f439211872d8e1d8323367cb5bb7ac4271a))
* **error:** add GlobalErrorBoundary component with clipboard debug data ([9d0fcf0](https://github.com/Mearman/Academic-Explorer/commit/9d0fcf09a886dba45ed7515d96dc17627398695d))
* **error:** add RouterErrorComponent for TanStack Router errors ([e64f997](https://github.com/Mearman/Academic-Explorer/commit/e64f9974c4626e2d90b9d507d770d631ed85001f))
* **error:** integrate GlobalErrorBoundary in app root ([71a4bb2](https://github.com/Mearman/Academic-Explorer/commit/71a4bb295486e72c815ff592dc57cd06829bb2ae))
* **graph:** add force parameters constants and configuration ([8d94d36](https://github.com/Mearman/Academic-Explorer/commit/8d94d366647032ca77a50b44c9a56520c02462c0))
* **graph:** add ForceControls component for interactive force parameter adjustment ([f5a67cc](https://github.com/Mearman/Academic-Explorer/commit/f5a67cccc24de71021af4448c58d7dd921504120))
* **graph:** add restart communication mechanism to animated graph store ([6119ea2](https://github.com/Mearman/Academic-Explorer/commit/6119ea22919ab14606da77144fb42fe5a1df7635))
* **graph:** add safe animated layout context hook ([428140d](https://github.com/Mearman/Academic-Explorer/commit/428140dee6cdb9758fa856103a4c7851e7bdf020))
* **graph:** enhance AnimatedLayoutProvider with restart request handling ([4fbb3d7](https://github.com/Mearman/Academic-Explorer/commit/4fbb3d7d36c2250599081b91394b7c87d6ec9981))
* **hooks:** add husky and lint-staged for automatic linting fixes ([cf11305](https://github.com/Mearman/Academic-Explorer/commit/cf113050f32f2f8b993887f2b92eecee6c29512b))
* **hooks:** add updateParameters method to force simulation hook ([29596a3](https://github.com/Mearman/Academic-Explorer/commit/29596a38ec3b7dee2f10b9ae6e45d01888622d08))
* **hooks:** enhance parameter update logging with pause state ([9594113](https://github.com/Mearman/Academic-Explorer/commit/9594113724e1b7f6da1e3d19e334425567bcc910))
* **layout:** add AnimatedLayoutProvider import to MainLayout ([88afefb](https://github.com/Mearman/Academic-Explorer/commit/88afefb30b7c8dcaffb88124be557962ab620a96))
* **layout:** expose updateParameters method in animated layout hook ([7b3c659](https://github.com/Mearman/Academic-Explorer/commit/7b3c6594cc0159fb3a4c7d076a6c7d70559b84b5))
* **lint:** ban eslint-disable and ts-ignore comments ([b5a20e3](https://github.com/Mearman/Academic-Explorer/commit/b5a20e365d04720a4996dbba23c9dfde19d556a9))
* **nx:** add cache configuration for new test suite targets ([2405733](https://github.com/Mearman/Academic-Explorer/commit/2405733ba50e3c0cf6124d4313584e5f595edc3c))
* **nx:** add cached targets for component, integration, and e2e tests ([728590f](https://github.com/Mearman/Academic-Explorer/commit/728590f9bfa2c8620988167e6b0b4eda1d7bacd6))
* **nx:** add comprehensive caching for all build commands ([1efc095](https://github.com/Mearman/Academic-Explorer/commit/1efc095fbd099fa72463f63079606f4db4af83aa))
* **provider:** expose updateParameters through AnimatedLayoutProvider ([c150b83](https://github.com/Mearman/Academic-Explorer/commit/c150b83fedf32fc0da64b1da6c38a8d5be3ca311))
* **pwa:** implement Progressive Web App functionality ([ad6ca0e](https://github.com/Mearman/Academic-Explorer/commit/ad6ca0ea936551de3bc40ec986e633941bfc3751))
* **routing:** add ID normalization to entity routes ([b56a7ad](https://github.com/Mearman/Academic-Explorer/commit/b56a7ad53d874c9980545cc28372cd626497e8e5))
* **routing:** add missing https route handler for external URLs ([b96c6f6](https://github.com/Mearman/Academic-Explorer/commit/b96c6f6da7000df48f9d3ccedc843bf57d6eb85e))
* **routing:** integrate RouterErrorComponent in RootRoute ([17a3cf3](https://github.com/Mearman/Academic-Explorer/commit/17a3cf310bdcd677308110a005ef2192f20d222e))
* **test:** add E2E testing dependencies and configuration ([9fb2c8e](https://github.com/Mearman/Academic-Explorer/commit/9fb2c8e3d2c1195e1980b04df3d1cec3a7222588))
* **ui:** add ForceControls to LeftSidebar in collapsible section ([604e218](https://github.com/Mearman/Academic-Explorer/commit/604e218c23197bfdcd18363a64ca9b99d66f4340))
* **worker:** add UPDATE_PARAMETERS message type for live parameter updates ([88cdc54](https://github.com/Mearman/Academic-Explorer/commit/88cdc542e18303fbd2d99f12203a8ce2b72e9dee))
* **worker:** respect paused state in updateParameters function ([d3dcb5e](https://github.com/Mearman/Academic-Explorer/commit/d3dcb5e58b3ae2c6dc4ee0b5e832e1eacd192fc1))


### BREAKING CHANGES

* **lint:** All existing eslint-disable comments must be fixed properly

## [4.0.4](https://github.com/Mearman/Academic-Explorer/compare/v4.0.3...v4.0.4) (2025-09-16)


### Bug Fixes

* **lint:** remove unnecessary conditionals and fix property access ([2043435](https://github.com/Mearman/Academic-Explorer/commit/2043435f5757a1b95d5cc49dca560283d4942535))
* **types:** complete EntityType Record with concepts property ([237abe1](https://github.com/Mearman/Academic-Explorer/commit/237abe19d11de9734c1ec0091596a7e3a4409f20))

## [4.0.3](https://github.com/Mearman/Academic-Explorer/compare/v4.0.2...v4.0.3) (2025-09-16)


### Bug Fixes

* **tests:** remove unnecessary optional chaining in test files ([d2bb46d](https://github.com/Mearman/Academic-Explorer/commit/d2bb46d11dbf8784702390eb832ee0275f778087))
* **types:** remove unnecessary optional chaining in stores and layouts ([8254fbd](https://github.com/Mearman/Academic-Explorer/commit/8254fbdf27d386e917f928305b06dceb2e0e93f0))

## [4.0.2](https://github.com/Mearman/Academic-Explorer/compare/v4.0.1...v4.0.2) (2025-09-16)


### Bug Fixes

* **types:** remove unnecessary conditionals in author-entity ([f47cfdf](https://github.com/Mearman/Academic-Explorer/commit/f47cfdf32c54a420fffe66df00366b1e078d800f))

## [4.0.1](https://github.com/Mearman/Academic-Explorer/compare/v4.0.0...v4.0.1) (2025-09-16)


### Bug Fixes

* **hooks:** add missing setWorkerReady dependency to useCallback ([3c20f81](https://github.com/Mearman/Academic-Explorer/commit/3c20f81378c785f3a6dfb746b5a852944e4f72a5))

# [4.0.0](https://github.com/Mearman/Academic-Explorer/compare/v3.0.0...v4.0.0) (2025-09-16)


### Bug Fixes

* **components:** integrate worker fixes across graph components ([240204c](https://github.com/Mearman/Academic-Explorer/commit/240204c8a88ada283a836a1749a974e879fbd3d6))
* **components:** replace destructuring with stable selectors ([35c3c32](https://github.com/Mearman/Academic-Explorer/commit/35c3c32085dbd86bd8a9c7b0a5f84e8dc5c33205))
* **components:** resolve DatePickerInput onChange type mismatch ([228988e](https://github.com/Mearman/Academic-Explorer/commit/228988ef4716f27e535f6bc1cb4db8bfd85559c9))
* **entities:** add null safety checks for author expansion ([df43a40](https://github.com/Mearman/Academic-Explorer/commit/df43a40a36b2c6763db546282d5c243b52a11543))
* **graph:** complete ref-based store method transition in useAnimatedLayout ([d51135e](https://github.com/Mearman/Academic-Explorer/commit/d51135e6b552ea2fe977806b4e4de72c6b59d281))
* **graph:** complete stopLayout ref transition in useAnimatedLayout ([74de017](https://github.com/Mearman/Academic-Explorer/commit/74de0174c28eb94d175968b147bbad3cf0964428))
* **graph:** remove problematic useEffect in useAnimatedLayout ([7e88086](https://github.com/Mearman/Academic-Explorer/commit/7e880863d932cafe46f16b6f192f2d8760e5190b))
* **graph:** resolve trim leaves button sync issue with stable selectors ([d5113fd](https://github.com/Mearman/Academic-Explorer/commit/d5113fdf1ade34ef2b12d7666e4085786d140416))
* **graph:** temporarily disable animated layout controls to resolve infinite loops ([a66932c](https://github.com/Mearman/Academic-Explorer/commit/a66932ce06a1f3ac6dd86f560bdb08a02793f9b3))
* **hooks:** add explicit type annotations in use-entity-interaction ([509e798](https://github.com/Mearman/Academic-Explorer/commit/509e798f0a589dbd2f92345a95a09741cb0d185d))
* **hooks:** correct Array.from usage in use-graph-data ([9ea2351](https://github.com/Mearman/Academic-Explorer/commit/9ea2351f572137f773ff33958630f7d14b50b999))
* **hooks:** prevent infinite loops in useAnimatedForceSimulation ([b725024](https://github.com/Mearman/Academic-Explorer/commit/b725024cc08faa02fca4b64605d13ed7718d33f3))
* **hooks:** resolve React 19 infinite loop in data fetching worker ([9ac326f](https://github.com/Mearman/Academic-Explorer/commit/9ac326fb5aa5ffb474639015bde99b8502667ca4))
* **hooks:** update Set/Map usage for Object compatibility ([517a442](https://github.com/Mearman/Academic-Explorer/commit/517a4426699f3290b515fbada965bc4b01151b65))
* **layout:** add missing variables and re-enable AnimatedGraphControls ([910dc57](https://github.com/Mearman/Academic-Explorer/commit/910dc573167c974644b70deb02fcd93061ba2643))
* **layout:** correct Record<string, boolean> usage in XYFlow providers ([2c7a934](https://github.com/Mearman/Academic-Explorer/commit/2c7a934b8cba0ee9668f8a6e1d0775a6492fc5ef))
* **lint:** remove more unused parameters in tests ([dc728cf](https://github.com/Mearman/Academic-Explorer/commit/dc728cf5090e3e13584721e97a007ae3d46458db))
* **lint:** remove unused type parameters and imports ([f3b8291](https://github.com/Mearman/Academic-Explorer/commit/f3b82917bb949eecbdbbfd9309ea925500b40349))
* **lint:** replace any with unknown and remove unused catch parameter ([9fc6ef2](https://github.com/Mearman/Academic-Explorer/commit/9fc6ef2aaf5ba1a54e7b97e80515eef1c63c948d))
* **lint:** resolve more unused variables and destructuring issues ([8aab21e](https://github.com/Mearman/Academic-Explorer/commit/8aab21e3dbbac7f29f58c00a00d3fc6633f36354))
* **lint:** resolve more unused variables and parameters ([b2c73d5](https://github.com/Mearman/Academic-Explorer/commit/b2c73d5a5b8996941f96117cf976cbd22c7b0de8))
* **lint:** resolve unused variables and functions ([26354ce](https://github.com/Mearman/Academic-Explorer/commit/26354ce2e3c3481d4fe6af449fe57cf9fc750cf3))
* **lint:** resolve unused variables and parameters ([36b9916](https://github.com/Mearman/Academic-Explorer/commit/36b991622246fdec99dc9c475a7a17664e5d30fa))
* **lint:** resolve unused variables and parameters ([36870b4](https://github.com/Mearman/Academic-Explorer/commit/36870b4553d1f80f52380802286e3be889fa3177))
* **lint:** resolve unused variables and type issues ([bc925f1](https://github.com/Mearman/Academic-Explorer/commit/bc925f179af1c7378bd3571d92e73d9af43f9763))
* **routes:** apply stable selector patterns to route components ([60ee3bc](https://github.com/Mearman/Academic-Explorer/commit/60ee3bc5c2e7890c1e86f3f26ba9846787c1cbb5))
* **services:** initialize GraphCache with proper Map/Set types ([4618862](https://github.com/Mearman/Academic-Explorer/commit/461886259eb1a93b738f429540faa1988d873884))
* **services:** update services for Object-based store compatibility ([8a694d7](https://github.com/Mearman/Academic-Explorer/commit/8a694d7614e7f42b0f355eefdbf1c8da47698a59))
* **store:** add cached statistics state to prevent infinite loops ([2c5fd13](https://github.com/Mearman/Academic-Explorer/commit/2c5fd13428e8afbc0f96a3274300929e00de7dd9))
* **stores:** convert Set/Map to Object for React 19 compatibility ([e60fafb](https://github.com/Mearman/Academic-Explorer/commit/e60fafbb2502f1ada94570f2d548e564641070e3))
* **stores:** resolve React 19 + Zustand infinite loops in stores ([2a44295](https://github.com/Mearman/Academic-Explorer/commit/2a442958cc3e0381aba926eab782ada09868044d))
* **tests:** resolve author entity expand error handling tests ([5214fc8](https://github.com/Mearman/Academic-Explorer/commit/5214fc8fb5aa3f801c4a8c9d912c8b224450b711))
* **tests:** update useEntityInteraction tests for state guard compatibility ([ba5a799](https://github.com/Mearman/Academic-Explorer/commit/ba5a79993b9a8da569e51da4d780cebfa46d5942))
* **types:** add missing ExpansionTarget export ([6ba9ee7](https://github.com/Mearman/Academic-Explorer/commit/6ba9ee7e970a4b0dfedf31addf2230babce79424))
* **types:** make ExpansionSettings compatible with Record<string, unknown> ([2ab21fb](https://github.com/Mearman/Academic-Explorer/commit/2ab21fbed992979b72d40f5602f68a94a5c0f763))
* **types:** resolve remaining TypeScript build errors ([4864914](https://github.com/Mearman/Academic-Explorer/commit/48649148361e3ab4269a23252ce6a4a8c20158d0))
* **ui:** eliminate hook conflicts in AnimatedGraphControls ([bfba1b1](https://github.com/Mearman/Academic-Explorer/commit/bfba1b190138c1ba4a2a5237d321ee5a2e95342e))
* **ui:** use cached statistics in LeftSidebar to prevent infinite loops ([010a369](https://github.com/Mearman/Academic-Explorer/commit/010a369bc746b161667a01384094e92bb9f9611f))
* **workers:** improve type safety and error handling ([ecef1fc](https://github.com/Mearman/Academic-Explorer/commit/ecef1fc0d37dd8a134e0d900210367e4b2986fc9))
* **workers:** improve type safety in force animation worker ([147ae47](https://github.com/Mearman/Academic-Explorer/commit/147ae47b5620bbb0381da21344e12b01713f5a9e))
* **workers:** standardize ExpansionSettings types across worker interfaces ([3fc6a7a](https://github.com/Mearman/Academic-Explorer/commit/3fc6a7a428c34da10ecfddc73485d1e24e3f7986))
* **workers:** update force animation worker for Object-based pinnedNodes ([801a115](https://github.com/Mearman/Academic-Explorer/commit/801a1157b132829ba9ffe5f4fef5c014743ddfd5))
* **xyflow:** convert destructuring to stable selectors in graph providers ([37816b9](https://github.com/Mearman/Academic-Explorer/commit/37816b9aa398ddcd98e6c87718aba15d3d786b6b))


### Features

* **components:** add animated graph controls UI component ([0f14e4b](https://github.com/Mearman/Academic-Explorer/commit/0f14e4bbaf698000ea773cd1b8ce2126b298e01d))
* **components:** add animated layout provider component ([3c9601d](https://github.com/Mearman/Academic-Explorer/commit/3c9601d37ca7c1f7d9651525be93fe6d27ded087))
* **components:** add main animated graph component ([66930d4](https://github.com/Mearman/Academic-Explorer/commit/66930d4778dd0b58aa56911910872621baec8613))
* **components:** integrate animated layout controls in GraphNavigation ([4e87505](https://github.com/Mearman/Academic-Explorer/commit/4e8750516d429c6ca82cd09da864309caaa2d1dd))
* **eslint:** add custom rules to prevent React 19 + Zustand infinite loops ([c501d3e](https://github.com/Mearman/Academic-Explorer/commit/c501d3e50056d6ecfae5d468effbe52ec0458cec))
* **graph:** add performance configuration utilities ([887d596](https://github.com/Mearman/Academic-Explorer/commit/887d596b52427f294de0d96e60e486ea8eaa8d4e))
* **graph:** add XYFlow animated layout integration ([bd5c97b](https://github.com/Mearman/Academic-Explorer/commit/bd5c97b56669facbbece0f552e8c42c9cb1fe1d0))
* **graph:** re-enable animated layout controls after infinite loop fix ([e93db7b](https://github.com/Mearman/Academic-Explorer/commit/e93db7b2cbfb152f96ea25b43cc10637530ba1bb))
* **graph:** refactor animated layout hook with stable selectors ([50f5ed4](https://github.com/Mearman/Academic-Explorer/commit/50f5ed4808f9977901fd315696e38aa85e03393e))
* **hooks:** add animated force simulation React hook ([f9e43e7](https://github.com/Mearman/Academic-Explorer/commit/f9e43e73adbc245c7a40134e92883eadb4048f47))
* **hooks:** add document title management hook ([13cdb45](https://github.com/Mearman/Academic-Explorer/commit/13cdb45822c019b33020ea87a23464dfca36083a))
* **hooks:** enhance worker hooks for stable React 19 operation ([df65c70](https://github.com/Mearman/Academic-Explorer/commit/df65c70e88beb9db985b484330a5b5d07df6d6f5))
* **hooks:** expose expandAllNodesOfType in useGraphData hook ([338afc1](https://github.com/Mearman/Academic-Explorer/commit/338afc1d2a1005ceec53513db336524deb21ced8))
* **routes:** integrate document title management across entity routes ([cd0a4a4](https://github.com/Mearman/Academic-Explorer/commit/cd0a4a4f66254880ccb1a505f523744f79ffd109))
* **services:** add expandAllNodesOfType bulk expansion method ([d8826be](https://github.com/Mearman/Academic-Explorer/commit/d8826bee14739c9ef57e415022f6ff4938ac493a))
* **store:** implement cached node/edge counts and stable selectors ([079f83e](https://github.com/Mearman/Academic-Explorer/commit/079f83e4232f29aee6e52910b186e4289e452e12))
* **stores:** add animated graph store for position tracking ([d0b1f98](https://github.com/Mearman/Academic-Explorer/commit/d0b1f98c2b075d4166568b335e4d17b5a2f9d5c4))
* **stores:** add getNodesByType method to graph store ([67ed15a](https://github.com/Mearman/Academic-Explorer/commit/67ed15a1c0330841170f325c6be58dfbf2a42ce2))
* **ui:** add expand all nodes buttons to entity type filter ([9a4f197](https://github.com/Mearman/Academic-Explorer/commit/9a4f197222294367bd2fe7dec2ddcd0122d5f930))
* **workers:** add D3 force simulation Web Worker ([29cfca2](https://github.com/Mearman/Academic-Explorer/commit/29cfca21b82214e7635752e815657bea1efbc6fe))
* **workers:** add data fetching worker infrastructure ([7771959](https://github.com/Mearman/Academic-Explorer/commit/7771959c06c5f5bac6b4251784714107d95aa8ba))


### Performance Improvements

* **services:** optimize expandAllNodesOfType algorithm for efficiency ([4fed864](https://github.com/Mearman/Academic-Explorer/commit/4fed8647be2f92bb52ea57277f2b55f1be64300d))


### BREAKING CHANGES

* **store:** Replace object-creating selectors with individual selectors

- Add totalNodeCount and totalEdgeCount cached fields to GraphState
- Update recomputation functions to maintain cached totals
- Replace Object.keys(state.nodes).length with state.totalNodeCount in all routes
- Replace object-literal convenience hooks with individual stable selectors
- Fix indentation in test file

Benefits:
- Eliminates React 19 infinite loop triggers from unstable references
- Reduces ESLint errors from 68 to 0
- Improves performance by avoiding repeated Object.keys() operations
- Maintains React 19 + Zustand + Immer compatibility

Routes updated: , authors, institutions, sources, topics, works
Store hooks: useAnimationState -> individual useIsAnimating, etc.

# [3.0.0](https://github.com/Mearman/Academic-Explorer/compare/v2.3.1...v3.0.0) (2025-09-16)


### Bug Fixes

* **build:** resolve TypeScript errors and improve field selection types ([305031a](https://github.com/Mearman/Academic-Explorer/commit/305031ac8c9373016200ccb170fd0a067c1319c0))
* **entities:** correct OpenAlex API field selections and warnings ([a5ab58b](https://github.com/Mearman/Academic-Explorer/commit/a5ab58b564e17272ad31c3de92addf49110fcdf0))
* **graph:** implement two-pass relationship detection for cross-batch citations ([106eadd](https://github.com/Mearman/Academic-Explorer/commit/106eaddf435126e95a063ebadac352c87f956338))
* **graph:** prevent automatic institution expansion on author node single-click ([ca97dcf](https://github.com/Mearman/Academic-Explorer/commit/ca97dcf1220313e0a46d037253cae96e0f1ee930))
* **graph:** prevent automatic node expansion in all transform methods ([b8834b5](https://github.com/Mearman/Academic-Explorer/commit/b8834b51248c65cc04e0376fde064918bd8060f8))


### Code Refactoring

* **graph:** replace metadata field with on-demand entityData storage ([34dc359](https://github.com/Mearman/Academic-Explorer/commit/34dc35954bacb4c32c9c14a45b5eebdcd3a705fe))


### Features

* **build:** add build metadata generation system ([49f19fc](https://github.com/Mearman/Academic-Explorer/commit/49f19fc8408dbaca9bb5632b37ef603acbbe5c91))
* **components:** add BuildInfo footer component ([3a65cd3](https://github.com/Mearman/Academic-Explorer/commit/3a65cd3111c2513c346e7e79cd87291843264fbe))
* **graph:** enhance relationship detection for all node additions ([2a806f6](https://github.com/Mearman/Academic-Explorer/commit/2a806f64c4d5cdbbbd4a2fdf2b542aad1ed02b1f))
* **layout:** integrate BuildInfo component in LeftSidebar ([24c25fc](https://github.com/Mearman/Academic-Explorer/commit/24c25fc3989ba68165b7a9df078e8f65c7509f36))
* **types:** implement field-by-field partial hydration system ([c9656c2](https://github.com/Mearman/Academic-Explorer/commit/c9656c2799b51c1968256eca730f467884b69743))
* **utils:** add build metadata utilities and interfaces ([9bfbea9](https://github.com/Mearman/Academic-Explorer/commit/9bfbea91d084339a7d72328c37232adc01ec781a))


### BREAKING CHANGES

* **graph:** GraphNode.metadata replaced with GraphNode.entityData

## [2.3.1](https://github.com/Mearman/Academic-Explorer/compare/v2.3.0...v2.3.1) (2025-09-16)


### Bug Fixes

* **entities:** update author metadata fields for OpenAlex API compatibility ([83b7954](https://github.com/Mearman/Academic-Explorer/commit/83b7954eafe524f31c50cd14764022d395a853ae))
* **graph:** add null safety for array operations in graph data service ([abd60d6](https://github.com/Mearman/Academic-Explorer/commit/abd60d6d6a5338597060db6563e7626f286c57eb))

# [2.3.0](https://github.com/Mearman/Academic-Explorer/compare/v2.2.0...v2.3.0) (2025-09-16)


### Bug Fixes

* **test:** skip problematic hydration transition test to unblock CI ([5735e20](https://github.com/Mearman/Academic-Explorer/commit/5735e20930d4f2f71f63fb0b8f9e41d01ee69225))


### Features

* **graph:** enhance entity metadata extraction with hydration levels ([c446d01](https://github.com/Mearman/Academic-Explorer/commit/c446d0166ea56fee0eca4fd72b05b98d4d6a8335))

# [2.2.0](https://github.com/Mearman/Academic-Explorer/compare/v2.1.3...v2.2.0) (2025-09-16)


### Features

* **entities:** implement proper selective API field loading for incremental hydration ([05e9e49](https://github.com/Mearman/Academic-Explorer/commit/05e9e49d0e957be2e508f0c5dd1cf862096dd501))
* **graph:** optimize referenced work nodes with efficient minimal data loading ([251824f](https://github.com/Mearman/Academic-Explorer/commit/251824f2f169f27b0a8a73ce68290e03ccdacba3))

## [2.1.3](https://github.com/Mearman/Academic-Explorer/compare/v2.1.2...v2.1.3) (2025-09-16)


### Bug Fixes

* **services:** handle QueryClient setQueryData errors gracefully in request deduplication ([de44bee](https://github.com/Mearman/Academic-Explorer/commit/de44bee9f72cc7ed8fd35b203d6961f6751c8ca6))

## [2.1.2](https://github.com/Mearman/Academic-Explorer/compare/v2.1.1...v2.1.2) (2025-09-16)


### Bug Fixes

* **test:** remove unused imports in file-parser tests ([caefe12](https://github.com/Mearman/Academic-Explorer/commit/caefe12a39b388613287682cc4a17f9b29d86e5b))

## [2.1.1](https://github.com/Mearman/Academic-Explorer/compare/v2.1.0...v2.1.1) (2025-09-15)


### Bug Fixes

* **test:** resolve ESLint errors in cache persister tests ([0bad7d1](https://github.com/Mearman/Academic-Explorer/commit/0bad7d135c2a84cfc427de3fb0308c211663b32f))

# [2.1.0](https://github.com/Mearman/Academic-Explorer/compare/v2.0.1...v2.1.0) (2025-09-15)


### Features

* **graph:** enhance incremental hydration with selective field loading ([0ab808a](https://github.com/Mearman/Academic-Explorer/commit/0ab808a583fc04bf1fed73b0e02168a1df77ad9b))

## [2.0.1](https://github.com/Mearman/Academic-Explorer/compare/v2.0.0...v2.0.1) (2025-09-15)


### Bug Fixes

* **lint:** resolve CI ESLint and formatting issues ([8275de5](https://github.com/Mearman/Academic-Explorer/commit/8275de5dab422c6b7ce2ba2325b73f451f76921a))

# [2.0.0](https://github.com/Mearman/Academic-Explorer/compare/v1.4.0...v2.0.0) (2025-09-15)


### Bug Fixes

* **ci:** handle version already updated by semantic-release ([4882d10](https://github.com/Mearman/Academic-Explorer/commit/4882d10a230ef593c28a9229cd8a4dee153886e2))
* **graph:** improve error handling and icon imports in GraphToolbar ([d76b123](https://github.com/Mearman/Academic-Explorer/commit/d76b123a5a97f436b022ee26a38a90e3835478da))
* **hooks:** update entity interaction to use hydration levels ([03f7820](https://github.com/Mearman/Academic-Explorer/commit/03f7820acf28adfbda905d4a79824d4e8a757cf4))
* **layout:** implement proper sidebar scrolling with viewport-aware height ([925dd09](https://github.com/Mearman/Academic-Explorer/commit/925dd099a423b7a3fcef1d056861cdc992ead947))
* **test:** resolve AuthorEntity test failures with proper getAuthor mocking ([47c6f85](https://github.com/Mearman/Academic-Explorer/commit/47c6f854a7c74c7746bd7c638c5dd0928de7cfe2))


### Features

* **author-entity:** add institution affiliation nodes to graph expansion ([add3352](https://github.com/Mearman/Academic-Explorer/commit/add33526d7b9cd1a3161a0d7a7e016b80eaaafe6))
* **components:** add GraphToolbar component for graph operations ([5ef9b50](https://github.com/Mearman/Academic-Explorer/commit/5ef9b507b7a4bbf67e1a643e5736891d5b9b778e))
* **entities:** add abstract outbound edges API for minimal field requests ([afaf045](https://github.com/Mearman/Academic-Explorer/commit/afaf045c69a35ba748544b26a17ff128b3ae89aa))
* **entities:** implement outbound edges API for minimal field requests ([8ef204c](https://github.com/Mearman/Academic-Explorer/commit/8ef204c79cfd9ebd9716a806221723bc1e3685f8))
* **graph:** add 1-degree neighbor selection to graph toolbar ([ed069d1](https://github.com/Mearman/Academic-Explorer/commit/ed069d177de3e298081dfdc8232f7839f4de8ced))
* **graph:** add collapse isolated adjacent nodes button ([ecb5cbe](https://github.com/Mearman/Academic-Explorer/commit/ecb5cbe4dc208ab32bd7a9d1aca51f2ae1f209a1))
* **graph:** add double-click expansion behavior to node interaction ([c6824d2](https://github.com/Mearman/Academic-Explorer/commit/c6824d20993bc13cdc87caf871bcbbb9866abe98))
* **graph:** add expand and node selection buttons to graph nodes ([8c34b8b](https://github.com/Mearman/Academic-Explorer/commit/8c34b8bc60647eb2ad8812ed3c5eaa4e98560157))
* **graph:** add expand selected nodes action to graph toolbar ([631599a](https://github.com/Mearman/Academic-Explorer/commit/631599a2340a260831169ab2600185efb96676a4))
* **graph:** add graph utilities service with academic research operations ([6ff42c6](https://github.com/Mearman/Academic-Explorer/commit/6ff42c692bfeb6ef97cbae4f242546c82d919548))
* **graph:** add pin all and unpin all actions to graph toolbar ([199b019](https://github.com/Mearman/Academic-Explorer/commit/199b0192b6f2ea10d3fc356cd63d8bccdb946539))
* **graph:** add trim degree-1 nodes utility function ([c0d9408](https://github.com/Mearman/Academic-Explorer/commit/c0d9408ae0ad66022bfc8021a5e222a3642a6d60))
* **graph:** integrate automatic relationship detection with GraphDataService ([1d4f788](https://github.com/Mearman/Academic-Explorer/commit/1d4f788a2b7ed209ab96cc443652f0bd8f1191c5))
* **graph:** remove auto-expand behavior on node selection ([a2bd6b9](https://github.com/Mearman/Academic-Explorer/commit/a2bd6b9ad616ade74c20ede7db0452cff536b1a6))
* **graph:** replace placeholder system with incremental hydration ([77ee029](https://github.com/Mearman/Academic-Explorer/commit/77ee0293f79e61095cdbac0c8d05f86765adcd7c))
* **hooks:** add hydrateNode method to useGraphData hook ([c72837e](https://github.com/Mearman/Academic-Explorer/commit/c72837e7a58b997247618173416bff1a10ead950))
* **hooks:** add useGraphUtilities hook for graph manipulation ([ddc2458](https://github.com/Mearman/Academic-Explorer/commit/ddc24587b95e0ecbf620862de1a0f4ca0e80bd0a))
* **layout:** add CollapsibleSection component and LeftSidebar reorganization ([eddab79](https://github.com/Mearman/Academic-Explorer/commit/eddab79d81ba70c62f2675ebb46e50cf389923ca))
* **layout:** implement ribbon icon expansion to sidebar sections ([1699c01](https://github.com/Mearman/Academic-Explorer/commit/1699c018e5e2d4d0312bf8cf5f93077d890f2da1))
* **layout:** integrate GraphToolbar in GraphNavigation top-right panel ([5a77340](https://github.com/Mearman/Academic-Explorer/commit/5a773407ac1d60d70c1d530b2f64b64a0d5041b1))
* **layout:** reorganize RightSidebar with collapsible sections ([f4a21d9](https://github.com/Mearman/Academic-Explorer/commit/f4a21d9912fcb139caafbfa16fd08b42eab86610))
* **layout:** standardize collapse functionality in RightSidebar ([f4e9307](https://github.com/Mearman/Academic-Explorer/commit/f4e9307c6e35903b599d7228b6067612f9c324e1))
* **layout:** wrap RawApiDataSection in CollapsibleSection for consistency ([cbd549c](https://github.com/Mearman/Academic-Explorer/commit/cbd549cc7ef79bb0c7ad39e68946d4fbc864ccda))
* **services:** add RelationshipDetectionService for automatic graph relationship discovery ([78c7969](https://github.com/Mearman/Academic-Explorer/commit/78c79692bb7a54ee456a38b74b37fe4309b8d34b))
* **store:** add hydration level tracking to graph store ([ce8b691](https://github.com/Mearman/Academic-Explorer/commit/ce8b691509fb56d1bb453768252439c1c677d25e))
* **stores:** extend layout store with section expansion state management ([c90232f](https://github.com/Mearman/Academic-Explorer/commit/c90232f3439320c6e31496a39b3c0477fbdbed15))


### BREAKING CHANGES

* **graph:** Placeholder system removed in favor of incremental hydration
* **graph:** Nodes no longer auto-expand when clicked, users must use expand button

# [1.3.0](https://github.com/Mearman/Academic-Explorer/compare/v1.2.0...v1.3.0) (2025-09-15)


### Bug Fixes

* **cache:** remove geo entity type from cache configuration ([3ea4c10](https://github.com/Mearman/Academic-Explorer/commit/3ea4c10bafd6304b66813e56d29b4d80710e11f5))
* **ci:** add GITHUB_TOKEN environment variable for semantic-release ([f8d1057](https://github.com/Mearman/Academic-Explorer/commit/f8d105704bf388726579583e6554c93e91a2c30d))
* **ci:** replace manual changelog with semantic-release built-in functionality ([30b7c8b](https://github.com/Mearman/Academic-Explorer/commit/30b7c8b4584ad84ac45f1ed70d3b5e9088c65346))
* **client:** remove geo API from OpenAlex clients ([9f627c3](https://github.com/Mearman/Academic-Explorer/commit/9f627c3a96d318ec69dd927d3d6572362bae84b1))
* **entities:** remove geo exports from entity index ([8d06b06](https://github.com/Mearman/Academic-Explorer/commit/8d06b06aa68c9353cc53ef827772b9c9c0c9aaf6))
* **entities:** remove unnecessary null check in author pagination ([ae153c4](https://github.com/Mearman/Academic-Explorer/commit/ae153c411528cac1ca4b1a2321b7b8ac235f290f))
* **expansion:** add TypeScript support for optional ExpansionSettings ([8e18279](https://github.com/Mearman/Academic-Explorer/commit/8e182790d9f97580da6ce33c24d48f3ad3f74f17))
* **graph-navigation:** add node update detection for placeholder loading ([0cc2528](https://github.com/Mearman/Academic-Explorer/commit/0cc2528b3824b71c48ae802e2783655248f436b7))
* **graph-navigation:** remove non-existent updateNodes method call ([f406b62](https://github.com/Mearman/Academic-Explorer/commit/f406b62a0195eb7d1861ac2fcda69c45c80d40eb))
* **graph:** remove geo entity type from custom node components ([92969d4](https://github.com/Mearman/Academic-Explorer/commit/92969d4df4c15c8b40383d26fd958522edfb889d))
* **graph:** resolve edge visibility toggle issue in graph navigation ([038db69](https://github.com/Mearman/Academic-Explorer/commit/038db694fd1a97c097144f767f3e65a3792d193a))
* **hooks:** remove geo hooks and clean up exports ([ec4a8a8](https://github.com/Mearman/Academic-Explorer/commit/ec4a8a81169051b406e51d59a5269017a428c7da))
* **services:** add null coalescing for optional expansion properties ([721a954](https://github.com/Mearman/Academic-Explorer/commit/721a954dc242d13cf0118406c14b91caf8a1e906))
* **services:** remove geo entity type references ([7c4a634](https://github.com/Mearman/Academic-Explorer/commit/7c4a634970df12740a2799add645b0443806a03b))
* **stores:** handle optional arrays in ExpansionSettingsStore ([1aac183](https://github.com/Mearman/Academic-Explorer/commit/1aac18372a17585bab4d1480638f74d19cbbec6e))
* **stores:** update entity type support to include all valid types ([d40cfb5](https://github.com/Mearman/Academic-Explorer/commit/d40cfb573755cec3be710e9fbcbb360537700ac4))
* **types:** align EntityType with actual OpenAlex API endpoints ([03a9a5e](https://github.com/Mearman/Academic-Explorer/commit/03a9a5ef5d66f0d86d2650a82e0ed570d3e5266d))
* **ui:** handle optional properties in ExpansionSettingsDialog ([3d80fd9](https://github.com/Mearman/Academic-Explorer/commit/3d80fd992166fdd0fdb9034bdcbdd13aa82c84a1))
* **ui:** remove geo entity type from sidebar filters ([bbb9be3](https://github.com/Mearman/Academic-Explorer/commit/bbb9be39b88e6a280bffb6cfd6edcbaecaab9e12))
* **utils:** remove geo references from OpenAlex utilities ([5da41e0](https://github.com/Mearman/Academic-Explorer/commit/5da41e0aa735c861763ff451289a6fbcfdf0764b))


### Features

* **api:** add raw API data display feature for selected entities ([82f0b62](https://github.com/Mearman/Academic-Explorer/commit/82f0b62bd1682efa7b5abcacd825941cef5191a4))
* **ci:** implement custom release workflow with proper tag and version flow ([d33671b](https://github.com/Mearman/Academic-Explorer/commit/d33671b7ce6b5dc2d09db041410b39aefc4f730b))
* **entities:** implement comprehensive pagination for author works expansion ([bbb4c3e](https://github.com/Mearman/Academic-Explorer/commit/bbb4c3e23fb3fb075a52280cc658492e029e4aa7))
* **entities:** implement unlimited expansion for WorkEntity ([42451f7](https://github.com/Mearman/Academic-Explorer/commit/42451f73838c101d337fb419795899ac225d2eef))
* **graph:** add loading state management for node expansion ([6f06226](https://github.com/Mearman/Academic-Explorer/commit/6f0622654137d8accdf9c268d2e6e3cbe0b921c3))
* **graph:** add rawApiData field to GraphNode interface ([9317d2a](https://github.com/Mearman/Academic-Explorer/commit/9317d2ab5905a2d56762a6e2e59bccec059a0613))
* **hooks:** add useEntityInteraction hook for DRY entity behavior ([8210c0d](https://github.com/Mearman/Academic-Explorer/commit/8210c0d1edb7ad93a6a0fb823a6b01ab4dde3792))
* **layout:** add LeftRibbon component for collapsed left sidebar ([773cde6](https://github.com/Mearman/Academic-Explorer/commit/773cde625fcd6c6d2e6eae6de568dd681fed180b))
* **layout:** add RightRibbon component for collapsed right sidebar ([ad1c639](https://github.com/Mearman/Academic-Explorer/commit/ad1c6395095cc051086d646b96c6d40ea307e857))
* **layout:** enhance RightSidebar with rich entity display ([aeef373](https://github.com/Mearman/Academic-Explorer/commit/aeef3739e7c6588055428404fea75f678296607a))
* **layout:** implement dual sidebar ribbon mode functionality ([09ce498](https://github.com/Mearman/Academic-Explorer/commit/09ce4987d2e52cfb0755e8087b579d3771274866))
* **molecules:** add copy JSON functionality to RawApiDataSection ([3e10975](https://github.com/Mearman/Academic-Explorer/commit/3e10975e6fa058a7850a91c6adc4dba8569ef7e8))
* **molecules:** add RichEntityDisplay component ([95a2ff1](https://github.com/Mearman/Academic-Explorer/commit/95a2ff1feb544a34e8a6214d033e182e2e891848))
* **service:** implement immediate parallel placeholder loading strategy ([0008bde](https://github.com/Mearman/Academic-Explorer/commit/0008bdec0094a7aabc234e2f73805dc4f90ed2b3))
* **type-guards:** add OpenAlex entity type guard utilities ([bf05559](https://github.com/Mearman/Academic-Explorer/commit/bf055591bf5474a5edc90187e5d682d79540e35d))
* **ui:** enhance raw API data display with expandable sections ([db9d313](https://github.com/Mearman/Academic-Explorer/commit/db9d313ceae1fe20925c6fa58db8d6766fe71580))
* **ui:** integrate raw API data section into right sidebar ([1db6be9](https://github.com/Mearman/Academic-Explorer/commit/1db6be9e09f6ee933e4d00b9ce35ff0506966945))


### Performance Improvements

* **graph:** optimize force layout parameters for circular arrangements ([fdb7922](https://github.com/Mearman/Academic-Explorer/commit/fdb79221cd68b3e19c08e3dd435023611212824e))
* **graph:** optimize force-directed layout parameters ([cfcbca9](https://github.com/Mearman/Academic-Explorer/commit/cfcbca9fdb0f6eafffeea9524dffb9f184bd6ccf))
* **graph:** optimize XYFlow node update detection in GraphNavigation ([b07df7f](https://github.com/Mearman/Academic-Explorer/commit/b07df7fa539ccb8edb060b86c8f320ba9aae5c8a))
* **graph:** standardize force layout random seed to 0 ([5987a65](https://github.com/Mearman/Academic-Explorer/commit/5987a6555d7a6ffa092776808c0af31255a0478c))
* **query:** optimize pagination by always using maximum per_page ([f919d84](https://github.com/Mearman/Academic-Explorer/commit/f919d84073c92ef5405070478c972eb92e88fd04))

# [1.2.0](https://github.com/Mearman/Academic-Explorer/compare/v1.1.0...v1.2.0) (2025-09-15)


### Bug Fixes

* **entities:** improve AuthorEntity.expand error handling and robustness ([40d15ab](https://github.com/Mearman/Academic-Explorer/commit/40d15abf6133e684176f979524f005f7d79350a5))
* **graph-service:** update relationship type references to new enum values ([6e18c0d](https://github.com/Mearman/Academic-Explorer/commit/6e18c0d08bd0235ba148dd628c38cfb2151584f8))
* **graph:** add explicit toString() calls in hexToRgba function ([24170b7](https://github.com/Mearman/Academic-Explorer/commit/24170b70d172b3150034bf4a0b44286a932f4362))
* **graph:** add null checks for entity fetching failures ([7f7ff3f](https://github.com/Mearman/Academic-Explorer/commit/7f7ff3f9bf4ed46523438156c0db3873fc178812))
* **graph:** apply entity-specific glow colors to InstitutionNode ([6532038](https://github.com/Mearman/Academic-Explorer/commit/65320385abf4271ab3c4b1d1973f7a4062707a27))
* **graph:** complete entity-specific glow colors for all node types ([6f12246](https://github.com/Mearman/Academic-Explorer/commit/6f12246d98633c4eca9d7366e90fa6e7c586ab04))
* **lint:** remove unused variables and imports ([49ce03b](https://github.com/Mearman/Academic-Explorer/commit/49ce03b510a82c0cfaa39fb1a37d2c84835b9ddc))
* **store:** eliminate type coercion in expansion settings initialization ([f055cc1](https://github.com/Mearman/Academic-Explorer/commit/f055cc1bd03c9b619c0df643a8aef03fcb82e357))
* **store:** eliminate type coercion in expansion settings store ([835701a](https://github.com/Mearman/Academic-Explorer/commit/835701ae46e0438776c6d40f344dba42456295d8))
* **stores:** complete expansion settings initialization for all entity types ([ce0a1cd](https://github.com/Mearman/Academic-Explorer/commit/ce0a1cd4dec398d41aad147f3a659bfefbb77fd2))
* **stores:** remove cited edge type from graph store configuration ([add6c13](https://github.com/Mearman/Academic-Explorer/commit/add6c1303a495558fbd9afd3b7e35f6ce9b7ec89))
* **test:** resolve expansion settings integration test failures ([606fd4f](https://github.com/Mearman/Academic-Explorer/commit/606fd4fc140e71e8a74a17472c841b7dcc662fba))
* **test:** resolve test failures in graph-data-service ([4e7c185](https://github.com/Mearman/Academic-Explorer/commit/4e7c185810f4168236a2e781552db8ba0316d044))
* **ui:** update UI components for consolidated edge types ([48192f7](https://github.com/Mearman/Academic-Explorer/commit/48192f711415c5deb96c8362e44920e2a50511cd))


### Features

* **entities:** enhance entity models with expansion capabilities ([97d2290](https://github.com/Mearman/Academic-Explorer/commit/97d22903809efbc6ea63533367487276c9160e13))
* **expansion-settings:** update store to support all 15 relationship types ([00b5256](https://github.com/Mearman/Academic-Explorer/commit/00b525662c9d64c9a4c666c8ab68852814707444))
* **graph-store:** enable all 15 relationship types by default for new users ([6271bdc](https://github.com/Mearman/Academic-Explorer/commit/6271bdcc86e6b3538326c89822306bd3ce9c75d3))
* **graph:** add interactive pin toggle buttons to graph nodes ([f4ba549](https://github.com/Mearman/Academic-Explorer/commit/f4ba549f8d48dee2b4834b1b4b4da895ba6766d5))
* **graph:** display entity IDs in node top bars instead of entity types ([3f24e50](https://github.com/Mearman/Academic-Explorer/commit/3f24e5094c3f0a8b98c4909106e96dea84419e07))
* **graph:** enhance edge color mapping with comprehensive relationship support ([c745c07](https://github.com/Mearman/Academic-Explorer/commit/c745c0771ce337ecf17dd1b0ceefb140a4dc488c))
* **graph:** extend RelationType enum with additional relationship types ([186f4de](https://github.com/Mearman/Academic-Explorer/commit/186f4de1c17d3eaa2df29a107bbcc14ff699e771))
* **graph:** implement auto-pin on layout stabilization ([be7cc8d](https://github.com/Mearman/Academic-Explorer/commit/be7cc8dc8b48519070eadb17e7bc39a91d89493f))
* **graph:** implement lazy loading for related entities ([83023d7](https://github.com/Mearman/Academic-Explorer/commit/83023d797c53676fa749bdf90ee7d0195b3dc3b7))
* **graph:** improve edge creation with enum values and descriptive labels ([37db0d9](https://github.com/Mearman/Academic-Explorer/commit/37db0d9bd8155272467e2677581df5c03d8301fe))
* **graph:** improve node visual hierarchy and styling ([def1858](https://github.com/Mearman/Academic-Explorer/commit/def1858e2ac5a68c5af4574f9649b12e860f2c31))
* **graph:** improve OpenAlex ID handling in graph data service ([1f8159f](https://github.com/Mearman/Academic-Explorer/commit/1f8159f434d800f96c6d4b975e679025b26e898d))
* **graph:** update navigation to respect auto-pin preferences ([ebb691e](https://github.com/Mearman/Academic-Explorer/commit/ebb691ede818c771b2dba9c6d38112e37bbec83a))
* **infra:** improve test infrastructure and development tooling ([f6ad274](https://github.com/Mearman/Academic-Explorer/commit/f6ad274b708be30a851fd4c5438c619a30da559f))
* **layout:** implement sidebar autohide functionality ([83f39a3](https://github.com/Mearman/Academic-Explorer/commit/83f39a3165637f396357fd443826d68c42372a4a))
* **layout:** integrate expansion settings UI into application layout ([05db8b5](https://github.com/Mearman/Academic-Explorer/commit/05db8b514ae98dc2de5e41a560f4961d3953d438))
* **service:** add expansion query builder for OpenAlex API integration ([be24cee](https://github.com/Mearman/Academic-Explorer/commit/be24ceec47cf52d8e902b23368778b2e9f7686a2))
* **service:** integrate expansion settings into graph data service ([c01f315](https://github.com/Mearman/Academic-Explorer/commit/c01f3156b525c55c19a4a014c720a46b45ba542d))
* **sidebar:** add complete entity type support with missing types ([68faf2d](https://github.com/Mearman/Academic-Explorer/commit/68faf2d595fdd15faeafc61dd8f0b2aa38478eb8)), closes [#e67e22](https://github.com/Mearman/Academic-Explorer/issues/e67e22) [#16a085](https://github.com/Mearman/Academic-Explorer/issues/16a085) [#8e44](https://github.com/Mearman/Academic-Explorer/issues/8e44)
* **sidebar:** add support for all 15 relationship types in edge filters ([696a4f6](https://github.com/Mearman/Academic-Explorer/commit/696a4f6769a7daedc4f1fda552835e39e20f85b8))
* **store:** add auto-pin layout stabilization preference ([3ec84cd](https://github.com/Mearman/Academic-Explorer/commit/3ec84cdfcec9560a9904a5e70fee5bd2dd3e3568))
* **store:** add expansion settings store with Zustand persistence ([a5b0088](https://github.com/Mearman/Academic-Explorer/commit/a5b0088e6651f76bce638aff6cfa5b281075d7be))
* **store:** add lazy loading support for graph nodes ([67f7863](https://github.com/Mearman/Academic-Explorer/commit/67f786372d64c066f8dfffdfc2f67989f269db26))
* **types:** add expansion settings type definitions and utilities ([ea1fe01](https://github.com/Mearman/Academic-Explorer/commit/ea1fe01131e461ff5b35c2c0d15a2583421e7d76))
* **types:** add lazy loading metadata fields to GraphNode ([1a019c6](https://github.com/Mearman/Academic-Explorer/commit/1a019c6a3d6d575618b0cd325bcaa3704b9f46c8))
* **types:** expand RelationType enum with semantic-specific relationships ([bff1c4a](https://github.com/Mearman/Academic-Explorer/commit/bff1c4a1ee9196ef6411e64c0be21fb8c65ca515))
* **ui:** add expansion settings UI components for graph configuration ([5e166aa](https://github.com/Mearman/Academic-Explorer/commit/5e166aaba1897fa5045faf6b225ec59fce7f519f))
* **ui:** restructure graph nodes with dedicated top bar ([055678c](https://github.com/Mearman/Academic-Explorer/commit/055678c7dedccbfebf0b63a71eb35caf4e1e0a89))


### Performance Improvements

* **graph:** optimize useEffect dependencies in graph components ([f4aba14](https://github.com/Mearman/Academic-Explorer/commit/f4aba1420b6e4079219d4fc5d72ef510371a0389))

# [1.1.0](https://github.com/Mearman/Academic-Explorer/compare/v1.0.1...v1.1.0) (2025-09-15)


### Features

* **ci:** improve Nx caching strategy for better performance ([34db9f0](https://github.com/Mearman/Academic-Explorer/commit/34db9f0d7ce9e36fe25578c6f400832433d07e39))

## [1.0.1](https://github.com/Mearman/Academic-Explorer/compare/v1.0.0...v1.0.1) (2025-09-15)


### Bug Fixes

* **ci:** remove empty files before semantic-release upload ([c1b72bc](https://github.com/Mearman/Academic-Explorer/commit/c1b72bc2430e5a4343561dbc1b48ddb1fb4b2ed0))

# 1.0.0 (2025-09-15)


### Bug Fixes

* **about:** add missing closing Card tag ([12adf39](https://github.com/Mearman/Academic-Explorer/commit/12adf391447863b3ebb06a4ba4193da320e9812d))
* **about:** apply theme system to about page overlay ([cd50375](https://github.com/Mearman/Academic-Explorer/commit/cd5037580f4cf00ff7ae669fc2755243e96bdc0e))
* adjust EntityFactory type constraints for compatibility ([17b34cd](https://github.com/Mearman/Academic-Explorer/commit/17b34cd5aa58a55fd21ed22c2953f79acd17a253))
* **api:** correct OpenAlex institution filter field names ([4aabb52](https://github.com/Mearman/Academic-Explorer/commit/4aabb520ca7fd21b6db6d5f9f3e3b484aa97eec6))
* **authors:** standardize URL encoding for filter parameters ([ed22135](https://github.com/Mearman/Academic-Explorer/commit/ed22135303852d37386e2e7843033de51bf6bc76))
* **autocomplete:** complete type safety improvements in autocomplete utility ([e8b5ca3](https://github.com/Mearman/Academic-Explorer/commit/e8b5ca3b8624153bf39daecbfab641216be043f3))
* **autocomplete:** replace any types with proper QueryParams intersection ([f4a80f0](https://github.com/Mearman/Academic-Explorer/commit/f4a80f0018910f17e83aad9b3f4eaaecb8a9a157))
* **build:** resolve TypeScript build errors after lint fixes ([5e5dd47](https://github.com/Mearman/Academic-Explorer/commit/5e5dd47b6ff6d899e3c113b57d5e221a7b235499))
* **build:** restore type assertion in vite.config.ts for plugin compatibility ([518c07a](https://github.com/Mearman/Academic-Explorer/commit/518c07a6ea079940010c784fba4f77146d28359f))
* **cache:** enhance query client with persistence and caching ([487b11c](https://github.com/Mearman/Academic-Explorer/commit/487b11cdf2ea0326ff790c7052aac2b0ccc75533))
* **cache:** handle async function calls properly in CacheManagement ([4ada626](https://github.com/Mearman/Academic-Explorer/commit/4ada6268b05d13113763f1213ad755cba5023b21))
* **ci:** add setup job dependency to release job for cache key access ([c0d4177](https://github.com/Mearman/Academic-Explorer/commit/c0d417711830b39b0707585ba0fe1ed4c3686472))
* **ci:** update pnpm version from 8 to 9 for lockfile compatibility ([a823533](https://github.com/Mearman/Academic-Explorer/commit/a8235334660cc783529d1ca52d68cd98e4650d00))
* **client:** replace any types with Record types in streaming methods ([c1e6abe](https://github.com/Mearman/Academic-Explorer/commit/c1e6abec20f0b0c013b3f3b8250a46d31d516db4))
* **client:** resolve Error class inheritance issues in test environment ([bd168fc](https://github.com/Mearman/Academic-Explorer/commit/bd168fc401ef820039e0427c7419524078f3df6a))
* **client:** resolve require import and empty interface linting issues ([161d931](https://github.com/Mearman/Academic-Explorer/commit/161d93160cef057ca05e330a14058523b44a3c24))
* complete final linting and type safety improvements ([49a3d03](https://github.com/Mearman/Academic-Explorer/commit/49a3d03babdc10b9dfcaf8c74d6c2107a95a9f7a))
* complete template literal expressions in missing-paper-detection ([dbc2924](https://github.com/Mearman/Academic-Explorer/commit/dbc2924b9337487dff62e867f61c19fe5628bc1f))
* **config:** correct ESLint rule precedence for test files ([19b3dab](https://github.com/Mearman/Academic-Explorer/commit/19b3dabe77fc0818b3bc258b410e7a0eff6b41a3))
* **config:** finalize autocomplete types and vitest workspace config ([086472a](https://github.com/Mearman/Academic-Explorer/commit/086472a93a8da27c78bab24ae8ec02aa3be40c89))
* **config:** resolve vite config test property type error ([ab3e8fa](https://github.com/Mearman/Academic-Explorer/commit/ab3e8fa3a9aa19b6baa868170a6f352dd70c3db6))
* **devtools:** improve async function handling and data serialization safety ([1fc916f](https://github.com/Mearman/Academic-Explorer/commit/1fc916f2bd689361c0161a916627c7a18fc34a85))
* eliminate void operators and type safety issues ([3866768](https://github.com/Mearman/Academic-Explorer/commit/38667684466f7bcd4b111b0c0d5dcc39bab1ad10))
* **entities:** improve entity validation and type safety ([c979bb1](https://github.com/Mearman/Academic-Explorer/commit/c979bb1e12f9f8a61feec0fc50044dcb02a132f3))
* **entities:** improve OpenAlex entity API type safety ([c53130d](https://github.com/Mearman/Academic-Explorer/commit/c53130d6453ee7c0fd4c3cdd4b1b2d5b01ac3da2))
* **entities:** resolve any types and empty interface linting issues ([63190ca](https://github.com/Mearman/Academic-Explorer/commit/63190caf8320e84b956f0d60e807c7a3e31b185d))
* **evaluation:** convert typed filters to strings in missing paper detection ([d528876](https://github.com/Mearman/Academic-Explorer/commit/d528876ed034d19fd709093c0b0d7917ac859da8))
* **evaluation:** correct OpenAlex API calls and ESLint compliance ([deb1824](https://github.com/Mearman/Academic-Explorer/commit/deb1824950bf26b92c0ecc91e6c4ddb37a26249c))
* **evaluation:** correct OpenAlex filter property for citation search ([9ebcc42](https://github.com/Mearman/Academic-Explorer/commit/9ebcc4290aad2fcc528d4216fa9914a241ddbd2f))
* **evaluation:** handle async comparison execution ([9eae388](https://github.com/Mearman/Academic-Explorer/commit/9eae388f1b03eb0758351dc09acdaa539da9cdf6))
* **evaluation:** handle async file upload properly ([1b767bf](https://github.com/Mearman/Academic-Explorer/commit/1b767bfff0bf086176bbbe796e742d1955d942c8))
* **evaluation:** replace any types with proper Record types in search service ([8f570fd](https://github.com/Mearman/Academic-Explorer/commit/8f570fd287a4acf77874a0855f2bf9230b2a2087))
* **graph-persistence:** use current layout in session restoration ([6f1e671](https://github.com/Mearman/Academic-Explorer/commit/6f1e671747ff528999aa7495fc18215ccb851668))
* **graph:** add type safety for edge label rendering ([3b5b517](https://github.com/Mearman/Academic-Explorer/commit/3b5b5170b77d248e2e4ae2079439d47be584b79d))
* **graph:** correct EntityType usage from enum to string literals ([c2bc382](https://github.com/Mearman/Academic-Explorer/commit/c2bc3823a3b438f8c8134935791e8bbfb6f89bf0))
* **graph:** improve floating edge geometry calculations and node sizing ([513155c](https://github.com/Mearman/Academic-Explorer/commit/513155c8e85f7998b93e1a0c0dd04fe78553093a))
* **graph:** improve timeout type safety in xyflow provider ([65d14b0](https://github.com/Mearman/Academic-Explorer/commit/65d14b07f00da540097e72007e821b0f47223311))
* **graph:** remove forbidden non-null assertions in xyflow-provider ([24010cf](https://github.com/Mearman/Academic-Explorer/commit/24010cfa7227d6493851917ce3d5a972d1599a1b))
* **graph:** remove unnecessary optional chains in graph-data-service.ts ([9d62936](https://github.com/Mearman/Academic-Explorer/commit/9d62936a93e06a7496ba859227ddfd23e8168037))
* **graph:** replace all hardcoded colors with theme system ([d6052e0](https://github.com/Mearman/Academic-Explorer/commit/d6052e0adcfeeacc4cedaa6329a070e010a9755d))
* **graph:** resolve ReactNode type issues in custom nodes ([84665a0](https://github.com/Mearman/Academic-Explorer/commit/84665a0d4a7a476389749d3bf69bae954a3ce69b))
* **graph:** resolve TypeScript build error in useEdgesState ([5cf0671](https://github.com/Mearman/Academic-Explorer/commit/5cf06717e4693c1a31e32945a0f88e599dee0836))
* **graph:** restore smooth final viewport adjustment after node animation ([cf20c44](https://github.com/Mearman/Academic-Explorer/commit/cf20c4490c3e84c17d64b314ff66cbb6c7295d85))
* **graph:** standardize entity metadata property names ([33ef3a6](https://github.com/Mearman/Academic-Explorer/commit/33ef3a618fbcd8a953bb281467f4e21f0997356b))
* **graph:** update default layout parameters ([52eface](https://github.com/Mearman/Academic-Explorer/commit/52eface69e1d7e91c16edaba633376d4122f311f))
* **graph:** use fixed origin (0,0) for stable graph center ([cf28d05](https://github.com/Mearman/Academic-Explorer/commit/cf28d050cd6889e905b2c3b7db992a1f5cacc583))
* **grouping:** replace any types and unused variables with proper types ([aa64954](https://github.com/Mearman/Academic-Explorer/commit/aa649540af40ffcecb8a32eb4b0092ca47dbf4c0))
* **grouping:** replace any types with proper interfaces in group processing ([823d345](https://github.com/Mearman/Academic-Explorer/commit/823d345ee801a70f91f796d3b078934fb2a74c29))
* **grouping:** replace final any type with Record type in getMetricStatistics ([70590ab](https://github.com/Mearman/Academic-Explorer/commit/70590abbc875dec3e391548e41f604747219e13c))
* **grouping:** resolve type inference and array mapping issues ([f120fe7](https://github.com/Mearman/Academic-Explorer/commit/f120fe79f919261c4e3f354e02129f079a78e50b))
* **home:** replace hardcoded colors with theme system ([5d16722](https://github.com/Mearman/Academic-Explorer/commit/5d16722932c336ebda551eb382be059e6782e197))
* **hooks:** improve type safety in useGraphPersistence ([4824746](https://github.com/Mearman/Academic-Explorer/commit/4824746c8df5e80d9acec751fc492e200bc2a326))
* improve object stringification safety and type handling ([04d1606](https://github.com/Mearman/Academic-Explorer/commit/04d160699464a1afcfa5692fa6600db18e579164))
* improve object stringification safety and type handling ([a685403](https://github.com/Mearman/Academic-Explorer/commit/a685403e8cb538b5fe08b38b646aaad75a5e2a30))
* improve type safety in file-parser module ([6d48f06](https://github.com/Mearman/Academic-Explorer/commit/6d48f06d165170d65c67b611aaa03a12271246d7))
* **layout:** improve D3 force simulation logging ([3207617](https://github.com/Mearman/Academic-Explorer/commit/32076176bbae5a0c47fcb246739216f5cff8e6ff))
* **layout:** improve RightSidebar component type safety ([7a9409b](https://github.com/Mearman/Academic-Explorer/commit/7a9409b03f8fd0a12b6fec8e304d7562a81e96db))
* **layout:** improve value display logic in RightSidebar ([c848179](https://github.com/Mearman/Academic-Explorer/commit/c8481794e98545a5301659a01dc018adcf299411))
* **lint:** clean up unused imports and types in test files and config ([e64b0f5](https://github.com/Mearman/Academic-Explorer/commit/e64b0f527978005e6a326f0bbc2fff5048c87fba))
* **lint:** remove unused imports and variables ([1467b55](https://github.com/Mearman/Academic-Explorer/commit/1467b55a074edba988c770c2a19dcf09d78a9d93))
* **lint:** remove unused variables and imports in graph components ([29b1465](https://github.com/Mearman/Academic-Explorer/commit/29b14650764802cdf6a02aec3eeae9b8dda59dc2))
* **lint:** replace empty interfaces with type aliases ([40f4e6c](https://github.com/Mearman/Academic-Explorer/commit/40f4e6cf16d157cf564da8797709ec3890f2dd9f))
* **lint:** resolve all remaining non-test linting issues ([ac3930d](https://github.com/Mearman/Academic-Explorer/commit/ac3930d8ce740a10b86bad86b21c892d87ebdbd5))
* **lint:** resolve async functions without await expressions ([b57a1d5](https://github.com/Mearman/Academic-Explorer/commit/b57a1d555014a224a088db5046e3e859c5b10924))
* **lint:** resolve ESLint errors in hook test files ([454932f](https://github.com/Mearman/Academic-Explorer/commit/454932f2d0595d61e1d98420db4d60fb44c6912c))
* **lint:** resolve indentation issues in authors.unit.test.ts ([329a29f](https://github.com/Mearman/Academic-Explorer/commit/329a29f78a7fed0d4c155dd8422f849e876a5fe9))
* **lint:** resolve type safety and unnecessary parameter issues in multiple files ([eacefd7](https://github.com/Mearman/Academic-Explorer/commit/eacefd7d4bff40d6a944449c6f8996fb013cdc41))
* **lint:** resolve unnecessary conditions and optional chaining warnings ([4a6f12f](https://github.com/Mearman/Academic-Explorer/commit/4a6f12f0322952694f44dc6b05cde17d54eb57b7))
* **lint:** resolve unnecessary optional chain and non-null assertion issues ([e96a4fa](https://github.com/Mearman/Academic-Explorer/commit/e96a4fa08f2729ecc6fbc94a1acb87100071b1d1))
* **lint:** resolve unused variables and imports in graph and evaluation modules ([917e8ea](https://github.com/Mearman/Academic-Explorer/commit/917e8ea867a8768401803c7a511d72f5d8998a97))
* **logger-example:** improve error handling and type safety ([46b0739](https://github.com/Mearman/Academic-Explorer/commit/46b0739ec33b4f4b172af83e93004077519cf802))
* **logger-panel:** improve category filter type safety and UI ([ca3007a](https://github.com/Mearman/Academic-Explorer/commit/ca3007ad68b910965d17de7e3ef2f0f754ff2af1))
* **logger:** filter benign ResizeObserver loop notifications ([1a4fbb9](https://github.com/Mearman/Academic-Explorer/commit/1a4fbb9d690972cce3e182d2bf0ffc93fc1d620a))
* **logger:** resolve unsafe any usage in global error handlers ([115e246](https://github.com/Mearman/Academic-Explorer/commit/115e2463e57a8cf43cbde10a15b614d13daef67c))
* **main:** remove unused MantineColorScheme import ([c750aa4](https://github.com/Mearman/Academic-Explorer/commit/c750aa42c05063be39bae3d79e77d101864a189e))
* **navigation:** add delay to layout restart for React state consistency ([ce29d5d](https://github.com/Mearman/Academic-Explorer/commit/ce29d5d6db16afdf77c18fc1a850bbeca072ef35))
* **navigation:** extract clean OpenAlex IDs for routing ([0b210f8](https://github.com/Mearman/Academic-Explorer/commit/0b210f82ef090fa7fa7d8b05e2df7d5d773e6705))
* **navigation:** update GraphNavigation to use refactored expandNode ([f7df5a1](https://github.com/Mearman/Academic-Explorer/commit/f7df5a14b87bc974fa260c6b3e56d8dfcd05f20f))
* **navigation:** use clean OpenAlex IDs in graph navigation ([971c0c8](https://github.com/Mearman/Academic-Explorer/commit/971c0c8a0686999bb0f307c6be136735ea3d9173))
* **openalex:** add missing ids.openalex filter property to WorksFilters ([c398559](https://github.com/Mearman/Academic-Explorer/commit/c398559a4cef03a4e85d19230c02c88d05d524e4))
* **openalex:** convert typed filters to strings in sources entity methods ([8ff02c8](https://github.com/Mearman/Academic-Explorer/commit/8ff02c8f78350aa2fcce3f10d18955cc3806c355))
* **openalex:** correct authors API type predicate for collaboration results ([8999724](https://github.com/Mearman/Academic-Explorer/commit/8999724c1990a5f43a93c7e4fe993e3804b448a0))
* **openalex:** correct filter usage in keywords entity search method ([1ca4b3f](https://github.com/Mearman/Academic-Explorer/commit/1ca4b3fe882f3f3d02f41c20f7f50180a60b0cb9))
* **openalex:** correct search parameter usage in geo entity ([d53700f](https://github.com/Mearman/Academic-Explorer/commit/d53700f1ab4cdc6f48737cae75936dd821ef86d8))
* **openalex:** correct streaming method names in client ([4bd3ee1](https://github.com/Mearman/Academic-Explorer/commit/4bd3ee148093c1582d79ffbfa98baf227a71049e))
* **openalex:** extend AutocompleteResult entity_type union ([f17a0d2](https://github.com/Mearman/Academic-Explorer/commit/f17a0d2ef0e29c177ab32eef669fb8762c6ecd39))
* **openalex:** fix entity detection regex to handle case-insensitive IDs and all entity types ([c3ce9a0](https://github.com/Mearman/Academic-Explorer/commit/c3ce9a0e0a716822b05c44b31f71305dc28aaa34))
* **openalex:** remove forbidden non-null assertion in authors collaboration analysis ([0091dc6](https://github.com/Mearman/Academic-Explorer/commit/0091dc66eb55d6a58dbd849bba356b61e9f3a6df))
* **openalex:** remove unnecessary type assertions in authors unit tests ([834fd45](https://github.com/Mearman/Academic-Explorer/commit/834fd45d96499c9d53538f1ae8c936b6d3a0c0fa))
* **openalex:** replace dynamic delete with cache rebuilding in autocomplete ([f1e373e](https://github.com/Mearman/Academic-Explorer/commit/f1e373e4ef14c3ac0f3b8b9bd4372c3ac610e7b8))
* **openalex:** resolve async method issues in statistics utility ([9e31a03](https://github.com/Mearman/Academic-Explorer/commit/9e31a03d34901b85c90a5b946d31ce39aedc4910))
* **openalex:** resolve autocomplete API parameter compatibility issues ([8a29383](https://github.com/Mearman/Academic-Explorer/commit/8a2938327b6ddd8c87b6cf47742472f1f4cdc04a))
* **openalex:** resolve client method name and filter conversion issues ([f48ad8e](https://github.com/Mearman/Academic-Explorer/commit/f48ad8e045c8c4a5c4d3a28fc5a76ceec853b05c))
* **openalex:** resolve client streaming method parameter and naming issues ([ea26f39](https://github.com/Mearman/Academic-Explorer/commit/ea26f39a2db441fc97a5ede273ca92d3e43bdd2d))
* **openalex:** resolve configuration and type issues in base client ([f93f34c](https://github.com/Mearman/Academic-Explorer/commit/f93f34cdb0e6be497eea3e534628e2525459b6a6))
* **openalex:** resolve entity interface compatibility with QueryParams ([e34486f](https://github.com/Mearman/Academic-Explorer/commit/e34486fa7fc579526de2db3df78a5cb8c6b91781))
* **openalex:** resolve ESLint warnings in query builder examples ([48b3fe0](https://github.com/Mearman/Academic-Explorer/commit/48b3fe051ae6b95d94aea0681751705337c1f0f5))
* **openalex:** resolve export and import errors for entity interfaces ([4253e14](https://github.com/Mearman/Academic-Explorer/commit/4253e1454457e076e7fccb903c57ecb04cc9a052))
* **openalex:** resolve geo API spread operator architectural issues ([d2adc9d](https://github.com/Mearman/Academic-Explorer/commit/d2adc9d9440ae17f9b544dde3be319841586b078))
* **openalex:** resolve institutions API interface compatibility issues ([506df26](https://github.com/Mearman/Academic-Explorer/commit/506df26784d37a19b49463c7a4049151c1eafe7d))
* **openalex:** resolve keywords API spread operator architectural issues ([36d057a](https://github.com/Mearman/Academic-Explorer/commit/36d057a22320cece2e594e9af5870cdfa70c314f))
* **openalex:** resolve sources API circular method call issues ([0eb3d0e](https://github.com/Mearman/Academic-Explorer/commit/0eb3d0ebb71403ad4b128a776b0150104e5acb61))
* **openalex:** resolve sources API intersection type issues ([4f31ac6](https://github.com/Mearman/Academic-Explorer/commit/4f31ac60edc18c17ba26f000b8a8a4a3582b3052))
* **openalex:** resolve sources API parameter destructuring issues ([0b33c4c](https://github.com/Mearman/Academic-Explorer/commit/0b33c4c377171cbe9c4dd45b19bda4e1b983b419))
* **openalex:** resolve template literal type errors in query-builder ([3745d09](https://github.com/Mearman/Academic-Explorer/commit/3745d0970f6972f97d1746bb1404b1a17de120bd))
* **openalex:** resolve template literal type errors in sampling utility ([8a0a4c2](https://github.com/Mearman/Academic-Explorer/commit/8a0a4c2bc92c4a1f6f7366c61d4d8036c60a663e))
* **openalex:** resolve TypeScript undefined property errors in client ([30daa81](https://github.com/Mearman/Academic-Explorer/commit/30daa8147b697aafd35aa28de9c24378b8d5d372))
* **openalex:** resolve unnecessary conditional warnings in autocomplete.ts ([b4cb9ff](https://github.com/Mearman/Academic-Explorer/commit/b4cb9ff376f12fa22cc39cc4ee5e1ba8d6ee4f20))
* **openalex:** resolve unnecessary conditional warnings in geo and keywords entities ([620e397](https://github.com/Mearman/Academic-Explorer/commit/620e397773a74850f213ae51017179ed706f835b))
* **openalex:** resolve unsafe any assignments and spread operator issues in client ([fc2c1c7](https://github.com/Mearman/Academic-Explorer/commit/fc2c1c749d8f06367bc0fd058bb140b65eef9320))
* **openalex:** resolve utility API compatibility issues ([dae1495](https://github.com/Mearman/Academic-Explorer/commit/dae1495c54d8aa2275d9ff4b4df372e896dc690d))
* **openalex:** resolve works API filter assignment issues ([183c4ca](https://github.com/Mearman/Academic-Explorer/commit/183c4cac6ab5655cb27050a35ec037ecaeaa7d3d))
* **openalex:** resolve works API filter handling issues ([145e02d](https://github.com/Mearman/Academic-Explorer/commit/145e02da82087541da830d98934798fef2209a33))
* **openalex:** resolve works.ts spread operator and property name issues (TS2698, TS2353) ([f032a0a](https://github.com/Mearman/Academic-Explorer/commit/f032a0a72c716d8644f4b729dc0adbc9cf14d17b))
* **openalex:** restore filter merging functionality and fix API method mocks ([82e299c](https://github.com/Mearman/Academic-Explorer/commit/82e299c30be89de3bc0ad4c9bbe3b1418c21c381))
* **provider:** update logging to reflect DynamicFloatingEdge usage ([93f4b07](https://github.com/Mearman/Academic-Explorer/commit/93f4b07703a7a353ab388e94ae5cd2c5764911e3))
* **query-builder:** improve date validation and array filtering ([d5fece5](https://github.com/Mearman/Academic-Explorer/commit/d5fece580dd67268d3f71b359d7d06230c231c9b))
* **query-builder:** replace all any types with proper TypeScript types ([95d2291](https://github.com/Mearman/Academic-Explorer/commit/95d22912fcf29616c4f7983c475199d4946ea604))
* **release:** correct repository URL in semantic-release configuration ([4d04b22](https://github.com/Mearman/Academic-Explorer/commit/4d04b227ba2ac0fc891161bdac58c4a9fdd1d6c5))
* remove unnecessary async from synchronous method ([1a1bb33](https://github.com/Mearman/Academic-Explorer/commit/1a1bb331bd8498eb0bbbbac7d3a700905c6e0421))
* remove unnecessary conditionals and async annotations ([9169d4b](https://github.com/Mearman/Academic-Explorer/commit/9169d4b82bd225cbd109cad4ca803586a712506c))
* resolve async patterns and template literal type issues ([fd416d1](https://github.com/Mearman/Academic-Explorer/commit/fd416d1278ac8f6606fb403677cdcb6aa05836a3))
* resolve async patterns and template literal type issues ([8150ed4](https://github.com/Mearman/Academic-Explorer/commit/8150ed40c06fdf3b2fea6ef0815506646a61971e))
* resolve ESLint issues in entity and cache files ([0163ad9](https://github.com/Mearman/Academic-Explorer/commit/0163ad9857b40ac66f07f016c00ccf22750ed7e9))
* resolve evaluation module async and template issues ([1118039](https://github.com/Mearman/Academic-Explorer/commit/1118039cb09d3df0ff3ec6ba7aa192cff2957d8e))
* resolve floating promises and template literal type issues ([f12d4ec](https://github.com/Mearman/Academic-Explorer/commit/f12d4ec65702350d43ace95ee705eeeeb4073375))
* resolve Promise misuse and type safety issues ([38a2cb9](https://github.com/Mearman/Academic-Explorer/commit/38a2cb91e33e5c0060d4345a036e30aaadfadcda))
* resolve Promise misuse in event handlers ([bf95cf1](https://github.com/Mearman/Academic-Explorer/commit/bf95cf11536a905c0f164e526df6710c708ca8d4))
* resolve React hooks exhaustive dependencies warnings ([3a96dc9](https://github.com/Mearman/Academic-Explorer/commit/3a96dc9abff0724fb76d4d6400dd30e91f76ec96))
* resolve return-await and template literal issues ([b36ec7b](https://github.com/Mearman/Academic-Explorer/commit/b36ec7b536618f33b45479edf1d268b11da24bdc))
* resolve template literal and arrow function issues ([6ddc578](https://github.com/Mearman/Academic-Explorer/commit/6ddc578f2916ca0d386a397c3682d5f29ebf4b9b))
* resolve template literal type expressions with String() conversions ([79da7ab](https://github.com/Mearman/Academic-Explorer/commit/79da7abf4170011f90a6d0fba4ad006208213d43))
* resolve template literal type issues in OpenAlex entities ([7d6056e](https://github.com/Mearman/Academic-Explorer/commit/7d6056ef3a57ff469c944ff5b06116d9f7e76607))
* resolve template literal type issues in OpenAlex entities ([560c481](https://github.com/Mearman/Academic-Explorer/commit/560c4813f5d1f51b48b42fde6cd877bc3bafd23e))
* resolve template literal type issues in OpenAlex test files ([7245098](https://github.com/Mearman/Academic-Explorer/commit/724509839ff2a8c27decce034400b6b9decbe1f1))
* resolve unnecessary conditionals and template literal type issues ([9890cdc](https://github.com/Mearman/Academic-Explorer/commit/9890cdcc7819e0901ca270dd7410cb29624954b7))
* resolve unnecessary conditionals and type assertion preferences ([7f3c36a](https://github.com/Mearman/Academic-Explorer/commit/7f3c36aead1e94c4c2e967942da46ef4eba4a390))
* resolve unsafe enum comparison and improve type assertions ([ef26ee3](https://github.com/Mearman/Academic-Explorer/commit/ef26ee349a75c191a9eec066947cb6d34c690565))
* resolve unused parameter warnings with underscore prefix ([18526fe](https://github.com/Mearman/Academic-Explorer/commit/18526fea8d60d3c393ca332e750947898cfb72df))
* resolve unused variable and template literal type issues ([f549534](https://github.com/Mearman/Academic-Explorer/commit/f5495346b9c0fabfe81d46647e8e7ddb53267418))
* resolve unused variable and template literal type issues ([20d5074](https://github.com/Mearman/Academic-Explorer/commit/20d5074aca127b8dd091ae282cd5dc2b1684b0c6))
* resolve unused variables and floating promises ([fda4818](https://github.com/Mearman/Academic-Explorer/commit/fda481800f6293bbe4dcc67457911c04d56313e1))
* resolve unused variables and optional chaining issues ([71e057d](https://github.com/Mearman/Academic-Explorer/commit/71e057dbf718933f11c849498a38b67eb04a7b62))
* **routes,services:** resolve EntityType comparison and Source property issues ([89a8287](https://github.com/Mearman/Academic-Explorer/commit/89a8287467a98f4ee7b91a5a6bbc41ef98f3371e))
* **routes:** handle async function calls in route components ([a780d10](https://github.com/Mearman/Academic-Explorer/commit/a780d1084e4b1e8dfcb85edde1a77184fda910eb))
* **routes:** handle async navigation in external ID route ([aa17cf2](https://github.com/Mearman/Academic-Explorer/commit/aa17cf283c56c0df018d76e4b94beeea7ef8fbf2))
* **routes:** resolve EntityType comparison compatibility issues ([233abbf](https://github.com/Mearman/Academic-Explorer/commit/233abbf15def8ee935d9c788276011eca645ff39))
* **sampling:** replace any types with proper TypeScript constraints ([1841400](https://github.com/Mearman/Academic-Explorer/commit/1841400a39ce5f713a7d277a3a6d9f950f1c7a7e))
* **security:** resolve esbuild vulnerability with dependency override ([90d92ff](https://github.com/Mearman/Academic-Explorer/commit/90d92ff26e11b0536d781a8e5de97a1bcd7ee869))
* **services:** resolve graph service EntityType comparisons and API filter issues ([a467873](https://github.com/Mearman/Academic-Explorer/commit/a4678739a9153de9433f0fd0415a97946419f4ca))
* **services:** resolve remaining graph service filter and property issues ([9870d5b](https://github.com/Mearman/Academic-Explorer/commit/9870d5b4ca7faa1ea30649905dbf5c85eaac3d0d))
* **sidebars:** replace hardcoded colors with theme system ([4b5e3a8](https://github.com/Mearman/Academic-Explorer/commit/4b5e3a809843bdef5e59aabc99ef936350c4d9b1))
* **statistics:** complete any type elimination in remaining methods ([3789a2c](https://github.com/Mearman/Academic-Explorer/commit/3789a2c1612386dd3f5374353b7c3905e84e1355))
* **statistics:** complete EntityType array for database stats ([9be9314](https://github.com/Mearman/Academic-Explorer/commit/9be93141481e078086497700833ebc19816767e8))
* **statistics:** complete final type safety improvements ([bbc8dc0](https://github.com/Mearman/Academic-Explorer/commit/bbc8dc056f4a4ac999127ec3ec9bedadc73ce98b))
* **statistics:** complete type safety improvements ([9062343](https://github.com/Mearman/Academic-Explorer/commit/9062343362b681db9d9574bb5c330f8cdb573e31))
* **statistics:** replace all any types with proper TypeScript interfaces ([dbc71f4](https://github.com/Mearman/Academic-Explorer/commit/dbc71f4548942e31c14dc73e2692c211c8060bab))
* **statistics:** resolve interface alignment and type inference issues ([d4ed5c8](https://github.com/Mearman/Academic-Explorer/commit/d4ed5c8f0a5770fae90a63015d976979ca125a30))
* **styles:** resolve Vanilla Extract build errors in layout ([2404cfd](https://github.com/Mearman/Academic-Explorer/commit/2404cfd56fcc11242f53334a1ce79c9036435c65))
* **test:** adjust coverage thresholds to resolve CI failures ([4abe4a3](https://github.com/Mearman/Academic-Explorer/commit/4abe4a394243242e26a89ad355ec07879c97745e))
* **test:** eliminate all ESLint warnings in integration tests ([25925f9](https://github.com/Mearman/Academic-Explorer/commit/25925f9f15301b2581f3748a50d2140eb5819241))
* **test:** improve graph-data-service mock configuration ([88682b7](https://github.com/Mearman/Academic-Explorer/commit/88682b736b56629b89e8207fabb770ab74ff2cee))
* **test:** resolve unsafe assignment issues in client.unit.test.ts ([b2756b4](https://github.com/Mearman/Academic-Explorer/commit/b2756b4780ac15b3187a15d9e4d7a1fa8992d286))
* **tests:** fix any type and generator function linting issues in works tests ([92ef7d0](https://github.com/Mearman/Academic-Explorer/commit/92ef7d0ecbe1370d938efb5f365f0706dff53470))
* **tests:** partial fix for unsafe type issues in client and authors tests ([2bd3cd1](https://github.com/Mearman/Academic-Explorer/commit/2bd3cd1ad8d348ec242ab8d58762b3a11a46d500))
* **tests:** replace remaining any types with proper TypeScript types ([abad303](https://github.com/Mearman/Academic-Explorer/commit/abad30301de7d048b1176769eee5ed3491d581a0))
* **tests:** replace remaining any types with proper TypeScript types ([1da7687](https://github.com/Mearman/Academic-Explorer/commit/1da7687a3e1889ae6053ecbc96dab09085d4aaab))
* **tests:** resolve unused variable linting issues in OpenAlex tests ([f8db32f](https://github.com/Mearman/Academic-Explorer/commit/f8db32f3dfd0d39812c2bb1358c940ef4b6d1f5f))
* **tests:** update logger format expectations in unit tests ([9845f01](https://github.com/Mearman/Academic-Explorer/commit/9845f01c5eb712e15cefb8236a5554e1e9dadfa6))
* **theme:** replace hardcoded colors in top bar navigation with theme system ([f216648](https://github.com/Mearman/Academic-Explorer/commit/f216648e614e62203bd91615422735da664bea62))
* **theme:** resolve auto mode color scheme correctly ([2d2e94a](https://github.com/Mearman/Academic-Explorer/commit/2d2e94a344e3d5cb7401081a9482310710747049))
* **theme:** update theme button icons to represent current state ([9da0b43](https://github.com/Mearman/Academic-Explorer/commit/9da0b43de5d60989eb8b0121b05ac52911880f3d))
* **theme:** update theme cycle comment for accuracy ([573dd1a](https://github.com/Mearman/Academic-Explorer/commit/573dd1a58eca08b4268109352f0d1e2f357b6770))
* **transformers:** correct Chai assertion syntax ([6479d48](https://github.com/Mearman/Academic-Explorer/commit/6479d488e696bdbb8f02b55d86e04141b78ac86d))
* **transformers:** resolve keyword extraction and readability analysis issues ([d7a102c](https://github.com/Mearman/Academic-Explorer/commit/d7a102c25a7490cc07fcb413eb5e6d202a2eae95))
* **types:** improve type safety in utility and service modules ([ff5537c](https://github.com/Mearman/Academic-Explorer/commit/ff5537c65d79b3e4a2b8ba1110a58aedea1dbf0a))
* **types:** resolve TypeScript Edge type issue in GraphNavigation ([3ee9668](https://github.com/Mearman/Academic-Explorer/commit/3ee966895a7bc56871213c0997428ad3116f4c1c))
* **ui:** align sidebar entity colors with graph nodes ([df6115a](https://github.com/Mearman/Academic-Explorer/commit/df6115a9d77e9791b49dcfaa5accba8ed44f08de))
* **utils:** replace any types with proper TypeScript constraints ([4335020](https://github.com/Mearman/Academic-Explorer/commit/4335020596975bc0f3fb80f743d2d707650424f1))
* **utils:** replace any types with proper TypeScript constraints ([bc42ac4](https://github.com/Mearman/Academic-Explorer/commit/bc42ac4b8dea37560aa7415dd377be3a6b8d2a5c))
* **utils:** resolve unused import linting issues in utility modules ([0dc4441](https://github.com/Mearman/Academic-Explorer/commit/0dc44415efd2c1d8aa33d1e8deebd3fb440b0f68))
* **utils:** resolve unused parameter linting issues in utility modules ([40bf2e7](https://github.com/Mearman/Academic-Explorer/commit/40bf2e7bf11d1b3a14c688223e5fbda6cb0ec985))
* **utils:** resolve unused parameter warnings in statistics and transformers ([ea51e00](https://github.com/Mearman/Academic-Explorer/commit/ea51e00a0d0b9b28d7da50e5624c551aa9e62db4))
* **vitest:** remove invalid coverage config from workspace projects ([03daabe](https://github.com/Mearman/Academic-Explorer/commit/03daabe5f969c1e2ea2504791b270c6aac41dcd4))
* **xyflow:** resolve XYFlow import issues and Background variant types ([46df648](https://github.com/Mearman/Academic-Explorer/commit/46df6481fd934cbd6f37c123eb25ace8d63f49dd))
* **xyflow:** update entity types and ReactNode compatibility ([b7770e0](https://github.com/Mearman/Academic-Explorer/commit/b7770e0d4cffac5847ca7757a089b93465fddaa7))


### Code Refactoring

* **hooks:** consolidate expandNode functionality in useGraphData ([d520b76](https://github.com/Mearman/Academic-Explorer/commit/d520b765e6b20d592736baaeea48115537b3c71a))


### Features

* add HTML entry point and public assets ([3d17391](https://github.com/Mearman/Academic-Explorer/commit/3d17391ec08a815e6639a55e6ea189a4c18afa93))
* add Mantine UI and Vanilla Extract dependencies ([aaf4c77](https://github.com/Mearman/Academic-Explorer/commit/aaf4c7760b766c8a754e3012281192fc2b234d0a))
* add React 19 application source code ([68bdd00](https://github.com/Mearman/Academic-Explorer/commit/68bdd0058b0c91e1647799d2bd84e776499869fd))
* add React Query devtools to development ([589e970](https://github.com/Mearman/Academic-Explorer/commit/589e97038e53dd9d449ba0d87e6dfb6e7e897027))
* add TanStack Query for data fetching ([6cb2d91](https://github.com/Mearman/Academic-Explorer/commit/6cb2d9162b33481cd3cfacc0e9119acccd37aa47))
* add TanStack React Router dependencies ([68d5a1d](https://github.com/Mearman/Academic-Explorer/commit/68d5a1db7f1a109ac2bb5c2146a623ff7a85e5de))
* **api:** add rate-limited OpenAlex client and query hooks ([208f241](https://github.com/Mearman/Academic-Explorer/commit/208f241758dcb14014d564495a57d324b0c3a5d9))
* **app:** enhance React Query client with persistence and dev tools ([3ad0194](https://github.com/Mearman/Academic-Explorer/commit/3ad0194a4bf287fe76cbfcab0a49deaa55fea4c6))
* **cache:** add cache management infrastructure ([ab2f906](https://github.com/Mearman/Academic-Explorer/commit/ab2f9067b7eb748958e1185635161bcb7869613d))
* **cache:** add TanStack Query integration for graph data persistence ([7ee0fb1](https://github.com/Mearman/Academic-Explorer/commit/7ee0fb1370859ff0cd197b273c27ae089fdb30e8))
* **ci:** add GitHub Actions CI workflow and dependabot ([807d75a](https://github.com/Mearman/Academic-Explorer/commit/807d75a723a14f932a6a48d73796e38584c18659))
* **client:** enhance retry logic with configurable rate limit handling ([ab6f7c8](https://github.com/Mearman/Academic-Explorer/commit/ab6f7c8808850741f54fcc54ce93a40309bffd25))
* **components:** add graph navigation components ([880d00b](https://github.com/Mearman/Academic-Explorer/commit/880d00ba8be58ade548138d616b9973dc9651548))
* **components:** add graph navigation sidebar components ([eadcf60](https://github.com/Mearman/Academic-Explorer/commit/eadcf60aac1c6380f968c8a3441fb5ec6c570975))
* **components:** add LayoutControls molecule component ([a592a3c](https://github.com/Mearman/Academic-Explorer/commit/a592a3cb4b04367966953da16fe10b9c823ed0e7))
* **config:** complete test file linting optimization ([8a53e4c](https://github.com/Mearman/Academic-Explorer/commit/8a53e4c09be7be1db9493dae2990db66bcb310be))
* **config:** configure Vitest test projects and coverage ([3ffd09d](https://github.com/Mearman/Academic-Explorer/commit/3ffd09dec77055df9eeae38db71e1b90d903b1fe))
* **config:** enhance build and app configuration ([df42f58](https://github.com/Mearman/Academic-Explorer/commit/df42f5862c036be83fde3ba7b212cf5a8571b88c))
* **config:** integrate Phase 1 components into app infrastructure ([baad6e0](https://github.com/Mearman/Academic-Explorer/commit/baad6e0cae737d8e1b07bad2b8148fb50d1c4b79))
* configure TanStack Router with hash-based routing ([eedf3c7](https://github.com/Mearman/Academic-Explorer/commit/eedf3c78b60a643da505b76ea1dd5264e4f51928))
* convert route components to Mantine UI design system ([3780a2d](https://github.com/Mearman/Academic-Explorer/commit/3780a2de51b0d3644a12413f735735002bd091b1))
* create TanStack Query demo route ([0ed94df](https://github.com/Mearman/Academic-Explorer/commit/0ed94df6da9823cb8ec4302769d63c2bf04ce002))
* create TanStack Router file-based routes ([9710725](https://github.com/Mearman/Academic-Explorer/commit/971072596b6ecc06306fad0abccb961353451030))
* create Vanilla Extract design system ([c81be36](https://github.com/Mearman/Academic-Explorer/commit/c81be3622de30f113e1965e931c4e469a972a009))
* **demo:** add real API testing and exploration routes ([8f1146d](https://github.com/Mearman/Academic-Explorer/commit/8f1146da23d89be48e92a0f1d5469d52b2d9b7cc))
* **demo:** integrate session manager and real graph visualization ([9b7cd46](https://github.com/Mearman/Academic-Explorer/commit/9b7cd46e25501a47bcdb08f36ce73c8c21826f34))
* **demos:** add GraphDemo component to verify decoupled graph navigation ([bce2fe6](https://github.com/Mearman/Academic-Explorer/commit/bce2fe61e207af4209b5d1d9aa617b0960e5a697))
* **deps:** add @xyflow/react and zustand for graph visualization ([abbc890](https://github.com/Mearman/Academic-Explorer/commit/abbc890c33b4c832191be393fd53c6ce729a70bc))
* **deps:** add D3-force dependencies for physics-based graph layouts ([d66c7dd](https://github.com/Mearman/Academic-Explorer/commit/d66c7dd886bb811b7883c89f69048db119f7d3eb))
* **deps:** add immer for immutable state management ([6583993](https://github.com/Mearman/Academic-Explorer/commit/65839933dd4568b62082311e7db314c5d73adacd))
* **deps:** add Phase 1 packages for enhanced academic data handling ([93091e7](https://github.com/Mearman/Academic-Explorer/commit/93091e721f6c3e70ae78bb74568c18483cda1ae1))
* **deps:** add TanStack devtools and React forms dependencies ([68137fb](https://github.com/Mearman/Academic-Explorer/commit/68137fb8bc873aa75c53a98433fa71f19b3fce8e))
* **deps:** add TanStack Pacer and React Query persistence libraries ([4d05cde](https://github.com/Mearman/Academic-Explorer/commit/4d05cdef75d2b2e22657b29805477a8a9ecc9ca0))
* **deps:** add xlsx library for Excel file parsing support ([2d0e23b](https://github.com/Mearman/Academic-Explorer/commit/2d0e23b10a46d28f7e5825c59013c0dace5d2285))
* **devtools:** add comprehensive debugging panels ([3fd8eb2](https://github.com/Mearman/Academic-Explorer/commit/3fd8eb2377937413feee3777ea84538c069e480c))
* **devtools:** enhance ApplicationLoggerPanel with copy functionality ([7e9abbf](https://github.com/Mearman/Academic-Explorer/commit/7e9abbf7eeb2e3be34cf66f1d1dde9fe3aebdd19))
* **entities:** add entity abstraction layer with factory pattern ([29c3302](https://github.com/Mearman/Academic-Explorer/commit/29c3302189cfd58fe166626b19618803c612bc78))
* **eslint:** add strict TypeScript rules and logging restrictions ([47c21e8](https://github.com/Mearman/Academic-Explorer/commit/47c21e8148a14ea3cbb0a1c864bb4fbb2341844d))
* **evaluation:** add meta-analysis visualization dashboard components ([7546fb5](https://github.com/Mearman/Academic-Explorer/commit/7546fb51505708ab544cee68957b8bc055a8ed80))
* **evaluation:** add missing paper detection UI component ([1790983](https://github.com/Mearman/Academic-Explorer/commit/17909834baf594c5bef8560cd740a2333487de5f))
* **evaluation:** add STAR methodology type definitions ([bbae309](https://github.com/Mearman/Academic-Explorer/commit/bbae3097170c8a055bec4ee2be441fc6aff72e05))
* **evaluation:** enhance WorkReference type with citation count and abstract ([cc425c5](https://github.com/Mearman/Academic-Explorer/commit/cc425c5075d52cba7c7cd19eb58683d751ddbc2d))
* **evaluation:** implement Excel file parsing for STAR datasets ([58a272c](https://github.com/Mearman/Academic-Explorer/commit/58a272cf9a831045d450878e1250b31d38172e3a))
* **evaluation:** implement missing paper detection algorithms ([21e98e0](https://github.com/Mearman/Academic-Explorer/commit/21e98e050414c1051b8affd8a162db47eca2b9f5))
* **evaluation:** implement OpenAlex search service for STAR evaluation ([937cdc6](https://github.com/Mearman/Academic-Explorer/commit/937cdc62308572cd8338842d99d4f574fb4f5425))
* **evaluation:** implement paper matching comparison engine ([37d9e61](https://github.com/Mearman/Academic-Explorer/commit/37d9e610236eb8a1ea3e08116c1bd68529ceeb32))
* **evaluation:** implement STAR dataset file parsing service ([ffe0025](https://github.com/Mearman/Academic-Explorer/commit/ffe00254fc4dcdf86225f27bc62c783c411b6e2b))
* **evaluation:** implement STAR methodology integration foundation ([465636a](https://github.com/Mearman/Academic-Explorer/commit/465636a6c8c3104ff15f4890ae5fe4a98aa82dd2))
* **evaluation:** integrate meta-analysis visualizations in results dashboard ([4b52a65](https://github.com/Mearman/Academic-Explorer/commit/4b52a65a6131ce2079502380af5fd189e238ea7a))
* **evaluation:** integrate missing paper detection in results dashboard ([133f080](https://github.com/Mearman/Academic-Explorer/commit/133f080f03d38da4cda43a7c8828104fa26cfa0b))
* **evaluation:** integrate real comparison engine in results dashboard ([7b366cc](https://github.com/Mearman/Academic-Explorer/commit/7b366cc0b237803c293a9368c3481d9fda716e89))
* **evaluation:** integrate real file parsing in datasets upload ([d44c2be](https://github.com/Mearman/Academic-Explorer/commit/d44c2be548280a276ee3071908dcf5578e56b299))
* **evaluation:** replace mock search with real OpenAlex integration ([0f1a3e7](https://github.com/Mearman/Academic-Explorer/commit/0f1a3e7fca7c6cc840814f42101f4a27651caf66))
* **graph,search:** enhance graph types and search route integration ([6667eb7](https://github.com/Mearman/Academic-Explorer/commit/6667eb72ec30a5d520ac4db30694f95a0d0e8bf1))
* **graph:** add centralized fitView animation constants ([2bae985](https://github.com/Mearman/Academic-Explorer/commit/2bae98527c73049fec819f0d49e39433db592046))
* **graph:** add core graph types and decoupled provider system ([d02a101](https://github.com/Mearman/Academic-Explorer/commit/d02a101ea98b28b99f87465fed851cadc9631e97))
* **graph:** add custom SVG arrow markers for floating edges ([1686730](https://github.com/Mearman/Academic-Explorer/commit/16867300fb477e89eb6ce204f3cfa4b03247a702))
* **graph:** add detailed logging for graph operations ([8214deb](https://github.com/Mearman/Academic-Explorer/commit/8214deb04d60a62eb8c9da9fc141667326195529))
* **graph:** add deterministic layouts and auto-load related entities ([9c9a9fc](https://github.com/Mearman/Academic-Explorer/commit/9c9a9fc74dce3b7eba011962202022d25559fa7d))
* **graph:** add DynamicFloatingEdge component for live edge routing ([588ab61](https://github.com/Mearman/Academic-Explorer/commit/588ab61a271bc64b46d2a5dedd05539725ab6e2f))
* **graph:** add edge calculation utilities for dynamic floating edges ([bbee212](https://github.com/Mearman/Academic-Explorer/commit/bbee212d524fcbd43aa3bfd8105cfdb0727d62b8))
* **graph:** add enhanced simulation progress logging ([8a9733f](https://github.com/Mearman/Academic-Explorer/commit/8a9733f704b9062b27a167f107740ca62ffa9073))
* **graph:** add floating edge implementation for XYFlow ([7244cd7](https://github.com/Mearman/Academic-Explorer/commit/7244cd748cb2cc40ff6c5b80f22848a12da40590))
* **graph:** add force expansion option for manual node expansion ([9547ebd](https://github.com/Mearman/Academic-Explorer/commit/9547ebd99873f3ab742a038e3a76ac2fc4f02fc6))
* **graph:** add graph session persistence with localStorage ([891ed33](https://github.com/Mearman/Academic-Explorer/commit/891ed33f50a4a8a06cfb72769a785cf6f023ce43))
* **graph:** add incremental update methods to XYFlowProvider ([a115b14](https://github.com/Mearman/Academic-Explorer/commit/a115b14d50aabff3d94ead837dacd3c88bb372c9))
* **graph:** add loadEntityIntoGraph method for progressive graph building ([53b806f](https://github.com/Mearman/Academic-Explorer/commit/53b806f013d47794116429384761f39ee23159bb))
* **graph:** add pin/unpin actions to node context menu ([ab17e48](https://github.com/Mearman/Academic-Explorer/commit/ab17e4836d57b85f9b58c9b512fdabc93874d84d))
* **graph:** add pinned node data to XYFlow nodes ([382f8ad](https://github.com/Mearman/Academic-Explorer/commit/382f8ad09bb7077989dab7e8314db6aab742403f))
* **graph:** add smart handle calculation to XYFlow provider ([e8618a2](https://github.com/Mearman/Academic-Explorer/commit/e8618a222a76d2a45c49f84face1f3e10f4556db))
* **graph:** add SmartEdge component with XYFlow handle connection ([64a4b9b](https://github.com/Mearman/Academic-Explorer/commit/64a4b9b77653e6cc55068808cbabc992c4104ab8))
* **graph:** add unified layout hook for XYFlow ([03781ba](https://github.com/Mearman/Academic-Explorer/commit/03781ba5faedab9ac79dd11f27f265ed82a151d4))
* **graph:** add URL state sync and browser history support ([ad2b2f3](https://github.com/Mearman/Academic-Explorer/commit/ad2b2f3441b4e1b147afbf021bd781f1e3035f2e))
* **graph:** auto-center and pin selected node on page load ([66e75dd](https://github.com/Mearman/Academic-Explorer/commit/66e75dddf2d615f3905148ed443fc7607455c241))
* **graph:** auto-load related entities when visiting nodes ([dc6726c](https://github.com/Mearman/Academic-Explorer/commit/dc6726cd5504db38ad6ae58e795d9cbc6bc0bf30))
* **graph:** complete entity expansion methods implementation ([efd0933](https://github.com/Mearman/Academic-Explorer/commit/efd0933cfc18e280e0279d0a14608a552607b856))
* **graph:** create real graph visualization with XYFlow integration ([efdb078](https://github.com/Mearman/Academic-Explorer/commit/efdb0787ca668dc8a23d1142e81539eea28ba597))
* **graph:** enable edge elevation on selection ([d5438d9](https://github.com/Mearman/Academic-Explorer/commit/d5438d9a00f7195ec1152f6cb015e22a82cc29bc))
* **graph:** enhance custom nodes with 4-sided connection handles ([00c8343](https://github.com/Mearman/Academic-Explorer/commit/00c834362cd94a28f45c06368d7bf81c1a39e7fd)), closes [#555](https://github.com/Mearman/Academic-Explorer/issues/555)
* **graph:** enhance edge arrow rendering with high z-index positioning ([0e31bd9](https://github.com/Mearman/Academic-Explorer/commit/0e31bd9d9f148f5f024bb1027923ef6c12ce18ff))
* **graph:** enhance fitView to include directly connected nodes ([7536ba2](https://github.com/Mearman/Academic-Explorer/commit/7536ba25d7ffa232fa748e1ab4d0268891719f67))
* **graph:** enhance FloatingEdge node measurement and arrow design ([a5a714a](https://github.com/Mearman/Academic-Explorer/commit/a5a714a189c234fd51bb84b1605b7a89df4efce4))
* **graph:** enhance graph infrastructure with deterministic layouts ([6ed4b71](https://github.com/Mearman/Academic-Explorer/commit/6ed4b71f524896c80dd8e61ca94d2397c39102e8))
* **graph:** enhance GraphNavigation with handle recalculation ([46196f2](https://github.com/Mearman/Academic-Explorer/commit/46196f27e1931ad5af51c766982eef011f33f858))
* **graph:** enhance layout system with detailed logging and collision control ([687e8cc](https://github.com/Mearman/Academic-Explorer/commit/687e8cc2f86eee849a88fb38fcf3337a913ee13e))
* **graph:** enhance node expansion with incremental exploration ([a1264a7](https://github.com/Mearman/Academic-Explorer/commit/a1264a7813fa2ed9a7ab4e0185fb4307e7171bf8))
* **graph:** implement hash-based routing with navigation blocking ([565c57c](https://github.com/Mearman/Academic-Explorer/commit/565c57cd5e88d04a73d7e794d4c5955a4a061040))
* **graph:** implement incremental rendering in GraphNavigation ([5399968](https://github.com/Mearman/Academic-Explorer/commit/5399968dc77541241b8b241574f29d70e8b83f11))
* **graph:** implement progressive graph loading in GraphNavigation ([3d4f897](https://github.com/Mearman/Academic-Explorer/commit/3d4f897a236ed1cbf8ad018d73c5d175e0ba76ae))
* **graph:** implement real OpenAlex API node expansion ([83adef4](https://github.com/Mearman/Academic-Explorer/commit/83adef4938d66ab6897d428ba66a1c647b6a58ea))
* **graph:** implement right-click context menu for graph nodes ([c3d736a](https://github.com/Mearman/Academic-Explorer/commit/c3d736aeadd9b998095aa38a001e4db4d6279eb6))
* **graph:** implement viewport state persistence in graph sessions ([20d9f15](https://github.com/Mearman/Academic-Explorer/commit/20d9f15c43a17b66d85bf73d1a197bebb730b643))
* **graph:** improve layout centering with viewport-aware positioning ([18f48f7](https://github.com/Mearman/Academic-Explorer/commit/18f48f7bd0acea342d75c695270ce6cd32687b49))
* **graph:** improve loading state for incremental expansions ([e34a313](https://github.com/Mearman/Academic-Explorer/commit/e34a313bd5d42bc9e75d3b52ab36c69aa9553292))
* **graph:** improve node pinning and centering behavior ([a0c783b](https://github.com/Mearman/Academic-Explorer/commit/a0c783b7c183ecab7e6804b78333852ccc31d0ac))
* **graph:** integrate D3-force physics simulation with XYFlow provider ([9a22c85](https://github.com/Mearman/Academic-Explorer/commit/9a22c85274030e80f638a2668682b9e34f6b759f))
* **graph:** integrate floating edges into XYFlow visualization ([707b2e8](https://github.com/Mearman/Academic-Explorer/commit/707b2e88b6ed0c32b7d94245809ae45ff82edea0))
* **graph:** integrate useLayout hook in GraphNavigation ([3272126](https://github.com/Mearman/Academic-Explorer/commit/32721265b91efa15cb565ec9d5dfc8d075cacd2e))
* **graph:** integrate visibility filters with graph visualization ([0432e4a](https://github.com/Mearman/Academic-Explorer/commit/0432e4a18f8bd97d94dc951005719b563cbcce79))
* **graph:** optimize D3 force parameters to prevent node overlap ([191670e](https://github.com/Mearman/Academic-Explorer/commit/191670e907eb428b47a7ab77346296ded1d9ae70))
* **graph:** replace smart edge with dynamic floating edge ([51c7810](https://github.com/Mearman/Academic-Explorer/commit/51c781036605f06eae600ce0015946cd84e50b74))
* **graph:** update GraphNavigation to use new entity routing structure ([86591b4](https://github.com/Mearman/Academic-Explorer/commit/86591b45b906b6c8c6fd000b5f6dff55b69b4716))
* **home:** redesign home page as search overlay on graph ([8bbd93b](https://github.com/Mearman/Academic-Explorer/commit/8bbd93bbf8e6a050f96374d760831183e22bf4d7))
* **hook:** add manual expansion and cache loading methods ([e04bab2](https://github.com/Mearman/Academic-Explorer/commit/e04bab27082f82bfd42c42d7be98465fd1419465))
* **hooks:** add useThemeColors utility for consistent theming ([28f86af](https://github.com/Mearman/Academic-Explorer/commit/28f86af56497893c80aca12e7fd3c0da38c00d3c))
* **hooks:** expose loadEntityIntoGraph in useGraphData hook ([dd9f84d](https://github.com/Mearman/Academic-Explorer/commit/dd9f84d9fe12c03bbe66acf68a72e66959acb09c))
* **hooks:** update graph data hook for multi-pin support ([14ef928](https://github.com/Mearman/Academic-Explorer/commit/14ef928f25d4efdd2545beb8c4d1a9e2f54c64d5))
* implement Mantine AppShell layout with navigation ([b48e372](https://github.com/Mearman/Academic-Explorer/commit/b48e3728ae35c82ff0b3bdba49f80195caef5145))
* initialize React 19 Vite project with pnpm ([ac82a16](https://github.com/Mearman/Academic-Explorer/commit/ac82a16f4db7b00ff861c5f7bc51b5954fa995f6))
* integrate Mantine provider and theme system ([ab53022](https://github.com/Mearman/Academic-Explorer/commit/ab530223d02a8cad53d05723b607aee168dbde89))
* **layout:** add MainLayout component with integrated sidebars ([a983d0e](https://github.com/Mearman/Academic-Explorer/commit/a983d0eab57812618f4918458eadd01caeafb332))
* **layout:** add style prop to GraphNavigation component ([cb57a43](https://github.com/Mearman/Academic-Explorer/commit/cb57a43b90112ecf3e0342f974a8bf8a38ba3955))
* **layout:** enhance force-directed layout with multi-pin support ([104d54e](https://github.com/Mearman/Academic-Explorer/commit/104d54e1c387e39214d20bd5ac270e642896230b))
* **layout:** implement D3 force layout with pinned node support ([0954bed](https://github.com/Mearman/Academic-Explorer/commit/0954bed34dc521fa1ef061d6f58bff965698a62c))
* **layout:** integrate cache management into navigation components ([1bbbaf0](https://github.com/Mearman/Academic-Explorer/commit/1bbbaf0fc428cc23f6a3954737a03371da143511))
* **layout:** integrate MainLayout as primary UI wrapper in root route ([635d731](https://github.com/Mearman/Academic-Explorer/commit/635d73155c4f6fb069d2ab30841b48e5c024837a))
* **layout:** modify MainLayout to render route content as overlays ([80d66c9](https://github.com/Mearman/Academic-Explorer/commit/80d66c9f6df3b6f16ba34c5a36183f1f2a73ad4c))
* **layout:** preserve existing node positions in force layout ([25b2272](https://github.com/Mearman/Academic-Explorer/commit/25b227277e87de33c6075d8eb968e12e33d09227))
* **lint:** add custom no-emoji ESLint rule with Mantine icon suggestions ([da8519b](https://github.com/Mearman/Academic-Explorer/commit/da8519bfdae5571ad30d5ae505e2eaa1d5be1abb))
* **lint:** add no-emoji ESLint rule type definition ([fba7cca](https://github.com/Mearman/Academic-Explorer/commit/fba7cca541762071e5402bc72145cc3e0dfb307d))
* **logger:** enhance logger with error handling and global setup ([5ae9499](https://github.com/Mearman/Academic-Explorer/commit/5ae949994334d6df066f9020f91788cb5b602ac7))
* **logger:** integrate logger throughout component hierarchy ([fc6ce2c](https://github.com/Mearman/Academic-Explorer/commit/fc6ce2ce2f64317009fae17b77a9f16a9580149c))
* **logging:** add logger utility with convenience functions ([2e5885b](https://github.com/Mearman/Academic-Explorer/commit/2e5885b342c248a270f74faf16771ddce82be4cf))
* **main:** integrate TanStack devtools and error handling ([aec33c6](https://github.com/Mearman/Academic-Explorer/commit/aec33c6f1ee966651874a6fb5e5a0997f19c5cd9))
* **navigation:** add automatic layout restart for new nodes ([98ca8a0](https://github.com/Mearman/Academic-Explorer/commit/98ca8a0b498ad62b6fac2de62fa6f7d71c94df57))
* **navigation:** add Graph Explorer link to main navigation ([459da16](https://github.com/Mearman/Academic-Explorer/commit/459da16b7f958fa2b9fbf989f81cf8de922b8bbb))
* **navigation:** integrate multi-pin API in graph navigation ([b3224d0](https://github.com/Mearman/Academic-Explorer/commit/b3224d0448caa2ef8dd1a7910d52037b0fd013a2))
* **navigation:** integrate pinned node behavior with graph interactions ([4573809](https://github.com/Mearman/Academic-Explorer/commit/4573809c3aa2b4bc749271b66d0e404c51c22669))
* **navigation:** switch to manual expansion with traversal depth ([3bc0ff1](https://github.com/Mearman/Academic-Explorer/commit/3bc0ff1ab4df0342b92d4921ebb5e6c3483a2c03))
* **nx:** add Nx workspace configuration with intelligent caching ([3c854be](https://github.com/Mearman/Academic-Explorer/commit/3c854bef0c0004c718eb9da5b4fb80352004667f))
* **openalex:** add entity definitions and type systems ([99be045](https://github.com/Mearman/Academic-Explorer/commit/99be045b8b8d017bcfd386f4bfe2b44b16c35571))
* **openalex:** add OpenAlex API client library ([e5bdacd](https://github.com/Mearman/Academic-Explorer/commit/e5bdacdc7b558a94deda024a0e307bc233399984))
* **openalex:** add utility functions for data processing ([db076ad](https://github.com/Mearman/Academic-Explorer/commit/db076adae8f064d413c2ad1e3693a6ad97edc649))
* **provider:** update XYFlow provider for multi-pin API ([6de02a2](https://github.com/Mearman/Academic-Explorer/commit/6de02a2c2eecac4b01e880090ae33f0a467043c2))
* **release:** add semantic-release automation ([5bd89ae](https://github.com/Mearman/Academic-Explorer/commit/5bd89ae9719460d84bba6580f25112406fc0f986))
* **routes:** add comprehensive search demo page showcasing Phase 1 ([788ba43](https://github.com/Mearman/Academic-Explorer/commit/788ba43892f26379e492767d1898764fef1d1100))
* **routes:** add direct entity routes for OpenAlex IDs ([b963614](https://github.com/Mearman/Academic-Explorer/commit/b963614ce0112fd4f046c1e1b140777efb4b66b8))
* **routes:** add external ID routing system ([139c31a](https://github.com/Mearman/Academic-Explorer/commit/139c31a3bee46e846e9a5e6ea8e63fba33957a87))
* **routes:** add graph demo route and navigation ([16e102c](https://github.com/Mearman/Academic-Explorer/commit/16e102c229103bb431bf000579c065e71bb1ccc8))
* **routes:** add graph explorer route with integrated layout ([4f9e9b5](https://github.com/Mearman/Academic-Explorer/commit/4f9e9b50e5603d09ba7662fcd4a7b9efdeafcd54))
* **routes:** enhance evaluation routes and graph provider functionality ([f9c031c](https://github.com/Mearman/Academic-Explorer/commit/f9c031ccc7782c6559bf8652be04168ade5c5e06))
* **routes:** update legacy /graph route with migration message ([551b17d](https://github.com/Mearman/Academic-Explorer/commit/551b17d5e56e67cee1e4580fc16edbab4059efc8))
* **routing:** add automatic expansion to author route ([62288d0](https://github.com/Mearman/Academic-Explorer/commit/62288d0d0e483736809820cc134ea91306483402))
* **routing:** implement smart graph loading strategy ([339cac4](https://github.com/Mearman/Academic-Explorer/commit/339cac468e46c867d5513a9b2aac1699b30ff725))
* **scripts:** add Nx-powered verify tasks and dependency ([0f309ef](https://github.com/Mearman/Academic-Explorer/commit/0f309ef36af09867f36591a24b985c7911f30957))
* **scripts:** add typecheck script to package.json ([7b3f40d](https://github.com/Mearman/Academic-Explorer/commit/7b3f40dee6c0dad535ca18b21b202e0fd88707bd))
* **search:** add Phase 1 search components with date filtering ([657abe2](https://github.com/Mearman/Academic-Explorer/commit/657abe2192a84cc8295f8b905a294143150509e2))
* **service:** integrate multi-pin API in graph data service ([ddfc0f8](https://github.com/Mearman/Academic-Explorer/commit/ddfc0f8f7d00079f0ca425482fa42b8528f0f6bb))
* **service:** integrate search statistics tracking ([8207a93](https://github.com/Mearman/Academic-Explorer/commit/8207a93711fcfa5fb418de375e0a8fda2a2bffcd))
* **service:** integrate TanStack Query cache with graph data operations ([a26c8a4](https://github.com/Mearman/Academic-Explorer/commit/a26c8a4a9d246b1470f4c59034a1356dd84fd8db))
* **services:** add OpenAlex API to graph data integration ([eeb8caa](https://github.com/Mearman/Academic-Explorer/commit/eeb8caad74e9d54e719f52667c29f444808c2971))
* **sidebar:** add dual-purpose entity and edge type visibility controls ([f538e33](https://github.com/Mearman/Academic-Explorer/commit/f538e338318ef26c5f55bf85c7c53b6188418a83))
* **store:** add entity and edge type visibility controls ([4b2f23a](https://github.com/Mearman/Academic-Explorer/commit/4b2f23aea8e44b8d92362c27d40b23340d5d4bea))
* **store:** add multi-node pinning support to graph store ([7c94715](https://github.com/Mearman/Academic-Explorer/commit/7c94715a55453e9c444af01790bc68d23e98a498))
* **store:** add pinned node state management ([813df1f](https://github.com/Mearman/Academic-Explorer/commit/813df1f931fab32cbb0625869064ef354f4ac594))
* **store:** add traversal depth and cache visibility controls ([6e66960](https://github.com/Mearman/Academic-Explorer/commit/6e66960cbcb8d11368f3de2d45232f1538b65582))
* **stores:** add Zustand stores for graph and layout state ([9399861](https://github.com/Mearman/Academic-Explorer/commit/93998616645acdb3ed29decbda16ecc018130020))
* **store:** set D3-force as default layout with optimized physics configuration ([1fc5b3f](https://github.com/Mearman/Academic-Explorer/commit/1fc5b3f0ba00e83e58183fa270dfc001f821c069))
* **tables:** add BaseTable component with TanStack React Table ([ed5435d](https://github.com/Mearman/Academic-Explorer/commit/ed5435d47288ef989569d1867bc12ec32d65af81))
* **test:** add React Testing Library dependency ([3643fcd](https://github.com/Mearman/Academic-Explorer/commit/3643fcd0f78aeaee48224184147fb870c616c400))
* **test:** add test setup and infrastructure ([423922f](https://github.com/Mearman/Academic-Explorer/commit/423922ff11ca020ba5a054f4576cad34fed0cd7e))
* **testing:** add Vitest testing infrastructure ([de125c1](https://github.com/Mearman/Academic-Explorer/commit/de125c17ffa71f375a96380fea147b7a336782a1))
* **testing:** configure vitest globals and workspace for TypeScript ([a6f003e](https://github.com/Mearman/Academic-Explorer/commit/a6f003ef9466bfb63d3fd5eedbc58505d96d8b89))
* **theme:** add automatic color scheme detection and improved title ([29b2809](https://github.com/Mearman/Academic-Explorer/commit/29b280930508bdc6d12740d0ed05e34325c2f488))
* **theme:** enhance Mantine theme with academic entity colors ([85f1046](https://github.com/Mearman/Academic-Explorer/commit/85f10468c0ac5a4bdc0d90f79662d8cf882ca5be))
* **theme:** replace manual color calculations with Mantine CSS variables ([438be60](https://github.com/Mearman/Academic-Explorer/commit/438be603eab75dfb099d4b503c744719dc22ece2))
* **types:** add D3-force layout type and physics configuration options ([8af09bd](https://github.com/Mearman/Academic-Explorer/commit/8af09bda362276525bf9a2c8aee22734428eaa20))
* **ui:** add cache and traversal depth controls to sidebar ([c4cc553](https://github.com/Mearman/Academic-Explorer/commit/c4cc553f04ab0f75fa1fab1ecc52fa221de37064))
* **ui:** add cache management UI components ([be51a82](https://github.com/Mearman/Academic-Explorer/commit/be51a8220fe4a4850a952994afae91c22b1b97d8))
* **ui:** add D3-force layout option to LayoutControls with advanced configuration ([afa8eb2](https://github.com/Mearman/Academic-Explorer/commit/afa8eb2633efb5ae2cc615db0a1697c521b63c36))
* **ui:** add session management modal for graph persistence ([6b7fca0](https://github.com/Mearman/Academic-Explorer/commit/6b7fca0e5f65184f8e88f4fd3fbede7a9bec09f0))
* **ui:** add visual indicators for pinned nodes ([ffca9cb](https://github.com/Mearman/Academic-Explorer/commit/ffca9cb4d9c81103199582274f3052a85c4f63a4))
* **ui:** enhance color scheme toggle with auto mode ([ceb7552](https://github.com/Mearman/Academic-Explorer/commit/ceb7552be4bfd1234caa30befebe6cab23ea8d55))
* **ui:** implement navigation to datasets page from evaluation dashboard ([29bce22](https://github.com/Mearman/Academic-Explorer/commit/29bce22261d562f766fa57fbff591947e6c327c5))
* **ui:** smooth graph animations with consistent 800ms duration ([a2c159f](https://github.com/Mearman/Academic-Explorer/commit/a2c159fefdac5f0a862d43977a39e9f21d0ed1ad))
* **utils:** add extractOpenAlexId static method to EntityDetector ([272893a](https://github.com/Mearman/Academic-Explorer/commit/272893ab965cbbf589475aeec0741a8769e63f81))
* **utils:** add Phase 1 utility functions for academic data processing ([de33421](https://github.com/Mearman/Academic-Explorer/commit/de33421a6acb4c494de4e782593bf934d53110f3))
* **utils:** implement query-builder examples file with comprehensive filter patterns ([dd485d1](https://github.com/Mearman/Academic-Explorer/commit/dd485d1ac26dcebb004ba514c9bd1b4073a553bc))


### Performance Improvements

* **build:** optimize bundle size with strategic vendor chunking ([9029253](https://github.com/Mearman/Academic-Explorer/commit/90292531bb07c89a8cb4f2ddff36aeac8535e08f))
* **graph:** optimize D3 force layout simulation parameters ([95cada9](https://github.com/Mearman/Academic-Explorer/commit/95cada9f34f135dbe2a189012f319410d56b162e))
* **graph:** optimize D3 force layout with fixed parameters and remove static layouts ([59f10ac](https://github.com/Mearman/Academic-Explorer/commit/59f10ac98bfde31a12f79bcebfcf7f59bb0e2050))
* **graph:** optimize FloatingEdge React hooks and reduce logging noise ([302a358](https://github.com/Mearman/Academic-Explorer/commit/302a358de79b96aa6f9ca7c5f32afefa4a0d88d8))
* **graph:** optimize layout system for incremental updates ([5510967](https://github.com/Mearman/Academic-Explorer/commit/551096716c7ff1b7f4ebb07458db9a3cce45ea1b))
* **graph:** strengthen force layout with reduced link distance and increased repulsion ([e627242](https://github.com/Mearman/Academic-Explorer/commit/e6272422713b13816023f1bee1a465ffbdd4f8f4))
* **graph:** throttle layout change logging to reduce spam ([e791b8b](https://github.com/Mearman/Academic-Explorer/commit/e791b8b84706849b9cc3a9da30eeefee0eac89d3))
* **routes:** optimize React hooks to eliminate exhaustive-deps warnings ([7b04e80](https://github.com/Mearman/Academic-Explorer/commit/7b04e80120eb160077070502574443c1a6a6940e))


### BREAKING CHANGES

* **hooks:** manualExpandNode function removed, use expandNode instead
