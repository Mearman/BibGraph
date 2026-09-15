/**
 * React Router mocking utilities for TanStack Router testing Provides consistent mocking patterns for router-dependent components
 */

import React from "react";
import { vi } from "vitest";

/**
 * Mock location shape shared by router state and resolved location
 */
interface MockLocation {
  pathname: string;
  search: string;
  hash: string;
  href: string;
  state?: undefined;
  maskedLocation?: undefined;
}

/**
 * Mock router-state shape used by both the router object and useRouterState
 */
interface MockRouterState {
  location: MockLocation;
  resolvedLocation: Omit<MockLocation, "state" | "maskedLocation">;
  status: "idle";
  isFetching: boolean;
  isLoading: boolean;
  isTransitioning: boolean;
}

/**
 * Mock router object matching the subset of the TanStack Router API used in tests
 */
interface MockRouter extends Record<string, unknown> {
  navigate: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  preload: ReturnType<typeof vi.fn>;
  buildLocation: ReturnType<typeof vi.fn>;
  buildHref: ReturnType<typeof vi.fn>;
  state: MockRouterState;
  history: {
    length: number;
    action: "POP";
    location: {
      pathname: string;
      search: string;
      hash: string;
      state: undefined;
      key: string;
    };
    listen: ReturnType<typeof vi.fn>;
    push: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
    go: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
    forward: ReturnType<typeof vi.fn>;
    createHref: ReturnType<typeof vi.fn>;
  };
}

/**
 * Mock navigation context shape
 */
interface MockNavigation extends Record<string, unknown> {
  navigate: ReturnType<typeof vi.fn>;
  buildLocation: ReturnType<typeof vi.fn>;
}

/**
 * Mock route context shape
 */
interface MockRouteContext {
  routeId: string;
  params: Record<string, string>;
  search: Record<string, never>;
  loaderData: Record<string, never>;
  actionData: undefined;
  routeSearch: Record<string, never>;
  routeParams: Record<string, string>;
  pathname: string;
  href: string;
}

/**
 * Mock route match shape
 */
interface MockMatch extends Record<string, unknown> {
  id: string;
  params: Record<string, unknown>;
  pathname: string;
  search: Record<string, unknown>;
  hash: string;
  fullPath: string;
  state: undefined;
  staticData: undefined;
  loaderData: undefined;
  actionData: undefined;
  error: undefined;
  status: "success";
  isFetching: boolean;
  invalidAt: number;
  preload: ReturnType<typeof vi.fn>;
}

/**
 * Mock TanStack Router hooks shape used for testing
 */
interface MockRouterHooks {
  useRouter: () => MockRouter;
  useNavigate: () => ReturnType<typeof vi.fn>;
  useLocation: () => MockLocation;
  useParams: () => Record<string, never>;
  useSearch: () => Record<string, never>;
  useMatches: () => MockMatch[];
  useMatch: () => MockMatch;
  useRouteContext: () => Record<string, never>;
  useLoaderData: () => undefined;
  useRouterState: () => MockRouterState;
}

const createMockLocation = (): MockLocation => ({
  pathname: "/",
  search: "",
  hash: "",
  href: "/",
  state: undefined,
  maskedLocation: undefined,
});

const createMockRouterState = (): MockRouterState => ({
  location: createMockLocation(),
  resolvedLocation: {
    pathname: "/",
    search: "",
    hash: "",
    href: "/",
  },
  status: "idle",
  isFetching: false,
  isLoading: false,
  isTransitioning: false,
});

/**
 * Mock router with commonly used methods and properties
 */
export const createMockRouter = (overrides: Readonly<Partial<MockRouter>> = {}): MockRouter => ({
  navigate: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  invalidate: vi.fn(),
  load: vi.fn(),
  preload: vi.fn(),
  buildLocation: vi.fn(),
  buildHref: vi.fn(),
  state: createMockRouterState(),
  history: {
    length: 1,
    action: "POP",
    location: {
      pathname: "/",
      search: "",
      hash: "",
      state: undefined,
      key: "default",
    },
    listen: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    createHref: vi.fn(),
  },
  ...overrides,
});

/**
 * Mock navigation context for TanStack Router
 */
export const createMockNavigation = (
  overrides: Readonly<Partial<MockNavigation>> = {},
): MockNavigation => ({
  navigate: vi.fn(),
  buildLocation: vi.fn(),
  ...overrides,
});

/**
 * Mock route context for specific routes
 */
export const createMockRouteContext = (
  routeId: string,
  params: Readonly<Record<string, string>> = {},
): MockRouteContext => ({
  routeId,
  params,
  search: {},
  loaderData: {},
  actionData: undefined,
  routeSearch: {},
  routeParams: params,
  pathname: `/${Object.values(params).join("/")}`,
  href: `/${Object.values(params).join("/")}`,
});

