/**
 * Query parser for BibGraph search functionality Handles quotes, wildcards (*), and field prefixes (title:, author:)
 */

export interface QueryTerm {
	value: string
	isWildcard: boolean
	isQuoted: boolean
}

export interface FieldQuery extends QueryTerm {
	field: string
}

export interface ParsedQuery {
	fieldQueries: FieldQuery[]
	generalTerms: QueryTerm[]
}

const tokenizeQuery = (query: string): string[] => {
	// Regex to match different token types in order of priority:
	// 1. Quoted spans (standalone or the value of a field query) are single tokens
	// 2. Everything else splits on whitespace
	// A manual scanner rather than a regex: alternations with greedy prefixes are what CodeQL's polynomial-redos query flags, and this is clearer anyway.
	const tokens: string[] = [];
	let index = 0;
	while (index < query.length) {
		const char = query[index];
		if (/\s/.test(char)) {
			index++;
			continue;
		}
		if (char === '"') {
			const closing = query.indexOf('"', index + 1);
			if (closing === -1) {
				tokens.push(query.slice(index));
				break;
			}
			tokens.push(query.slice(index, closing + 1));
			index = closing + 1;
			continue;
		}
		// An unquoted run ends at whitespace, or at a quote only when that quote closes later: field:"quoted value" splits into 'field:' + '"quoted value"', while an unclosed quote is just an ordinary character in the run.
		const remainder = query.slice(index);
		let gap = remainder.search(/[\s"]/);
		while (gap !== -1 && remainder[gap] === '"') {
			if (remainder.includes('"', gap + 1)) {
				break;
			}
			const nextGap = remainder.slice(gap + 1).search(/[\s"]/);
			gap = nextGap === -1 ? -1 : gap + 1 + nextGap;
		}
		tokens.push(gap === -1 ? remainder : remainder.slice(0, gap));
		index += gap === -1 ? remainder.length : gap;
	}
	return tokens
};

const createFieldQuery = ({ field, value }: { field: string; value: string }): FieldQuery => {
	const isQuoted = value.startsWith('"') && value.endsWith('"')
	const cleanValue = isQuoted ? value.slice(1, -1) : value
	const isWildcard = cleanValue.includes("*")

	return {
		field,
		value: cleanValue,
		isWildcard,
		isQuoted,
	}
};

const tryParseFieldQueryWithSpace = ({
	tokens,
	index,
	fieldQueries,
}: {
	tokens: string[]
	index: number
	fieldQueries: FieldQuery[]
}): boolean => {
	const token = tokens[index]

	// Check if this token ends with colon (field prefix with space)
	if (!token.endsWith(":") || index + 1 >= tokens.length) {
		return false
	}

	const field = token.slice(0, -1)

	// Validate field name (alphanumeric and underscore only)
	if (!/^[A-Z_]\w*$/i.test(field)) {
		return false
	}

	const nextToken = tokens[index + 1]
	const fieldQuery = createFieldQuery({ field, value: nextToken })
	fieldQueries.push(fieldQuery)
	return true
};

const tryParseFieldQueryInOneToken = ({
	token,
	fieldQueries,
}: {
	token: string
	fieldQueries: FieldQuery[]
}): boolean => {
	// Check if this is a field query in one token (format: field:value)
	const fieldMatch = /^([A-Z_]\w*):(.+)$/i.exec(token)

	if (fieldMatch) {
		const [, field, value] = fieldMatch
		const fieldQuery = createFieldQuery({ field, value })
		fieldQueries.push(fieldQuery)
		return true
	}

	return false
};

/**
 * Process a token as a general term and add it to the generalTerms array
 */
const processGeneralTerm = ({
	token,
	generalTerms,
}: {
	token: string
	generalTerms: QueryTerm[]
}): void => {
	const isQuoted = token.startsWith('"') && token.endsWith('"')
	const cleanValue = isQuoted ? token.slice(1, -1) : token
	const isWildcard = cleanValue.includes("*")

	generalTerms.push({
		value: cleanValue,
		isWildcard,
		isQuoted,
	})
};

/**
 * Parse a search query string into structured components
 *
 * Supports:
 * - Quoted phrases: "machine learning"
 * - Wildcards: *AI*, machine*, *learning
 * - Field queries: title:value, author:"John Smith", title: "quoted value"
 * @param query - The search query string to parse
 * @returns Parsed query object with field queries and general terms
 * @example
 * ```typescript
 * const result = parseSearchQuery('title:"neural networks" author:smith *AI*');
 * // result.fieldQueries: [
 * //   { field: 'title', value: 'neural networks', isWildcard: false, isQuoted: true },
 * //   { field: 'author', value: 'smith', isWildcard: false, isQuoted: false }
 * // ]
 * // result.generalTerms: [
 * //   { value: '*AI*', isWildcard: true, isQuoted: false }
 * // ]
 * ```
 */
export const parseSearchQuery = (query: string): ParsedQuery => {
	const fieldQueries: FieldQuery[] = []
	const generalTerms: QueryTerm[] = []

	// Early return for empty/whitespace-only queries
	if (!query.trim()) {
		return { fieldQueries, generalTerms }
	}

	const tokens = tokenizeQuery(query)
	let index = 0

	while (index < tokens.length) {
		const token = tokens[index]

		if (tryParseFieldQueryWithSpace({ tokens, index: index, fieldQueries })) {
			index += 2 // Skip both field and value tokens
		} else if (tryParseFieldQueryInOneToken({ token, fieldQueries })) {
			index++
		} else {
			processGeneralTerm({ token, generalTerms })
			index++
		}
	}

	return { fieldQueries, generalTerms }
};

/**
 * Type guard to check if a query term is a field query
 */
export const isFieldQuery = (term: QueryTerm | FieldQuery): term is FieldQuery => "field" in term;

/**
 * Get all unique field names from parsed query
 */
export const getQueryFields = (parsedQuery: Readonly<ParsedQuery>): string[] => [...new Set(parsedQuery.fieldQueries.map((fq) => fq.field))];

/**
 * Get field queries for a specific field
 */
export const getFieldQueries = ({
	parsedQuery,
	field,
}: {
	parsedQuery: ParsedQuery
	field: string
}): FieldQuery[] => parsedQuery.fieldQueries.filter((fq) => fq.field === field);

/**
 * Check if the parsed query contains any wildcards
 */
export const hasWildcards = (parsedQuery: Readonly<ParsedQuery>): boolean => parsedQuery.fieldQueries.some((fq) => fq.isWildcard) ||
		parsedQuery.generalTerms.some((gt) => gt.isWildcard);
