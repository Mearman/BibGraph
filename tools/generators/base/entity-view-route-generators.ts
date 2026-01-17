import { NormalizedEntityViewOptions } from './entity-view-types'

export const generateIndexRoute = (options: NormalizedEntityViewOptions): string => `import { createFileRoute } from '@tanstack/react-router'
import { ${options.entityNameCapitalized}ListView } from '@bibgraph/web/components/${options.componentDirectory}'

export const Route = createFileRoute('/entity-views/${options.routeDirectory}/')({
  component: ${options.entityNameCapitalized}ListView,
})
`;

export const generateDetailRoute = (options: NormalizedEntityViewOptions): string => `import { createFileRoute } from '@tanstack/react-router'
import { ${options.entityNameCapitalized}View } from '@bibgraph/web/components/${options.componentDirectory}'

export const Route = createFileRoute('/entity-views/${options.routeDirectory}/$entityId')({
  component: ${options.entityNameCapitalized}View,
})
`;

export const generateLazyIndexRoute = (options: NormalizedEntityViewOptions): string => `import { createLazyFileRoute } from '@tanstack/react-router'
import { ${options.entityNameCapitalized}ListView } from '@bibgraph/web/components/${options.componentDirectory}'

export const Route = createLazyFileRoute('/entity-views/${options.routeDirectory}/')({
  component: () => import('./index').then(m => <m.Route />),
})
`;

export const generateLazyDetailRoute = (options: NormalizedEntityViewOptions): string => `import { createLazyFileRoute } from '@tanstack/react-router'
import { ${options.entityNameCapitalized}View } from '@bibgraph/web/components/${options.componentDirectory}'

export const Route = createLazyFileRoute('/entity-views/${options.routeDirectory}/$entityId')({
  component: () => import('./$entityId').then(m => <m.Route />),
})
`;
