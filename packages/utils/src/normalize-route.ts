const SENSITIVE_PARAMS = ["api_key", "cursor", "mailto"]


const parseQueryString = (query: string): Record<string, unknown> => {
	const result: Record<string, unknown> = {}
	if (!query) return result

	const pairs = query.split("&")
	for (const pair of pairs) {
		const [key, value] = pair.split("=", 2)
		if (key) {
			const decodedKey = decodeURIComponent(key)
			const decodedValue = value ? decodeURIComponent(value) : ""
			result[decodedKey] = decodedValue
		}
	}
	return result
};

const stringifyQueryString = (object: Record<string, unknown>): string => {
	const pairs: string[] = []
	for (const [key, value] of Object.entries(object)) {
		if (value === undefined || value === null) {
			continue;
		}

		const encodedKey = encodeURIComponent(key)
		const stringValue = typeof value === "string" ? value : JSON.stringify(value)
		const encodedValue = encodeURIComponent(stringValue)
		pairs.push(`${encodedKey}=${encodedValue}`)
	}
	return pairs.join("&")
};

export const normalizeRoute = ({ path, search }: { path: string; search: string }): string => {
	const query = search.startsWith("?") ? search.slice(1) : search

	const parsed = parseQueryString(query)

	for (const key of SENSITIVE_PARAMS) {
		Reflect.deleteProperty(parsed, key)
	}

	const sortedKeys = Object.keys(parsed).sort()
	const sortedQuery: Record<string, unknown> = {}
	for (const key of sortedKeys) {
		sortedQuery[key] = parsed[key]
	}

	const normalizedSearch = stringifyQueryString(sortedQuery)
	return normalizedSearch ? `${path}?${normalizedSearch}` : path
};
