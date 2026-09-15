/**
 * Unpaywall API Client https://unpaywall.org/products/api
 *
 * API Usage Rules:
 * - Email address is REQUIRED in all requests
 * - Rate limit: 100,000 requests/day
 * - Requests should include email in query parameter
 */

import { logger } from "@bibgraph/utils";

import type {
  UnpaywallClientOptions,
  UnpaywallOaLocation,
  UnpaywallResponse,
} from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;
const HTTP_STATUS_NOT_FOUND = 404;

const isUnpaywallOaLocation = (value: unknown): value is UnpaywallOaLocation => {
  if (typeof value !== "object" || value === null) return false;
  if (!("url_for_pdf" in value)) return false;
  return typeof value.url_for_pdf === "string" || value.url_for_pdf === null;
};

const isUnpaywallResponse = (value: unknown): value is UnpaywallResponse => {
  if (typeof value !== "object" || value === null) return false;
  if (!("doi" in value) || typeof value.doi !== "string") return false;
  if (!("doi_url" in value) || typeof value.doi_url !== "string") return false;
  if (!("is_oa" in value) || typeof value.is_oa !== "boolean") return false;
  if (!("oa_locations" in value) || !Array.isArray(value.oa_locations)) return false;
  if (value.oa_locations.some((location: unknown) => !isUnpaywallOaLocation(location))) return false;
  if (!("best_oa_location" in value)) return false;
  if (value.best_oa_location !== null && !isUnpaywallOaLocation(value.best_oa_location)) return false;
  if (!("first_oa_location" in value)) return false;
  if (value.first_oa_location !== null && !isUnpaywallOaLocation(value.first_oa_location)) return false;
  return true;
};

export class UnpaywallApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "UnpaywallApiError";
    this.statusCode = statusCode;
  }
}

export class UnpaywallClient {
  private email: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: Readonly<UnpaywallClientOptions>) {
    if (!options.email.includes('@')) {
      throw new Error('Valid email address is required for Unpaywall API');
    }

    this.email = options.email;
    this.baseUrl = options.baseUrl ?? 'https://api.unpaywall.org/v2';
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Normalize DOI to bare DOI format (without URL prefix)
   */
  private normalizeDoi(doi: string): string {
    // Remove common DOI URL prefixes
    let normalized = doi.trim();

    // Remove https://doi.org/ or https://doi.org/
    normalized = normalized.replace(/^https?:\/\/doi\.org\//i, '');

    // Remove dx.doi.org prefix
    normalized = normalized.replace(/^https?:\/\/dx\.doi\.org\//i, '');

    // Remove doi: prefix
    normalized = normalized.replace(/^doi:/i, '');

    return normalized;
  }

  /**
   * Look up a work by DOI
   */
  async getByDoi(doi: string): Promise<UnpaywallResponse | null> {
    const normalizedDoi = this.normalizeDoi(doi);

    if (!normalizedDoi) {
      logger.debug('unpaywall', 'Empty DOI provided', { doi });
      return null;
    }

    const url = `${this.baseUrl}/${encodeURIComponent(normalizedDoi)}?email=${encodeURIComponent(this.email)}`;

    logger.debug('unpaywall', 'Fetching Unpaywall data', { doi: normalizedDoi });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, this.timeout);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === HTTP_STATUS_NOT_FOUND) {
        logger.debug('unpaywall', 'DOI not found in Unpaywall', { doi: normalizedDoi });
        return null;
      }

      if (!response.ok) {
        throw new UnpaywallApiError(
          `Unpaywall API error: ${String(response.status)} ${response.statusText}`,
          response.status
        );
      }

      const json: unknown = await response.json();

      if (!isUnpaywallResponse(json)) {
        throw new UnpaywallApiError('Unpaywall API returned an unexpected response shape');
      }

      logger.debug('unpaywall', 'Unpaywall data retrieved', {
        doi: normalizedDoi,
        isOa: json.is_oa,
        hasPdf: json.best_oa_location !== null && json.best_oa_location.url_for_pdf !== null,
      });

      return json;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new UnpaywallApiError('Unpaywall API request timeout');
      }

      if (error instanceof UnpaywallApiError) {
        throw error;
      }

      logger.error('unpaywall', 'Failed to fetch Unpaywall data', {
        doi: normalizedDoi,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new UnpaywallApiError(
        `Failed to fetch Unpaywall data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get PDF URL for a DOI Returns the best available PDF URL or null
   */
  async getPdfUrl(doi: string): Promise<string | null> {
    const data = await this.getByDoi(doi);

    if (!data) {
      return null;
    }

    // Try best_oa_location first
    if (data.best_oa_location !== null && data.best_oa_location.url_for_pdf !== null) {
      return data.best_oa_location.url_for_pdf;
    }

    // Try first_oa_location
    if (data.first_oa_location !== null && data.first_oa_location.url_for_pdf !== null) {
      return data.first_oa_location.url_for_pdf;
    }

    // Search through all locations
    for (const location of data.oa_locations) {
      if (location.url_for_pdf !== null) {
        return location.url_for_pdf;
      }
    }

    return null;
  }

  /**
   * Update the email used for API requests
   */
  updateEmail(email: string): void {
    if (!email.includes('@')) {
      throw new Error('Valid email address is required for Unpaywall API');
    }
    this.email = email;
  }
}

// Singleton instance - must be initialized with email before use
let clientInstance: UnpaywallClient | null = null;

/**
 * Get or create the Unpaywall client instance Returns null if email is not configured
 */
export const getUnpaywallClient = (email?: string): UnpaywallClient | null => {
  if (email !== undefined && email !== "") {
    if (clientInstance) {
      clientInstance.updateEmail(email);
    } else {
      clientInstance = new UnpaywallClient({ email });
    }
    return clientInstance;
  }

  return clientInstance;
};

/**
 * Create a new Unpaywall client with the given email
 */
export const createUnpaywallClient = (email: string): UnpaywallClient => new UnpaywallClient({ email });
