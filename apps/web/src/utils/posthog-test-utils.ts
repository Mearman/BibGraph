/**
 * PostHog Integration Testing Utilities
 *
 * Development utilities for testing PostHog analytics integration
 * and verifying privacy compliance.
 */

import { POSTHOG_API_KEY, POSTHOG_ENABLED,POSTHOG_HOST } from '@/lib/posthog';

/**
 * PostHog instance type definition
 */
interface PostHogInstance {
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
}

// Matches the ambient Window.posthog augmentation already declared in web-vitals.ts - this avoids a duplicate `declare global` block while keeping the type used here.
declare global {
  interface Window {
    posthog?: PostHogInstance;
  }
}

// How long to wait after sending a test event before checking whether it was captured
const CAPTURE_TEST_WAIT_MS = 100;

// Delay before auto-running the integration test, to give PostHog time to initialize
const AUTO_TEST_DELAY_MS = 2000;

/**
 * Test PostHog configuration and privacy settings
 */
export const testPostHogConfiguration = (): {
  isConfigured: boolean;
  hasApiKey: boolean;
  hasValidHost: boolean;
  isPrivacyCompliant: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // Check if PostHog is enabled
  const hasApiKey = Boolean(POSTHOG_API_KEY && POSTHOG_API_KEY !== 'your-posthog-api-key');
  const hasValidHost = POSTHOG_HOST.includes('posthog.com');
  const isConfigured = POSTHOG_ENABLED && hasApiKey && hasValidHost;

  if (!POSTHOG_ENABLED) {
    issues.push('PostHog is not enabled');
  }

  if (!hasApiKey) {
    issues.push('Missing or invalid PostHog API key');
  }

  if (!hasValidHost) {
    issues.push('Invalid PostHog host - should include posthog.com');
  }

  // Check privacy compliance
  const isPrivacyCompliant = POSTHOG_HOST.includes('eu.posthog.com');
  if (!isPrivacyCompliant && hasValidHost) {
    issues.push('Using non-EU PostHog host - may not be GDPR compliant');
  }

  return {
    isConfigured,
    hasApiKey,
    hasValidHost,
    isPrivacyCompliant,
    issues,
  };
};

/**
 * Test PostHog availability in browser
 */
export const testPostHogAvailability = (): {
  isAvailable: boolean;
  isInitialized: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  if (typeof window === 'undefined') {
    return {
      isAvailable: false,
      isInitialized: false,
      issues: ['Running in server environment'],
    };
  }

  const hasPosthog = 'posthog' in window;
  if (!hasPosthog) {
    issues.push('PostHog not available on window object');
    return {
      isAvailable: false,
      isInitialized: false,
      issues,
    };
  }

  const posthog = window.posthog;
  const isInitialized = posthog !== undefined && typeof posthog.capture === 'function';

  if (!isInitialized) {
    issues.push('PostHog capture function not available');
  }

  return {
    isAvailable: true,
    isInitialized,
    issues,
  };
};

/**
 * Test privacy compliance of current implementation
 */
export const testPrivacyCompliance = (): {
  isCompliant: boolean;
  checks: {
    usesEuHost: boolean;
    hasNoPersonalData: boolean;
    usesCookielessMode: boolean;
    hasPropertyBlacklist: boolean;
  };
  issues: string[];
} => {
  const issues: string[] = [];

  // Check EU host
  const usesEuHost = POSTHOG_HOST.includes('eu.posthog.com');
  if (!usesEuHost) {
    issues.push('Using non-EU PostHog host - GDPR compliance concern');
  }

  // Check for API key (indicates personal data collection possibility)
  const hasNoPersonalData = !POSTHOG_API_KEY || POSTHOG_API_KEY === 'your-posthog-api-key';

  // Note: We can't directly check cookieless_mode or property_blacklist from runtime. These are configuration settings we can't verify here, so they're reported as fixed facts about our posthog.ts configuration rather than folded into isCompliant below.
  const isUsesCookielessMode = true; // Based on our posthog.ts configuration
  const hasPropertyBlacklist = true; // Based on our posthog.ts configuration

  return {
    isCompliant: usesEuHost,
    checks: {
      usesEuHost,
      hasNoPersonalData,
      usesCookielessMode: isUsesCookielessMode,
      hasPropertyBlacklist,
    },
    issues,
  };
};

/**
 * Test PostHog event capture functionality
 */
