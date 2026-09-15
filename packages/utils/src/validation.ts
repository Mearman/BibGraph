/**
 * Generic validation utilities and type guards
 * These replace type assertions to provide safe runtime type validation
 */

/**
 * Validates and returns external API response data
 * This performs basic validation before trusting external type contracts
 */
export const validateApiResponse = (data: unknown): NonNullable<unknown> => {
	// Basic validation that we received some data
	if (data === null || data === undefined) {
		throw new Error("Received null or undefined response from API")
	}

	// Return validated data that is guaranteed to be non-null
	return data
};

/**
 * Trust external API contract after validation
 * This function exists to isolate the one place where we must trust external APIs
 * All external API responses eventually need this assertion due to TypeScript limitations
 */
export const trustApiContract = (validatedData: Readonly<NonNullable<unknown>>): unknown => validatedData;

/**
 * Type guard to verify if value is a record object Returns true if the value is a valid `Record<string, unknown>`
 */
export const isRecord = (obj: unknown): obj is Record<string, unknown> => typeof obj === "object" && obj !== null && !Array.isArray(obj);

/**
 * Safely convert validated object to record
 * This function assumes the object has already been validated as a record
 */
export const trustObjectShape = (obj: unknown): Record<string, unknown> => {
	if (!isRecord(obj)) {
		throw new Error("Object is not a valid record type")
	}
	// TypeScript knows this is a Record<string, unknown> after type guard
	return obj
};

/**
 * Extract a property value from an object with unknown structure
 * Returns unknown type that must be validated by caller
 */
export const extractProperty = ({
	obj,
	key,
}: {
	obj: Record<string, unknown>
	key: string
}): unknown => obj[key];

/**
 * Parameters for {@link isStringInSet}
 */
export interface StringInSetParams<T extends string> {
	/**
	 * String to check
	 */
	value: string

	/**
	 * Array of valid values
	 */
	validValues: readonly T[]
}

/**
 * Type guard to check if a string is within a specific set of values
 * @param params - The value to check and the set of valid values
 * @returns True if value is in validValues
 */
export const isStringInSet = <T extends string>(params: Readonly<StringInSetParams<T>>): params is { value: T; validValues: readonly T[] } => {
	const { value, validValues } = params
	return validValues.some((validValue) => validValue === value)
};

/**
 * Safely convert string to enum-like type with validation
 * @param params - The value to convert and the set of valid enum values
 * @returns Enum value if valid, null if invalid
 */
export const safeParseEnum = <T extends string>(params: Readonly<StringInSetParams<T>>): T | null => {
	const { value, validValues } = params
	return validValues.find((validValue) => validValue === value) ?? null
};

/**
 * Assert that a value is within a specific set, throwing an error if invalid
 * Use only when you're certain the value should be valid
 */
export function assertStringInSet<T extends string>(params: {
	value: string
	validValues: readonly T[]
	typeName: string
}): asserts params is {
	value: T
	validValues: readonly T[]
	typeName: string
} {
	const { value, validValues, typeName } = params
	if (!isStringInSet({ value, validValues })) {
		throw new Error(`Invalid ${typeName}: ${value}. Valid values: ${validValues.join(", ")}`)
	}
}

/**
 * Type guard to check if value is a string
 */
export const isString = (value: unknown): value is string => typeof value === "string";

/**
 * Type guard to check if value is a number
 */
export const isNumber = (value: unknown): value is number => typeof value === "number" && !Number.isNaN(value);

/**
 * Type guard to check if value is a boolean
 */
export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

/**
 * Type guard to check if value is an array
 */
export const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

/**
 * Type guard to check if value is a non-empty array
 */
export const isNonEmptyArray = <T>(value: unknown): value is T[] => Array.isArray(value) && value.length > 0;

/**
 * Type guard to check if value is a function
 */
export const isFunction = (value: unknown): value is (...arguments_: readonly unknown[]) => unknown => typeof value === "function";

/**
 * Type guard to check if value is null
 */
export const isNull = (value: unknown): value is null => value === null;

/**
 * Type guard to check if value is undefined
 */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

