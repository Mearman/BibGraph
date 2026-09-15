/**
 * React Context for injecting storage provider
 * Allows swapping between production (IndexedDB) and testing (in-memory) storage
 */

import type { CatalogueStorageProvider } from '@bibgraph/utils';
import { createContext, type ReactNode,use } from 'react';

/**
 * Context for providing storage implementation
 */
const StorageProviderContext = createContext<CatalogueStorageProvider | null>(null);

/**
 * Props for StorageProviderWrapper
 */
export interface StorageProviderWrapperProps {
	provider: CatalogueStorageProvider;
	children: ReactNode;
}

/**
 * Provider component that wraps the app with a storage implementation
 * @example
 * ```tsx
 * // Production setup
 * const storageProvider = new DexieStorageProvider(logger);
 * await storageProvider.initializeSpecialLists();
 *
 * <StorageProviderWrapper provider={storageProvider}>
 *   <App />
 * </StorageProviderWrapper>
 * ```
 * @example
 * ```tsx
 * // Test setup
 * const testStorage = new InMemoryStorageProvider();
 *
 * <StorageProviderWrapper provider={testStorage}>
 *   <ComponentUnderTest />
 * </StorageProviderWrapper>
 * ```
 */
export const StorageProviderWrapper = ({ provider, children }: StorageProviderWrapperProps) => <StorageProviderContext value={provider}>
			{children}
		</StorageProviderContext>;

/**
 * Hook to access the storage provider
 * @throws Error if used outside of StorageProviderWrapper
 * @example
 * ```tsx
 * function CatalogueManager() {
 *   const storage = useStorageProvider();
 *
 *   const createList = async () => {
 *     const listId = await storage.createList({
 *       title: "My List",
 *       type: "list",
 *     });
 *   };
 *
 *   return <button onClick={createList}>Create List</button>;
 * }
 * ```
 */
export const useStorageProvider = (): CatalogueStorageProvider => {
	const context = use(StorageProviderContext);

	if (!context) {
		throw new Error(
			'useStorageProvider must be used within a StorageProviderWrapper. ' +
			'Make sure your app is wrapped with <StorageProviderWrapper provider={storageProvider}>.'
		);
	}

	return context;
};
