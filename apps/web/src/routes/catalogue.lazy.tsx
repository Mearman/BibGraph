import { logger } from "@bibgraph/utils/logger";
import { createLazyFileRoute, useSearch } from "@tanstack/react-router";

import { CatalogueErrorBoundary } from "@/components/catalogue/CatalogueErrorBoundary";
import { CatalogueManager } from "@/components/catalogue/CatalogueManager";
import { CatalogueProvider } from "@/contexts/catalogue-context";

// T078: Wrap CatalogueManager in error boundary for graceful error handling T082: Wrap in CatalogueProvider to share useCatalogue state between components
const CataloguePage = () => {
  // T064: Get search params from router
  const search = useSearch({ from: "/catalogue" });

  logger.debug("catalogue", "Catalogue page rendering", {
    hasShareData: search.data !== undefined && search.data !== "",
    initialListId: search.list,
  });

  return (
    <CatalogueProvider>
      <CatalogueErrorBoundary>
        <div data-testid="catalogue-manager">
          <CatalogueManager shareData={search.data} initialListId={search.list} />
        </div>
      </CatalogueErrorBoundary>
    </CatalogueProvider>
  );
};

export const Route = createLazyFileRoute("/catalogue")({
  component: CataloguePage,
});

export default CataloguePage;