/**
 * Mock match object for route matching
 */
export const createMockMatch = (overrides: Readonly<Partial<MockMatch>> = {}): MockMatch => ({
  id: "test-route",
  params: {},
  pathname: "/",
  search: {},
  hash: "",
  fullPath: "/",
  state: undefined,
  staticData: undefined,
  loaderData: undefined,
  actionData: undefined,
  error: undefined,
  status: "success",
  isFetching: false,
  invalidAt: Infinity,
  preload: vi.fn(),
  ...overrides,
});

/**
 * Options accepted by withMockRouter to control the mocked router state
 */
interface WithMockRouterOptions {
  pathname?: string;
  search?: string;
  params?: Record<string, string>;
  navigate?: ReturnType<typeof vi.fn>;
}

/**
 * Higher-order component to wrap components with mock router context
 */
export const withMockRouter = <P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  routerOptions?: Readonly<WithMockRouterOptions>,
) => (properties: P) => {
    const pathname = routerOptions?.pathname ?? "/";
    const search = routerOptions?.search ?? "";
    const mockRouter = createMockRouter({
      state: {
        location: {
          pathname,
          search,
          hash: "",
          href: pathname + search,
          state: undefined,
          maskedLocation: undefined,
        },
        resolvedLocation: {
          pathname,
          search,
          hash: "",
          href: pathname + search,
        },
        status: "idle",
        isFetching: false,
        isLoading: false,
        isTransitioning: false,
      },
      navigate: routerOptions?.navigate ?? vi.fn(),
    });

    // Mock the router context
    React.useContext = vi.fn().mockReturnValue(mockRouter);

    return React.createElement(Component, properties);
  };

/**
 * Mock TanStack Router hooks for testing
 */
export const mockRouterHooks: MockRouterHooks = {
  useRouter: () => createMockRouter(),
  useNavigate: () => vi.fn(),
  useLocation: () => createMockLocation(),
  useParams: () => ({}),
  useSearch: () => ({}),
  useMatches: () => [createMockMatch()],
  useMatch: () => createMockMatch(),
  useRouteContext: () => ({}),
  useLoaderData: () => {
    // No loader data by default in tests
    return undefined;
  },
  useRouterState: () => createMockRouterState(),
};

/**
 * Type guard for a vitest mock function, used to safely call `mockReset()`
 * @param value - Value to check
 * @returns True if the value is a function carrying a `mockReset` method
 */
const isMockFunction = (value: unknown): value is { mockReset: () => void } =>
  typeof value === "function" && "mockReset" in value;

/**
 * Setup function to mock all TanStack Router modules Call this in your test setup to mock router dependencies
 */
export const setupRouterMocks = () => {
  // Mock @tanstack/react-router with vi.mock (top-level mocking)
  vi.mock("@tanstack/react-router", async () => {
    const actual = await vi.importActual("@tanstack/react-router");
    return {
      ...actual,
      ...mockRouterHooks,
      Link: ({ children, to, ...properties }: React.PropsWithChildren<{ to: string } & Record<string, unknown>>) =>
        React.createElement("a", { href: to, ...properties }, children),
      Outlet: ({ ...properties }: Record<string, unknown>) =>
        React.createElement("div", {
          "data-testid": "router-outlet",
          ...properties,
        }),
      Navigate: ({ to }: { to: string }) =>
        React.createElement("div", {
          "data-testid": "navigate",
          "data-to": to,
        }),
      createRouter: vi.fn(() => createMockRouter()),
      createRootRoute: vi.fn(),
      createRoute: vi.fn(),
      createFileRoute: vi.fn((path: string) => (options?: Record<string, unknown>) => {
        const route = {
          path,
          options: options ?? {},
          ...options,
        };
        return route;
      }),
      RouterProvider: async ({ children }: React.PropsWithChildren<Record<string, unknown>>) => children,
      useRouterState: mockRouterHooks.useRouterState,
      useRouter: mockRouterHooks.useRouter,
      useNavigate: mockRouterHooks.useNavigate,
      useLocation: mockRouterHooks.useLocation,
      useParams: mockRouterHooks.useParams,
      useSearch: mockRouterHooks.useSearch,
      useMatches: mockRouterHooks.useMatches,
      useMatch: mockRouterHooks.useMatch,
      useRouteContext: mockRouterHooks.useRouteContext,
      useLoaderData: mockRouterHooks.useLoaderData,
    };
  });

  // Mock specific router components used in the app
  vi.mock("@/lib/router", () => ({
    router: createMockRouter(),
  }));
};

/**
 * Reset all router mocks to their initial state
 */
export const resetRouterMocks = () => {
  for (const hook of Object.values(mockRouterHooks)) {
    if (isMockFunction(hook)) {
      hook.mockReset();
    }
  }
};
