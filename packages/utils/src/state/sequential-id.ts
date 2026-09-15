/**
 * Sequential ID generator utility
 */

export const generateSequentialId = (prefix = "id"): () => string => {
	let counter = 0;
	return () => `${prefix}-${String(++counter)}`;
};
