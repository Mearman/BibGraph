/**
 * API Field Validation E2E Tests
 *
 * Validates that the OpenAlex API returns all expected fields for each entity type.
 * This catches issues like:
 * - Invalid field names in ENTITY_FIELDS arrays
 * - API changes that remove fields
 * - Typos in field names
 * - Missing required fields
 *
 * This test would have caught the authorships_count bug that caused
 * https://mearman.github.io/BibGraph/#/works/W2009047091 to fail.
 */

import {
	AUTHOR_FIELDS,
	FUNDER_FIELDS,
	INSTITUTION_FIELDS,
	PUBLISHER_FIELDS,
	SOURCE_FIELDS,
	TOPIC_FIELDS,
	WORK_FIELDS,
} from '@bibgraph/types/entities';
import { expect,test } from '@playwright/test';

const API_BASE = 'https://api.openalex.org';
const TEST_TIMEOUT_MS = 60_000;
const MAX_LOGGED_EXTRA_FIELDS = 10;
const HTTP_BAD_REQUEST = 400;
const HTTP_OK = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

// Test entity IDs - using specific entities that are known to exist
const TEST_ENTITIES = {
	work: 'W2009047091', // The work that originally failed
	author: 'A5017898742',
	institution: 'I27837315',
	source: 'S137773608',
	publisher: 'P4310319900',
	funder: 'F4320308380',
	topic: 'T10159',
} as const;

type EntityType = keyof typeof TEST_ENTITIES;

interface FieldValidationResult {
	entityType: EntityType;
	entityId: string;
	missingFields: string[];
	extraFields: string[];
	totalExpectedFields: number;
	totalActualFields: number;
}

/**
 * Get expected fields for an entity type
 */
const getExpectedFields = (entityType: EntityType): readonly string[] => {
	switch (entityType) {
		case 'work':
			return WORK_FIELDS;
		case 'author':
			return AUTHOR_FIELDS;
		case 'institution':
			return INSTITUTION_FIELDS;
		case 'source':
			return SOURCE_FIELDS;
		case 'publisher':
			return PUBLISHER_FIELDS;
		case 'funder':
			return FUNDER_FIELDS;
		case 'topic':
			return TOPIC_FIELDS;
		default:
			throw new Error(`Unknown entity type: ${String(entityType)}`);
	}
};

/**
 * Validate that all expected fields are present in the API response
 */
const validateFields = (entityType: EntityType, entityId: string, data: Record<string, unknown>, expectedFields: readonly string[]): FieldValidationResult => {
	const actualFields = Object.keys(data);
	const expectedFieldSet = new Set(expectedFields);
	const actualFieldSet = new Set(actualFields);

	// Find fields that are in ENTITY_FIELDS but not in the API response
	const missingFields = [...expectedFields].filter(
		field => !actualFieldSet.has(field)
	);

	// Find fields in the API response that aren't in ENTITY_FIELDS
	// (This is just informational, not an error)
	const extraFields = actualFields.filter(
		field => !expectedFieldSet.has(field)
	);

	return {
		entityType,
		entityId,
		missingFields,
		extraFields,
		totalExpectedFields: expectedFields.length,
		totalActualFields: actualFields.length,
	};
};