/**
 * Type guard to check if value is null or undefined
 */
export const isNullish = (value: unknown): value is null | undefined => value === null || value === undefined;

/**
 * Type guard to check if value is defined (not null or undefined)
 */
export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

/**
 * Type guard to check if string is non-empty
 */
export const isNonEmptyString = (value: unknown): value is string => isString(value) && value.length > 0;

/**
 * Type guard to check if string is a valid URL
 */
export const isValidUrl = (value: unknown): value is string => {
	if (!isString(value)) return false
	return URL.canParse(value);
};

/**
 * Type guard to check if string is a valid email
 */
export const isValidEmail = (value: unknown): value is string => {
	if (!isString(value)) return false
	const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
	return emailRegex.test(value)
};

/**
 * Type guard factory for objects with specific properties
 */
export const hasProperty = <K extends string>(params: {
	obj: unknown
	key: K
}): params is { obj: Record<K, unknown>; key: K } => {
	const { obj, key } = params
	return isRecord(obj) && key in obj
};

/**
 * Type guard factory for objects with specific property types
 */
export const hasPropertyOfType = <T>(params: {
	obj: unknown
	key: string
	typeGuard: (value: unknown) => value is T
}): params is {
	obj: Record<string, unknown> & Record<string, T>
	key: string
	typeGuard: (value: unknown) => value is T
} => {
	const { obj, key, typeGuard } = params
	if (!isRecord(obj) || !(key in obj)) {
		return false
	}
	return typeGuard(obj[key])
};

/**
 * Create a type guard for objects matching a specific shape
 */
export const createShapeValidator = <T>(validators: {
	[K in keyof T]: (value: unknown) => value is T[K]
}) => (object: unknown): object is T => {
		if (!isRecord(object)) return false

		for (const [key, validatorFunction] of Object.entries(validators)) {
			// Type guard: ensure we have a function before calling
			if (typeof validatorFunction !== "function") {
				return false
			}

			// Type guard: ensure obj is a record before accessing properties
			if (!isRecord(object)) {
				return false
			}

			// Additional type guard for validator function signature
			const isValidValidator = (function_: unknown): function_ is (value: unknown) => boolean => typeof function_ === "function";

			if (!isValidValidator(validatorFunction)) {
				return false
			}

			const value = object[key]
			if (!validatorFunction(value)) {
				return false
			}
		}

		return true
	};

/**
 * Validate that an array contains only items of a specific type
 */
export const isArrayOfType = <T>(params: {
	value: unknown
	itemGuard: (item: unknown) => item is T
}): params is { value: T[]; itemGuard: (item: unknown) => item is T } => {
	const { value, itemGuard } = params
	return isArray(value) && value.every(itemGuard)
};

/**
 * Safely parse JSON with type validation
 */
export const safeJsonParse = <T>({
	jsonString,
	validator,
}: {
	jsonString: string
	validator: (value: unknown) => value is T
}): T | null => {
	try {
		const parsed: unknown = JSON.parse(jsonString)
		return validator(parsed) ? parsed : null
	} catch {
		return null
	}
};

// Define valid relation types for graph relationships
const VALID_RELATION_TYPES = [
	"cites",
	"cited_by",
	"references",
	"authored_by",
	"published_in",
	"affiliated_with",
	"funded_by",
	"related_to",
] as const

export type RelationType = (typeof VALID_RELATION_TYPES)[number]

/**
 * Safely parse relation type with validation
 */
export const safeParseRelationType = (value: string): RelationType | null => safeParseEnum({ value, validValues: VALID_RELATION_TYPES });

// Define valid expansion targets for graph expansion
const VALID_EXPANSION_TARGETS = [
	"authors",
	"works",
	"institutions",
	"topics",
	"sources",
	"publishers",
	"funders",
	"citations",
	"references",
] as const

export type ExpansionTarget = (typeof VALID_EXPANSION_TARGETS)[number]

/**
 * Safely parse expansion target with validation
 */
export const safeParseExpansionTarget = (value: string): ExpansionTarget | null => safeParseEnum({ value, validValues: VALID_EXPANSION_TARGETS });
