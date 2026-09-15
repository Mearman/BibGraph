/**
 * Test utilities barrel export
 * Exports all test utilities from the utils directory
 */

// Component mocks
export {
  mockXYFlow,
  mockD3Force,
  mockWebWorker,
  mockCanvas,
  mockIndexedDB,
  setupComponentMocks,
  resetComponentMocks,
} from "./component-mocks";

// Store mocks
export {
  createMockStore,
  createMockLayoutStore,
  createMockSettingsStore,
  createMockExpansionSettingsStore,
  mockStoreModule,
  withMockStores,
  resetMockStores,
} from "./store-mocks";

// Router mocks
export {
  createMockRouter,
  createMockNavigation,
  createMockRouteContext,
  createMockMatch,
  withMockRouter,
  mockRouterHooks,
  setupRouterMocks,
  resetRouterMocks,
} from "./router-mocks";

// Combined setup
export { setupAllTestMocks } from "./setup-all-test-mocks";