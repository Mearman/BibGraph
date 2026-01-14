/**
 * Validation result for a single property.
 */
export interface PropertyValidationResult {
  property: string;
  expected: string;
  actual: string;
  valid: boolean;
  message?: string;
}

/**
 * Complete validation results for a graph.
 */
export interface GraphValidationResult {
  properties: PropertyValidationResult[];
  valid: boolean;
  errors: string[];
  warnings?: string[];  // New field for impossible combination warnings
}