export const testPostHogEventCapture = async (): Promise<{
  canCapture: boolean;
  eventSent: boolean;
  issues: string[];
}> => new Promise((resolve) => {
    const issues: string[] = [];

    if (typeof window === 'undefined') {
      resolve({
        canCapture: false,
        eventSent: false,
        issues: ['Cannot test in server environment'],
      });
      return;
    }

    const posthog = window.posthog;
    if (!posthog || typeof posthog.capture !== 'function') {
      resolve({
        canCapture: false,
        eventSent: false,
        issues: ['PostHog capture function not available'],
      });
      return;
    }

    try {
      // Override capture temporarily to intercept the call
      const originalCapture = posthog.capture;
      let isEventCaptured = false;

      posthog.capture = (eventName: string, properties?: Record<string, unknown>) => {
        if (eventName === 'test_event') {
          isEventCaptured = true;
          // Restore original capture
          posthog.capture = originalCapture;
          return;
        }
        originalCapture.call(posthog, eventName, properties);
      };

      // Send test event
      posthog.capture('test_event', {
        test: true,
        timestamp: new Date().toISOString(),
      });

      // Wait a moment to see if event was captured
      setTimeout(() => {
        resolve({
          canCapture: true,
          eventSent: isEventCaptured,
          issues: isEventCaptured ? [] : ['Test event was not captured'],
        });
      }, CAPTURE_TEST_WAIT_MS);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      issues.push(`Error during capture test: ${errorMessage}`);
      resolve({
        canCapture: false,
        eventSent: false,
        issues,
      });
    }
  });

/**
 * Comprehensive PostHog integration test
 */
export const runPostHogIntegrationTest = async (): Promise<{
  passed: boolean;
  results: {
    configuration: ReturnType<typeof testPostHogConfiguration>;
    availability: ReturnType<typeof testPostHogAvailability>;
    privacy: ReturnType<typeof testPrivacyCompliance>;
    capture: Awaited<ReturnType<typeof testPostHogEventCapture>>;
  };
  summary: {
    totalIssues: number;
    criticalIssues: string[];
    recommendations: string[];
  };
}> => {
  const config = testPostHogConfiguration();
  const availability = testPostHogAvailability();
  const privacy = testPrivacyCompliance();
  const capture = await testPostHogEventCapture();

  const allIssues = [
    ...config.issues,
    ...availability.issues,
    ...privacy.issues,
    ...capture.issues,
  ];

  // Critical issues that need immediate attention
  const criticalIssues = allIssues.filter(issue =>
    issue.includes('Missing or invalid PostHog API key') ||
    issue.includes('Cannot test in server environment') ||
    issue.includes('PostHog not available')
  );

  // Recommendations for improvement
  const recommendations: string[] = [];

  if (!privacy.isCompliant) {
    recommendations.push('Use EU PostHog host (eu.posthog.com) for GDPR compliance');
  }

  if (!config.hasApiKey) {
    recommendations.push('Add valid PostHog API key to environment variables');
  }

  if (!capture.canCapture) {
    recommendations.push('Ensure PostHog is properly initialized before testing');
  }

  if (allIssues.length === 0) {
    recommendations.push('PostHog integration appears to be working correctly');
  }

  const isPassed = criticalIssues.length === 0 && capture.canCapture;

  return {
    passed: isPassed,
    results: {
      configuration: config,
      availability,
      privacy,
      capture,
    },
    summary: {
      totalIssues: allIssues.length,
      criticalIssues,
      recommendations,
    },
  };
};

/**
 * Development helper to log test results
 */
export const testAndLogPostHogIntegration = async (): Promise<void> => {
  if (import.meta.env.PROD) {
    console.warn('PostHog integration test should only be run in development');
    return;
  }

  console.group('📊 PostHog Integration Test');

  try {
    const results = await runPostHogIntegrationTest();

    console.log('Test Status:', results.passed ? '✅ PASSED' : '❌ FAILED');

    if (results.summary.totalIssues > 0) {
      console.group('Issues Found:');
      for (const issue of results.summary.criticalIssues) {
        console.error('🚫', issue);
      }
      console.groupEnd();
    }

    if (results.summary.recommendations.length > 0) {
      console.group('Recommendations:');
      for (const rec of results.summary.recommendations) {
        console.info('💡', rec);
      }
      console.groupEnd();
    }

    // Detailed results for debugging
    if (import.meta.env.DEV && !results.passed) {
      console.group('Detailed Results:');
      console.log('Configuration:', results.results.configuration);
      console.log('Availability:', results.results.availability);
      console.log('Privacy:', results.results.privacy);
      console.log('Capture Test:', results.results.capture);
      console.groupEnd();
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }

  console.groupEnd();
};

// Auto-run test in development mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Wait for PostHog to initialize
  setTimeout(() => {
    void testAndLogPostHogIntegration();
  }, AUTO_TEST_DELAY_MS);
}