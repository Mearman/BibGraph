/**
 * Combined setup for all test mocks
 */

import { setupComponentMocks } from "./component-mocks";
import { setupRouterMocks } from "./router-mocks";

/**
 * Setup all test mocks for component testing This function combines all mock setup functions
 */
export const setupAllTestMocks = () => {
  setupComponentMocks();
  setupRouterMocks();
};