test.describe('API Field Validation @manual', () => {
	test.setTimeout(TEST_TIMEOUT_MS); // 1 minute per test

	test('Work entity should return all expected fields', async ({ request }) => {
		const entityType = 'work';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const response = await request.get(`${API_BASE}/${entityType}s/${entityId}`);
		expect(response.ok()).toBeTruthy();

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		const result = validateFields(entityType, entityId, data, expectedFields);

		// Log results for debugging
		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${String(result.totalExpectedFields)}`);
		console.log(`  Actual fields: ${String(result.totalActualFields)}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${String(result.missingFields.length)}):`, result.missingFields);
		}

		if (result.extraFields.length > 0) {
			console.log(`  ℹ️  Extra fields (${String(result.extraFields.length)}):`, result.extraFields.slice(0, MAX_LOGGED_EXTRA_FIELDS));
		}

		// The test fails if any expected fields are missing
		expect(result.missingFields).toEqual([]);
	});

	test('Author entity should return all expected fields', async ({ request }) => {
		const entityType = 'author';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const response = await request.get(`${API_BASE}/${entityType}s/${entityId}`);
		expect(response.ok()).toBeTruthy();

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${String(result.totalExpectedFields)}`);
		console.log(`  Actual fields: ${String(result.totalActualFields)}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${String(result.missingFields.length)}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Institution entity should return all expected fields', async ({ request }) => {
		const entityType = 'institution';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const response = await request.get(`${API_BASE}/${entityType}s/${entityId}`);
		expect(response.ok()).toBeTruthy();

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${String(result.totalExpectedFields)}`);
		console.log(`  Actual fields: ${String(result.totalActualFields)}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${String(result.missingFields.length)}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Source entity should return all expected fields', async ({ request }) => {
		const entityType = 'source';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const response = await request.get(`${API_BASE}/${entityType}s/${entityId}`);
		expect(response.ok()).toBeTruthy();

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${String(result.totalExpectedFields)}`);
		console.log(`  Actual fields: ${String(result.totalActualFields)}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${String(result.missingFields.length)}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Publisher entity should return all expected fields', async ({ request }) => {
		const entityType = 'publisher';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const response = await request.get(`${API_BASE}/${entityType}s/${entityId}`);
		expect(response.ok()).toBeTruthy();

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${String(result.totalExpectedFields)}`);
		console.log(`  Actual fields: ${String(result.totalActualFields)}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${String(result.missingFields.length)}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Funder entity should return all expected fields', async ({ request }) => {
		const entityType = 'funder';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const response = await request.get(`${API_BASE}/${entityType}s/${entityId}`);
		expect(response.ok()).toBeTruthy();

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${String(result.totalExpectedFields)}`);
		console.log(`  Actual fields: ${String(result.totalActualFields)}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${String(result.missingFields.length)}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});

	test('Topic entity should return all expected fields', async ({ request }) => {
		const entityType = 'topic';
		const entityId = TEST_ENTITIES[entityType];
		const expectedFields = getExpectedFields(entityType);

		const response = await request.get(`${API_BASE}/${entityType}s/${entityId}`);
		expect(response.ok()).toBeTruthy();

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		const result = validateFields(entityType, entityId, data, expectedFields);

		console.log(`\n${entityType} ${entityId}:`);
		console.log(`  Expected fields: ${String(result.totalExpectedFields)}`);
		console.log(`  Actual fields: ${String(result.totalActualFields)}`);

		if (result.missingFields.length > 0) {
			console.log(`  ❌ Missing fields (${String(result.missingFields.length)}):`, result.missingFields);
		}

		expect(result.missingFields).toEqual([]);
	});
});

test.describe('API Error Detection @manual', () => {
	test.setTimeout(TEST_TIMEOUT_MS); // API tests need longer timeout

	test('Invalid select parameter should return 400 error', async ({ request }) => {
		const response = await request.get(
			`${API_BASE}/works/W2009047091?select=id,display_name,invalid_field_name`
		);

		// The API should return a 400 error for invalid field names
		expect(response.status()).toBe(HTTP_BAD_REQUEST);

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		expect(data).toHaveProperty('error');
		expect(data.error).toContain('invalid');
	});

	test('Work entity without select parameter should succeed', async ({ request }) => {
		const response = await request.get(`${API_BASE}/works/W2009047091`);

		// Should succeed without select parameter
		expect(response.status()).toBe(HTTP_OK);

		const data: unknown = await response.json();
		if (!isRecord(data)) throw new Error('Expected object response');
		expect(data).toHaveProperty('id');
		expect(data).toHaveProperty('display_name');
	});
});
