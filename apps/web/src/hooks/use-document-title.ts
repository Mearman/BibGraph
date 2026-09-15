/**
 * Hook for managing document title dynamically
 * Allows setting page titles based on entity data or route content
 */

import { logger } from "@bibgraph/utils/logger";
import { useEffect, useRef } from "react";

interface UseDocumentTitleOptions {
  /**
   * Base title to append after the main title. Defaults to "BibGraph".
   */
  baseTitle?: string;
  /**
   * Whether to restore the original title when the component unmounts. Defaults to false.
   */
  restoreOnUnmount?: boolean;
}

/**
 * Hook to set the document title dynamically
 * @param title - The main title to set (entity name, page name, etc.)
 * @param options - Configuration options
 * @example
 * ```typescript
 * // Set title for entity page
 * useDocumentTitle(entity?.display_name);
 *
 * // Set title with custom base
 * useDocumentTitle("Search Results", { baseTitle: "BibGraph" });
 *
 * // Restore original title on unmount
 * useDocumentTitle("Temporary Title", { restoreOnUnmount: true });
 * ```
 */
export const useDocumentTitle = (
  title: string | null | undefined,
  options: Readonly<UseDocumentTitleOptions> = {},
) => {
  const { baseTitle = "BibGraph", restoreOnUnmount = false } = options;

  const originalTitle = useRef<string | null>(null);

  useEffect(() => {
    // Store original title on first mount
    originalTitle.current ??= document.title;

    // Safely handle title with proper type guards
    const trimmedTitle = typeof title === "string" ? title.trim() : "";

    // Only update title if we have a valid non-empty title
    if (trimmedTitle) {
      const newTitle = `${trimmedTitle} - ${baseTitle}`;
      document.title = newTitle;

      logger.debug(
        "ui",
        "Document title updated",
        {
          newTitle,
          entityTitle: trimmedTitle,
          baseTitle,
        },
        "useDocumentTitle",
      );
    } else {
      // Reset to base title if no specific title provided
      document.title = baseTitle;

      logger.debug(
        "ui",
        "Document title reset to base",
        {
          baseTitle,
          ...(title !== undefined &&
            title !== null && { receivedTitle: title }),
        },
        "useDocumentTitle",
      );
    }
  }, [title, baseTitle]);

  useEffect(() => {
    // Cleanup effect for restoring original title
    if (restoreOnUnmount) {
      return () => {
        if (originalTitle.current === null || originalTitle.current === "") {
        	return;
        }

        document.title = originalTitle.current;
        logger.debug(
          "ui",
          "Document title restored",
          {
            restoredTitle: originalTitle.current,
          },
          "useDocumentTitle",
        );
      };
    }
    return undefined;
  }, [restoreOnUnmount]);
};

/**
 * Hook specifically for entity pages that extracts display_name from entity data
 * @param entity - OpenAlex entity with display_name property
 * @param options - Configuration options
 * @example
 * ```typescript
 * useEntityDocumentTitle(author);
 * ```
 */
export const useEntityDocumentTitle = (
  entity: { display_name?: string } | null | undefined,
  options: Readonly<UseDocumentTitleOptions> = {},
) => {
  const displayName = entity?.display_name;
  useDocumentTitle(displayName, options);
};
