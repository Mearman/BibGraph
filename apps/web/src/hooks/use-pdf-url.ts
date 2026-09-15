/**
 * Hook to get PDF URL for a work entity
 * Checks OpenAlex data first, then falls back to Unpaywall API
 */

import { createUnpaywallClient, type UnpaywallClient } from "@bibgraph/client/unpaywall/client";
import { logger } from "@bibgraph/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { settingsStoreInstance } from "@/stores/settings-store";

import { MS_PER_DAY, MS_PER_HOUR } from "./time-constants";

/**
 * Narrows a nullable/optional string to a non-empty string
 */
const hasValue = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== "";

export interface PdfUrlResult {
  /**
  The PDF URL if available
   */
  pdfUrl: string | null;
  /**
  The source of the PDF URL (OpenAlex, Unpaywall, or null)
   */
  source: "OpenAlex" | "Unpaywall" | null;
  /**
  Whether the lookup is in progress
   */
  isLoading: boolean;
  /**
  Error message if lookup failed
   */
  error: string | null;
  /**
  Landing page URL (fallback if no direct PDF)
   */
  landingPageUrl: string | null;
  /**
  OA status from the source
   */
  oaStatus: string | null;
}

interface OpenAlexLocation {
  pdf_url?: string | null;
  landing_page_url?: string | null;
  is_oa?: boolean;
  version?: string | null;
  license?: string | null;
}

interface OpenAlexOpenAccess {
  is_oa?: boolean;
  oa_status?: string | null;
  oa_url?: string | null;
  any_repository_has_fulltext?: boolean;
}

interface WorkData {
  doi?: string | null;
  primary_location?: OpenAlexLocation | null;
  best_oa_location?: OpenAlexLocation | null;
  locations?: OpenAlexLocation[] | null;
  open_access?: OpenAlexOpenAccess | null;
}

/**
 * Extract PDF URL from OpenAlex work data
 */
const extractOpenAlexPdfUrl = (work: WorkData): {
  pdfUrl: string | null;
  landingPageUrl: string | null;
  oaStatus: string | null;
} => {
  // Try best_oa_location first (best quality OA version)
  if (hasValue(work.best_oa_location?.pdf_url)) {
    return {
      pdfUrl: work.best_oa_location.pdf_url,
      landingPageUrl: work.best_oa_location.landing_page_url ?? null,
      oaStatus: work.open_access?.oa_status ?? null,
    };
  }

  // Try primary_location
  if (hasValue(work.primary_location?.pdf_url)) {
    return {
      pdfUrl: work.primary_location.pdf_url,
      landingPageUrl: work.primary_location.landing_page_url ?? null,
      oaStatus: work.open_access?.oa_status ?? null,
    };
  }

  // Try open_access.oa_url
  if (hasValue(work.open_access?.oa_url)) {
    // Check if it looks like a PDF URL
    const oaUrl = work.open_access.oa_url;
    if (oaUrl.toLowerCase().endsWith('.pdf') || oaUrl.includes('/pdf/')) {
      return {
        pdfUrl: oaUrl,
        landingPageUrl: null,
        oaStatus: work.open_access.oa_status ?? null,
      };
    }
  }

  // Search through all locations
  if (work.locations && Array.isArray(work.locations)) {
    for (const location of work.locations) {
      if (hasValue(location.pdf_url)) {
        return {
          pdfUrl: location.pdf_url,
          landingPageUrl: location.landing_page_url ?? null,
          oaStatus: work.open_access?.oa_status ?? null,
        };
      }
    }
  }

  // Get landing page URL as fallback
  const landingPageUrl =
    work.best_oa_location?.landing_page_url ??
    work.primary_location?.landing_page_url ??
    null;

  return {
    pdfUrl: null,
    landingPageUrl,
    oaStatus: work.open_access?.oa_status ?? null,
  };
};

export interface UsePdfUrlOptions {
  /**
  Whether to enable Unpaywall fallback (default: true)
   */
  enableUnpaywallFallback?: boolean;
  /**
  Whether to skip the lookup entirely
   */
  skip?: boolean;
}

/**
 * Hook to get PDF URL for a work
 * @param work - Work data from OpenAlex
 * @param options - Configuration options
 */
