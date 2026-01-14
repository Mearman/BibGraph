# @bibgraph/graph-expansion

Generic graph expansion and neighborhood traversal system for BibGraph.

## Overview

This package provides a generalized framework for expanding graphs by loading neighbor nodes and exploring graph neighborhoods, independent of the underlying graph data structure or API.

## Features

- **Generic Graph Expansion**: Works with any graph type through flexible interfaces
- **Traversal Algorithms**: Efficient neighborhood exploration (bidirectional BFS, etc.)
- **Caching Strategies**: Optional caching for expanded graph data
- **State Management**: Utilities for tracking expansion state and progress

## Usage

```typescript
import { expandGraph } from '@bibgraph/graph-expansion';

// Expand a graph starting from a seed node
const expanded = await expandGraph(seedNode, {
  maxDepth: 2,
  maxNodes: 100
});
```

## Development

```bash
# Run tests
pnpm test --filter=graph-expansion

# Type check
pnpm typecheck --filter=graph-expansion

# Build
pnpm build --filter=graph-expansion
```

## Related Packages

- `@bibgraph/graph-gen` - Test fixture generation
- `@bibgraph/algorithms` - Graph analysis algorithms
- `@bibgraph/types` - Shared type definitions
