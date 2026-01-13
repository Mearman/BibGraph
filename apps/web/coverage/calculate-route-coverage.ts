/**
 * Route Coverage Calculation Script
 *
 * Calculates E2E test coverage percentage for all documented routes.
 * Run with: `pnpm exec tsx apps/web/coverage/calculate-route-coverage.ts`
 *
 * @module coverage/calculate-route-coverage
 */

import { ROUTE_MANIFEST, COVERAGE_STATS } from './route-manifest';

console.log('═══════════════════════════════════════════════════════════════');
console.log('BibGraph E2E Route Coverage Report');
console.log('═══════════════════════════════════════════════════════════════\n');

// Overall statistics
console.log('📊 Overall Coverage:');
console.log(`   Total Routes: ${COVERAGE_STATS.totalRoutes}`);
console.log(`   Covered:      ${COVERAGE_STATS.withCoverage} routes`);
console.log(`   Coverage:     ${COVERAGE_STATS.coveragePercentage}%`);
console.log('');

// Coverage by category
console.log('📂 Coverage by Category:');
console.log(`   Utility Routes:      ${COVERAGE_STATS.byCategory.utility} total`);
console.log(`   Special Routes:      ${COVERAGE_STATS.byCategory.special} total`);
console.log(`   Entity Index Routes: ${COVERAGE_STATS.byCategory['entity-index']} total`);
console.log(`   Entity Detail Routes:${COVERAGE_STATS.byCategory['entity-detail']} total`);
console.log('');

// Coverage by entity type
console.log('🏷️  Coverage by Entity Type:');
COVERAGE_STATS.byEntityType.forEach(([entityType, count]) => {
  console.log(`   ${entityType.padEnd(15)} ${count} routes`);
});
console.log('');

// Uncovered routes
const uncovered = ROUTE_MANIFEST.filter((r) => !r.hasCoverage);
if (uncovered.length > 0) {
  console.log('⚠️  Routes WITHOUT Coverage:');
  uncovered.forEach((route) => {
    console.log(`   ${route.pattern.padEnd(40)} (${route.category}${route.entityType ? `, ${route.entityType}` : ''})`);
  });
  console.log('');
} else {
  console.log('✅ All routes have E2E test coverage!\n');
}

// Success criteria check
console.log('═══════════════════════════════════════════════════════════════');
if (COVERAGE_STATS.coveragePercentage >= 98) {
  console.log('✅ SUCCESS: Route coverage meets 98% target!');
  console.log(`   Current: ${COVERAGE_STATS.coveragePercentage}% ≥ Target: 98%`);
} else if (COVERAGE_STATS.coveragePercentage >= 80) {
  console.log('⚠️  WARNING: Route coverage below 98% target');
  console.log(`   Current: ${COVERAGE_STATS.coveragePercentage}% < Target: 98%`);
  console.log(`   Gap: ${98 - COVERAGE_STATS.coveragePercentage}%`);
} else {
  console.log('❌ FAILURE: Route coverage significantly below target');
  console.log(`   Current: ${COVERAGE_STATS.coveragePercentage}% << Target: 98%`);
  console.log(`   Gap: ${98 - COVERAGE_STATS.coveragePercentage}%`);
}
console.log('═══════════════════════════════════════════════════════════════');

// Exit with appropriate code
process.exit(COVERAGE_STATS.coveragePercentage >= 98 ? 0 : 1);
