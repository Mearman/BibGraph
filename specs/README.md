# Feature Specifications Index

This directory contains all feature specifications for BibGraph, organized using the SpecKit workflow. Each spec follows a structured process: specification → planning → task breakdown → implementation.

## Quick Navigation

| Status | Count |
|--------|-------|
| ✅ Complete | 22 |
| 🚧 In Progress | 4 |
| 📝 Draft | 4 |
| ⚠️ Archived | 2 |

## Specifications

### spec-001: Storage Abstraction
**Status**: ✅ Complete | **Completed**: 2025-11-17

Storage provider interface abstraction enabling swappable implementations. IndexedDB (Dexie) for production, in-memory provider for E2E/Playwright tests. Resolved 28+ E2E test failures by eliminating IndexedDB incompatibilities. Core implementation complete; polish tasks deferred.

[View Spec](./001-storage-abstraction/)

---

### spec-002: Fix Catalogue Tests
**Status**: ⚠️ Archived (Obsolete) | **Obsoleted**: 2025-11-17

Catalogue E2E test failures resolved by spec-001 (storage abstraction). All tests now passing. Issue resolved through InMemoryStorageProvider implementation.

[View Spec](./002-fix-catalogue-tests/)

---

### spec-003: Fix Vite Compilation
**Status**: ✅ Complete | **Completed**: 2025-11-17

Resolved tsconfig/Vite issue causing files to compile in-place rather than to dist folder. Fixed build configuration for proper output directory structure.

[View Spec](./003-fix-vite-compilation/)

---

### spec-004: Fix Failing Tests
**Status**: ⚠️ Archived (Obsolete) | **Obsoleted**: 2025-11-17

All test failures resolved. Current status: 1,422 tests passing (605 web + 817 graph), zero failures. Resolved through multiple implementations including storage abstraction, layout fixes, and history tracking.

[View Spec](./004-fix-failing-tests/)

---

### spec-005: Test Environment MSW
**Status**: 📝 Draft

Mock Service Worker (MSW) integration for test environment API mocking. E2E tests to run reliably without external API dependencies.

[View Spec](./005-test-environment-msw/)

---

### spec-006: Application Rename
**Status**: ✅ Complete | **Completed**: 2026-01-13

Application renamed from "Academic Explorer" to "BibGraph". All public-facing URLs, package aliases, and meta tags updated.

[View Spec](./006-application-rename/)

---

### spec-007: Multi-Provider Support
**Status**: 📝 Draft

Support for multiple storage provider implementations simultaneously.

[View Spec](./007-multi-provider-support/)

---

### spec-008: Bookmark Query Views
**Status**: ✅ Complete | **Completed**: 2025-11-24

Advanced query and filtering capabilities for bookmark management. User Stories 1-3 complete: entity/query bookmarking, custom field views with select parameters, tagging, search/filter, and export. Polish tasks (keyboard shortcuts, virtualization) deferred.

[View Spec](./008-bookmark-query-views/)

---

### spec-009: Graph Rendering Abstraction
**Status**: ✅ Complete (tasks untracked) | **Completed**: 2025-11-17 | **Superseded**: 2025-11-24

Decoupled graph rendering from specific graph packages. Originally implemented in `packages/graph/` and `packages/simulation/`. Refactored 2025-11-24 into `packages/algorithms/`, `packages/utils/`, and `packages/types/` for improved separation of concerns. Supports multiple node/edge types, directional edges, and custom forces. Implementation completed outside tasks.md workflow.

[View Spec](./009-graph-rendering-abstraction/)

---

### spec-010: Landing Page Layout
**Status**: 🚧 In Progress (Near Complete) | **Progress**: 48/55 tasks (87%)

Landing page responsive layout improvements (320px-3840px), WCAG 2.1 Level AA compliant touch targets (44px minimum), enhanced visual hierarchy with zoom support (150%-200%). All E2E tests passing. 7 polish phase tasks remain.

[View Spec](./010-landing-page-layout/)

---

### spec-011: Fix Vertical Scrolling
**Status**: ✅ Complete (tasks untracked) | **Completed**: 2025-11-17

Eliminated nested scrollbar issues in central section and sidebars. Fixed via layout component refactoring with proper overflow and padding settings. Implementation completed outside tasks.md workflow.

[View Spec](./011-fix-vertical-scrolling/)

---

### spec-012: History Catalogue Tracking
**Status**: ✅ Complete | **Completed**: 2025-11-17

Enhanced history tracking and catalogue management using catalogue storage provider's special "history" list. Implemented via commit `feat(web): migrate to catalogue-based history tracking system`.

[View Spec](./012-history-catalogue-tracking/)

---

### spec-013: Walden Research (OpenAlex Data Version 2)
**Status**: ✅ Complete | **Completed**: 2025-11-16

OpenAlex Walden (Data Version 2) support with xpac works (datasets, software, specimens). Includes visual distinction, work type badges, and Settings toggle for 190M additional research outputs.

[View Spec](./013-walden-research/)

---

