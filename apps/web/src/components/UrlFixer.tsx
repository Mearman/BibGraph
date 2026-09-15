import { logger } from "@bibgraph/utils/logger";
import { useEffect } from 'react';

// Re-run delays (ms) for catching URL-fixing timing issues after router/history updates settle.
const URL_FIX_RETRY_DELAY_1_MS = 100;
const URL_FIX_RETRY_DELAY_2_MS = 500;
const URL_FIX_RETRY_DELAY_3_MS = 1000;
const URL_FIX_RETRY_DELAY_4_MS = 2000;

/**
 * Component that fixes URL display issues immediately when mounted. Handles both double hash issues and collapsed protocol slashes.
 */
export const UrlFixer = () => {
  useEffect(() => {
    const fixUrl = () => {
      const currentHash = window.location.hash;
      if (!currentHash || currentHash === '#') return;

      let isNeedsUpdate = false;
      let fixedHash = currentHash;

      // Fix double hash (##/... should become #/...)
      if (currentHash.startsWith('##')) {
        fixedHash = '#' + currentHash.slice(2);
        isNeedsUpdate = true;
      }

      // Fix collapsed protocol slashes (https:/doi.org should become https://doi.org)
      const collapsedRegex = /(^|\/)(https?:\/\/)([^/])/g;
      if (collapsedRegex.test(fixedHash)) {
        fixedHash = fixedHash.replaceAll(collapsedRegex, '$1$2$3');
        isNeedsUpdate = true;
      }

      // Apply fix if needed
      if (isNeedsUpdate && fixedHash !== currentHash) {
        const newUrl = window.location.pathname + window.location.search + fixedHash;
        window.history.replaceState(window.history.state, '', newUrl);
        logger.debug('routing', 'URL fix applied:', { original: currentHash, fixed: fixedHash });
      }
    };

    // Run immediately
    fixUrl();

    // Also run after short delays to catch any timing issues
    const timeoutId1 = setTimeout(fixUrl, URL_FIX_RETRY_DELAY_1_MS);
    const timeoutId2 = setTimeout(fixUrl, URL_FIX_RETRY_DELAY_2_MS);
    const timeoutId3 = setTimeout(fixUrl, URL_FIX_RETRY_DELAY_3_MS);
    const timeoutId4 = setTimeout(fixUrl, URL_FIX_RETRY_DELAY_4_MS);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
    };
  }, []);

  // This component doesn't render anything
  return null;
};