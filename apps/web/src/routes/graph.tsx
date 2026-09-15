/**
 * Graph route - entry point for entity graph visualization page
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

import { LazyRoute } from '@/components/routing/LazyRoute';

const GraphPage = lazy(async () => import('./graph.lazy'));

export const Route = createFileRoute('/graph')({
  component: () => (
    <LazyRoute>
      <GraphPage />
    </LazyRoute>
  ),
});
