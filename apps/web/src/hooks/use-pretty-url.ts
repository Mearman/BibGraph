import { logger } from "@bibgraph/utils/logger";
import { useEffect } from "react";

/**
 * Hook to update the browser URL to show a "pretty" (decoded) version
 * of entity IDs while maintaining functional routing with encoded IDs.
 *
 * For example:
 * - Encoded: /#/works/https%3A%2F%2Fdoi.org%2F10.7717%2Fpeerj.4375
 * - Pretty:  /#/works/https://doi.org/10.7717/peerj.4375
 * @param entityType - The entity type (works, authors, institutions, etc.)
 * @param rawId - The raw (potentially encoded) entity ID from route params (Note: TanStack Router auto-decodes this)
 * @param decodedId - The decoded entity ID (after additional processing like fixing collapsed slashes)
 */
const URL_UPDATE_RETRY_DELAY_MS = 100;

export const usePrettyUrl = (entityType: string, rawId: string | undefined, decodedId: string | undefined): void => {

  useEffect(() => {
    if (rawId === undefined || rawId === "" || decodedId === undefined || decodedId === "") return undefined;

    // Function to check and update URL
    const checkAndUpdateUrl = () => {
      const currentHash = window.location.hash;
      const hashPath = currentHash.split("?", 1)[0];

      // Check if the URL contains the encoded version and not the decoded version
      if (hashPath.includes("%") && !hashPath.includes(decodedId)) {
        // Extract query parameters carefully to avoid duplication
        let queryParameters = "";
        const queryIndex = currentHash.indexOf("?");
        if (queryIndex !== -1) {
          queryParameters = currentHash.slice(queryIndex);
          // Fix duplicated query parameters like ?select=x?select=x by parsing and rebuilding
          const queryString = queryParameters.slice(1); // Remove the ?

          // Check if query parameters contain duplicates (has multiple ? characters)
          if (queryString.includes("?")) {
            // Only use URLSearchParams if there are duplicates to fix
            const uniqueParameters = new URLSearchParams(queryString).toString();
            queryParameters = uniqueParameters ? "?" + uniqueParameters : "";
          }
          // If no duplicates, preserve original query parameters to avoid double-encoding
        }

        const decodedHash = `#/${entityType}/${decodedId}${queryParameters}`;
        const newUrl = window.location.pathname + window.location.search + decodedHash;

        // Only update if the URL would actually change
        if (newUrl !== window.location.href) {
          logger.debug("routing", "usePrettyUrl updating URL", {
            entityType,
            rawId,
            decodedId,
            oldHash: currentHash,
            queryParams: queryParameters,
            newHash: decodedHash
          });
          window.history.replaceState(window.history.state, "", newUrl);
        }
      }
    };

    // Check immediately
    checkAndUpdateUrl();

    // Also check after a short delay to handle any async loading
    const timeoutId = setTimeout(checkAndUpdateUrl, URL_UPDATE_RETRY_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [entityType, rawId, decodedId]);
};
