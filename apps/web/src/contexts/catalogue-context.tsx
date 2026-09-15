/**
 * Catalogue Context Provider
 * Provides shared catalogue state and operations to child components
 *
 * This context ensures all components within the catalogue feature share
 * the same useCatalogue hook instance, preventing state isolation issues
 * where different components have different selectedList/entities state.
 */

import React, { createContext, type ReactNode,use } from "react";

import { useCatalogue, type UseCatalogueReturn } from "@/hooks/useCatalogue";

// Create context with undefined default (will throw if used outside provider)
const CatalogueContext = createContext<UseCatalogueReturn | undefined>(undefined);

interface CatalogueProviderProperties {
  children: ReactNode;
}

/**
 * Catalogue Provider Component
 * Wraps catalogue-related components to share a single useCatalogue instance
 */
export const CatalogueProvider = ({ children }: CatalogueProviderProperties) => {
  const catalogueState = useCatalogue();

  return (
    <CatalogueContext value={catalogueState}>
      {children}
    </CatalogueContext>
  );
};

/**
 * Hook to access catalogue context
 * Must be used within a CatalogueProvider
 */
export const useCatalogueContext = (): UseCatalogueReturn => {
  const context = use(CatalogueContext);

  if (context === undefined) {
    throw new Error("useCatalogueContext must be used within a CatalogueProvider");
  }

  return context;
};