export const usePdfUrl = (work: WorkData | null | undefined, options: Readonly<UsePdfUrlOptions> = {}): PdfUrlResult => {
  const { enableUnpaywallFallback = true, skip = false } = options;

  // State for email from settings
  const [email, setEmail] = useState<string | null>(null);

  // Load email from settings on mount
  useEffect(() => {
    const loadEmail = async () => {
      const storedEmail = await settingsStoreInstance.getPolitePoolEmail();
      if (storedEmail && settingsStoreInstance.isValidEmail(storedEmail)) {
        setEmail(storedEmail);
      }
    };
    void loadEmail();
  }, []);

  // Unpaywall client ref
  const unpaywallClientReference = useRef<UnpaywallClient | null>(null);

  // Create/update Unpaywall client when email changes
  useEffect(() => {
    unpaywallClientReference.current = hasValue(email) ? createUnpaywallClient(email) : null;
  }, [email]);

  // Extract DOI from work
  const doi = useMemo(() => {
    if (!hasValue(work?.doi)) return null;
    // Normalize DOI
    let normalized = work.doi.trim();
    normalized = normalized.replace(/^https?:\/\/doi\.org\//i, '');
    normalized = normalized.replace(/^doi:/i, '');
    return normalized || null;
  }, [work?.doi]);

  // Extract OpenAlex PDF info
  const openAlexResult = useMemo(() => {
    if (!work) {
      return { pdfUrl: null, landingPageUrl: null, oaStatus: null };
    }
    return extractOpenAlexPdfUrl(work);
  }, [work]);

  // Determine if we need to fetch from Unpaywall
  const shouldFetchUnpaywall = useMemo(() => {
    return (
      !skip &&
      enableUnpaywallFallback &&
      !hasValue(openAlexResult.pdfUrl) &&
      hasValue(doi) &&
      hasValue(email)
    );
  }, [skip, enableUnpaywallFallback, openAlexResult.pdfUrl, doi, email]);

  // Unpaywall result type
  interface UnpaywallResult {
    pdfUrl: string | null;
    landingPageUrl: string | null;
    oaStatus: string | null;
  }

  // Fetch from Unpaywall if needed
  const unpaywallQuery = useQuery<UnpaywallResult | null>({
    queryKey: ["unpaywall-pdf", doi, unpaywallClientReference.current],
    queryFn: async (): Promise<UnpaywallResult | null> => {
      if (!hasValue(doi) || unpaywallClientReference.current === null) {
        return null;
      }

      logger.debug("pdf", "Fetching PDF URL from Unpaywall", { doi });

      try {
        const data = await unpaywallClientReference.current.getByDoi(doi);
        if (!data) {
          return null;
        }

        // Extract PDF URL
        const pdfUrl =
          data.best_oa_location?.url_for_pdf ??
          data.first_oa_location?.url_for_pdf ??
          data.oa_locations.find(loc => hasValue(loc.url_for_pdf))?.url_for_pdf ??
          null;

        const landingPageUrl =
          data.best_oa_location?.url_for_landing_page ??
          data.first_oa_location?.url_for_landing_page ??
          null;

        return {
          pdfUrl,
          landingPageUrl,
          oaStatus: data.oa_status,
        };
      } catch (error) {
        logger.error("pdf", "Failed to fetch from Unpaywall", {
          doi,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    enabled: shouldFetchUnpaywall,
    staleTime: MS_PER_HOUR,
    gcTime: MS_PER_DAY,
    retry: 1,
  });

  // Compute final result
  const result = useMemo<PdfUrlResult>(() => {
    // Skip mode
    if (skip) {
      return {
        pdfUrl: null,
        source: null,
        isLoading: false,
        error: null,
        landingPageUrl: null,
        oaStatus: null,
      };
    }

    // OpenAlex has PDF
    if (hasValue(openAlexResult.pdfUrl)) {
      return {
        pdfUrl: openAlexResult.pdfUrl,
        source: "OpenAlex",
        isLoading: false,
        error: null,
        landingPageUrl: openAlexResult.landingPageUrl,
        oaStatus: openAlexResult.oaStatus,
      };
    }

    // Unpaywall loading
    if (shouldFetchUnpaywall && unpaywallQuery.isLoading) {
      return {
        pdfUrl: null,
        source: null,
        isLoading: true,
        error: null,
        landingPageUrl: openAlexResult.landingPageUrl,
        oaStatus: openAlexResult.oaStatus,
      };
    }

    // Unpaywall success
    if (hasValue(unpaywallQuery.data?.pdfUrl)) {
      return {
        pdfUrl: unpaywallQuery.data.pdfUrl,
        source: "Unpaywall",
        isLoading: false,
        error: null,
        landingPageUrl:
          unpaywallQuery.data.landingPageUrl ?? openAlexResult.landingPageUrl,
        oaStatus: unpaywallQuery.data.oaStatus ?? openAlexResult.oaStatus,
      };
    }

    // Unpaywall error
    if (unpaywallQuery.error) {
      return {
        pdfUrl: null,
        source: null,
        isLoading: false,
        error: "Failed to look up PDF from Unpaywall",
        landingPageUrl: openAlexResult.landingPageUrl,
        oaStatus: openAlexResult.oaStatus,
      };
    }

    // No PDF available but no email configured
    if (enableUnpaywallFallback && hasValue(doi) && !hasValue(email)) {
      return {
        pdfUrl: null,
        source: null,
        isLoading: false,
        error: "Configure email in settings to enable Unpaywall PDF lookup",
        landingPageUrl: openAlexResult.landingPageUrl,
        oaStatus: openAlexResult.oaStatus,
      };
    }

    // No PDF available
    return {
      pdfUrl: null,
      source: null,
      isLoading: false,
      error: null,
      landingPageUrl: openAlexResult.landingPageUrl,
      oaStatus: openAlexResult.oaStatus,
    };
  }, [
    skip,
    openAlexResult,
    shouldFetchUnpaywall,
    unpaywallQuery.isLoading,
    unpaywallQuery.data,
    unpaywallQuery.error,
    enableUnpaywallFallback,
    doi,
    email,
  ]);

  return result;
};