### spec-014: Edge Direction Correction
**Status**: ✅ Complete | **Completed**: 2025-11-18

Corrected graph edge directions to match OpenAlex data ownership model. Multi-modal visual distinction (line style + color + arrows), direction filter UI. Outbound edges: solid lines (data on source), inbound edges: dashed lines (reverse lookup). Tasks.md partially updated but implementation verified complete.

[View Spec](./014-edge-direction-correction/)

---

### spec-015: OpenAlex Relationships
**Status**: ✅ Complete | **Completed**: 2025-11-18

Complete relationship implementation across all OpenAlex entity types. 90 tasks across 10 phases covering bidirectional relationships, type safety, and performance optimization.

[View Spec](./015-openalex-relationships/)

---

### spec-016: Entity Relationship Visualization
**Status**: ✅ Complete | **Completed**: 2025-11-18

Enhanced entity detail pages with relationship visualization capabilities. Type filtering (multi-select checkboxes), count summaries (incoming/outgoing badges), localStorage persistence, loading/error states. All 7 entity types integrated. Tasks.md not updated but implementation verified complete.

[View Spec](./016-entity-relationship-viz/)

---

### spec-017: Entity Taxonomy Centralization
**Status**: ✅ Complete | **Superseded**: 2025-11-21 by spec-018

Centralized entity taxonomy definitions and ENTITY_METADATA to `@bibgraph/types`. Core implementation in entity-metadata.ts. Remaining tasks completed as part of spec-018 (Entity Consolidation).

[View Spec](./017-entity-taxonomy-centralization/)

---

### spec-018: Entity Consolidation
**Status**: ✅ Complete | **Completed**: 2025-11-21

EntityType consolidation to `@bibgraph/types` as single source of truth. All 40 tasks complete. All imports updated to use canonical source.

[View Spec](./018-entity-consolidation/)

---

### spec-019: Full Entity Support
**Status**: ✅ Complete | **Completed**: 2025-11-21

Implementation of all 12 OpenAlex entity types: Works, Authors, Sources, Institutions, Publishers, Funders, Topics, Concepts, Keywords, Domains, Fields, Subfields. Licenses excluded per research findings (not OpenAlex entities). All 11 tasks complete.

[View Spec](./019-full-entity-support/)

---

### spec-020: E2E Test Coverage
**Status**: 🚧 In Progress | **Progress**: 0/107 tasks

E2E test coverage enhancement. Plan to add missing tests for untested routes, implement workflow tests, add error scenario coverage, and automate high-value manual tests.

[View Spec](./020-e2e-test-coverage/)

---

### spec-021: Mantine Responsive Layout
**Status**: ✅ Complete (tasks untracked) | **Completed**: 2025-11-21

Mantine UI responsive layout configuration corrections. Fixed layout issues with proper breakpoint configuration and auto-layout settings. Mobile search Enter-key trigger implemented. Implementation completed outside tasks.md workflow.

[View Spec](./021-mantine-responsive-layout/)

---

### spec-022: PostHog Sourcemaps
**Status**: 🚧 In Progress | **Progress**: 14/117 tasks (12%)

PostHog sourcemap integration for production error tracking with readable stack traces. Phases 1-2 and partial Phase 4 complete.

[View Spec](./022-posthog-sourcemaps/)

---

### spec-023: CI Optimization
**Status**: 🚧 In Progress (Near Complete) | **Progress**: 30/41 tasks (73%)

CI/CD pipeline optimization for faster build and deployment times. Build artifact caching, parallel test execution, conditional job skipping. Core implementation complete; testing and validation remain.

[View Spec](./023-ci-optimization/)

---

### spec-024: Algorithms Package
**Status**: ✅ Complete | **Completed**: 2025-11-25

Core graph algorithms with Result/Option error handling. Traversal (DFS, BFS), pathfinding (Dijkstra), analysis (connected components, SCC, cycle detection, topological sort). 112/112 tests passing.

[View Spec](./024-algorithms-package/)

---

### spec-025: Graph Clustering
**Status**: ✅ Complete | **Completed**: 2025-11-25

9 clustering algorithms implemented: Louvain, Spectral, Hierarchical, K-Core, Leiden, Label Propagation, Infomap, Core-Periphery, Biconnected Components. 134 tasks, 51/65 tests passing (79%).

[View Spec](./025-graph-clustering/)

---

### spec-026: Graph Extraction
**Status**: ✅ Complete | **Completed**: 2025-11-26

Academic graph pattern extraction module with ego networks, path-based extraction, filter-based extraction, motif detection, k-truss decomposition, and general subgraph extraction. 97 tests passing (427 total algorithms package tests).

[View Spec](./026-graph-extraction/)

---

### spec-027: Louvain Scaling Optimization
**Status**: ✅ Complete | **Completed**: 2025-11-26

Louvain algorithm scaling optimization with 97% performance improvement. 5 optimization phases: adaptive thresholds, optimized density calculation, early termination, priority queue (disabled), CSR representation. 443ms for 1000 nodes (down from 15.4s baseline). 19x scaling ratio for 10x nodes.

