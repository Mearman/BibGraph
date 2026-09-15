/**
 * Test utilities for component tests
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  RenderHookOptions,
  RenderOptions} from "@testing-library/react";
import {
  render,
  renderHook
} from "@testing-library/react";
import React from "react";

// Create a test QueryClient
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Default QueryClient instance to prevent infinite render loops
const DEFAULT_QUERY_CLIENT = createTestQueryClient();

// Test wrapper component with QueryClient
export const TestWrapper: React.FC<{
  children: React.ReactNode;
  queryClient?: QueryClient;
}> = ({ children, queryClient = DEFAULT_QUERY_CLIENT }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Custom render function that includes QueryClient
export const renderWithQueryClient = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient },
): ReturnType<typeof render> => {
  const { queryClient, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: (properties) => <TestWrapper {...properties} queryClient={queryClient} />,
    ...renderOptions,
  });
};

// Custom renderHook function that includes QueryClient
export const renderHookWithQueryClient = <T, P>(
  hook: (properties: P) => T,
  options?: Omit<RenderHookOptions<P>, "wrapper"> & {
    queryClient?: QueryClient;
  },
): ReturnType<typeof renderHook<T, P>> => {
  const { queryClient, ...renderHookOptions } = options ?? {};
  return renderHook(hook, {
    wrapper: (properties) => <TestWrapper {...properties} queryClient={queryClient} />,
    ...renderHookOptions,
  });
};