[View Spec](./027-louvain-scaling-optimization/)

---

### spec-028: Complete OpenAlex Relationships
**Status**: ✅ Complete | **Completed**: 2025-11-26

Extension of spec-015 for complete relationship coverage. Added relationship extractors for grants (FUNDED_BY), keywords (WORK_HAS_KEYWORD), concepts (CONCEPT - legacy), institution topics, repositories, roles, and source topics. 89/89 tasks complete.

[View Spec](./028-complete-openalex-relationships/)

---

### spec-029: Advanced Literature Review Workflows
**Status**: 📝 Draft | **Created**: 2025-11-30

Enhanced catalogue feature for advanced literature review workflows including PRISMA systematic reviews, semantic analysis, citation export formats (BibTeX/RIS), custom entity support for non-OpenAlex works, and live file system synchronization using browser File System Access API.

[View Spec](./029-literature-review/)

---

### spec-030: Remove Algorithm Result Truncation
**Status**: ✅ Complete | **Completed**: 2026-01-13

Removed algorithm result truncation to show all results instead of "+N more" text. All motif detection results (triangles, star patterns, co-citations, bib coupling) now display completely. Button text updated to "Highlight All Triangles". Other components already displayed full results.

[View Spec](./030-remove-algorithm-truncation/)

---

### spec-031: 3D Graph Visualization
**Status**: ✅ Complete | **Completed**: 2025-11-30

3D graph visualization for the algorithms page using react-force-graph-3d. Interactive 3D exploration with camera controls, enhanced depth cues via MeshPhongMaterial, 2D/3D mode toggle with localStorage persistence, WebGL detection with graceful degradation, keyboard accessibility (arrow keys, +/-, Home, R). E2E and unit tests included.

[View Spec](./031-3d-graph-visualization/)

---

### spec-033: Entity Graph Page
**Status**: ✅ Complete | **Completed**: 2025-12-01

Dedicated `/graph` route for visualizing repository entities as an interactive force-directed graph. Displays entities stored in IndexedDB (via repository store) with 2D/3D view toggle, highlight/filter display modes, community detection, pathfinding algorithms, and fit-to-view controls. Reusable hooks (`useRepositoryGraph`, `useGraphVisualization`) extracted from algorithms page for shared state management.

[View Spec](./033-entity-graph-page/)

---

### spec-034: Persistent Graph Index
**Status**: ✅ Complete | **Completed**: 2025-12-02

Persistent graph index layer for the unified tiered cache system. Stores relationship structure (nodes as entity IDs, edges as relationships) in Dexie/IndexedDB with in-memory Graph class for fast traversal. Graph is derived automatically when entities are cached. Enables graph-native queries (neighbors, paths, subgraphs), interactive node expansion (click-to-expand), and faster visualization loading without re-extracting edges from entity data. Integrated as toggleable data source on /graph page.

[View Spec](./034-persistent-graph-index/)

---

## Known Issues

### Spec Numbering Cleanup (2025-11-25)

**Resolved Issues**:
- **Duplicate 020**: Renumbered `020-complete-openalex-relationships` → `028-complete-openalex-relationships`
- **Duplicate 022**: Removed empty `022-graph-extraction` directory (actual spec correctly located at `026-graph-extraction`)

All duplicate spec numbers have been resolved. Current spec numbering is consistent with one spec per number.

---

## SpecKit Workflow

Each specification follows a structured workflow:

1. **`/speckit.specify`** - Create initial specification from user requirements
2. **`/speckit.plan`** - Generate implementation plan with technical context
3. **`/speckit.tasks`** - Break down plan into atomic, executable tasks
4. **`/speckit.implement`** - Execute tasks with continuous execution

### Spec Directory Structure

```
specs/###-feature-name/
├── spec.md              # Feature specification with user stories
├── plan.md              # Implementation plan with technical context
├── tasks.md             # Actionable task breakdown
├── research.md          # Research findings and analysis
├── data-model.md        # Data models and schemas
└── contracts/           # API contracts and interfaces
```

## Constitution Compliance

All specifications must align with the [BibGraph Constitution](../.specify/memory/constitution.md), including:

- Type Safety (no `any` types)
- Test-First Development (Red-Green-Refactor)
- Monorepo Architecture (Nx workspace)
- Storage Abstraction (provider interface)
- Performance & Memory (serial tests, optimization)
- Atomic Conventional Commits (incremental commits)
- Development-Stage Pragmatism (breaking changes OK)
- Test-First Bug Fixes (reproduce before fixing)
- Deployment Readiness (all packages passing)
- Continuous Execution (no pausing between phases)
- Complete Implementation (no simplified fallbacks)
- Spec Index Maintenance (this file kept current)

---

**Last Updated**: 2026-01-13 | **Total Specs**: 32 | **Maintained by**: [Constitution Principle XII](../.specify/memory/constitution.md#xii-spec-index-maintenance-non-negotiable)
