/**
 * Abstract Transformers
 * Utilities for transforming OpenAlex abstract inverted index data
 */

/**
 * Common stop words for keyword extraction
 */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "cannot",
  "this",
  "that",
  "these",
  "those",
  "we",
  "they",
  "it",
  "its",
  "our",
  "their",
  "his",
  "her",
  "him",
  "them",
  "us",
  "i",
  "you",
  "me",
  "my",
  "your",
  "here",
  "there",
  "where",
  "when",
  "why",
  "how",
  "what",
  "which",
  "who",
  "more",
  "most",
  "less",
  "much",
  "many",
  "some",
  "all",
  "any",
  "no",
  "not",
  "very",
  "too",
  "also",
  "just",
  "only",
  "even",
  "still",
  "yet",
  "however",
  "therefore",
  "thus",
  "hence",
  "moreover",
  "furthermore",
  "nevertheless",
  "over",
]);

/**
 * Extract and clean words from abstract text
 * @param abstract
 * @param minLength
 * @param excludeCommon
 */
const extractWordsFromAbstract = (abstract: string, minLength: number, excludeCommon: boolean): string[] => abstract
    .toLowerCase()
    .replaceAll(/[^\s\w-]/g, " ") // Keep hyphens for compound terms
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= minLength && (!excludeCommon || !STOP_WORDS.has(word)),
    );

/**
 * Count word frequencies
 * @param words
 */
const countWordFrequencies = (words: string[]): Map<string, number> => {
  const wordCount = new Map<string, number>();
  words.forEach((word) => {
    wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
  });
  return wordCount;
};

/**
 * Extract compound terms from word array
 * @param words
 */
const extractCompoundTerms = (words: string[]): Map<string, number> => {
  const compounds = new Map<string, number>();

  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    // Two-word compounds
    if (word1 && word2 && !STOP_WORDS.has(word1) && !STOP_WORDS.has(word2)) {
      const twoWord = `${word1} ${word2}`;
      compounds.set(twoWord, (compounds.get(twoWord) ?? 0) + 1);
    }

    // Three-word compounds
    if (i < words.length - 2) {
      const word3 = words[i + 2];
      if (
        word1 &&
        word2 &&
        word3 &&
        !STOP_WORDS.has(word1) &&
        !STOP_WORDS.has(word2) &&
        !STOP_WORDS.has(word3)
      ) {
        const threeWord = `${word1} ${word2} ${word3}`;
        compounds.set(threeWord, (compounds.get(threeWord) ?? 0) + 1);
      }
    }
  }

  return compounds;
};

/**
 * Convert OpenAlex abstract_inverted_index to readable text
 * @param invertedIndex - The abstract_inverted_index object from OpenAlex
 * @returns Reconstructed abstract text, or null if no index provided
 * @example
 * ```typescript
 * const work = await openAlex.works.getWork('W2741809807');
 * const abstract = reconstructAbstract(work.abstract_inverted_index);
 * logger.debug("general", abstract); // "Machine learning algorithms have shown..."
 * ```
 */
export const reconstructAbstract = (invertedIndex: Record<string, number[]> | null | undefined): string | null => {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return null;
  }

  // Create an array to hold words at their positions
  const words: (string | undefined)[] = [];
  let maxPosition = 0;

  // First pass: determine the maximum position to size the array
  Object.entries(invertedIndex).forEach(([, positions]) => {
    if (Array.isArray(positions)) {
      positions.forEach((pos) => {
        if (typeof pos === "number" && pos >= 0) {
          maxPosition = Math.max(maxPosition, pos);
        }
      });
    }
  });

  // Initialize array with undefined values
  for (let i = 0; i <= maxPosition; i++) {
    words[i] = undefined;
  }

  // Second pass: place words at their correct positions
  Object.entries(invertedIndex).forEach(([word, positions]) => {
    if (Array.isArray(positions)) {
      positions.forEach((pos) => {
        if (typeof pos === "number" && pos >= 0 && pos <= maxPosition) {
          words[pos] = word;
        }
      });
    }
  });

  // Filter out undefined positions and join into text
  const reconstructedText = words
    .filter((word): word is string => word !== undefined)
    .join(" ");

  return reconstructedText.trim() || null;
};

/**
 * Abstract statistics result type
 */
export interface AbstractStats {
  wordCount: number;
  uniqueWords: number;
  avgWordLength: number;
  longestWord: string;
  shortestWord: string;
}

/**
 * Get abstract length statistics from inverted index
 * @param invertedIndex - The abstract_inverted_index object from OpenAlex
 * @returns Statistics about the abstract
 * @example
 * ```typescript
 * const stats = getAbstractStats(work.abstract_inverted_index);
 * logger.debug("general", `Abstract has ${stats.wordCount} words and ${stats.uniqueWords} unique words`);
 * ```
 */
export const getAbstractStats = (invertedIndex: Record<string, number[]> | null | undefined): AbstractStats | null => {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return null;
  }

  const words = Object.keys(invertedIndex);
  const uniqueWords = words.length;

  if (uniqueWords === 0) {
    return null;
  }

  // Calculate total word count (sum of all position arrays)
  let totalWordCount = 0;
  let totalCharCount = 0;
  let longestWord = "";
  let shortestWord = words[0] || "";

  words.forEach((word) => {
    const positions = invertedIndex[word];
    if (Array.isArray(positions)) {
      totalWordCount += positions.length;
      totalCharCount += word.length * positions.length;

      if (word.length > longestWord.length) {
        longestWord = word;
      }
      if (word.length < shortestWord.length) {
        shortestWord = word;
      }
    }
  });

  return {
    wordCount: totalWordCount,
    uniqueWords,
    avgWordLength: totalCharCount / totalWordCount,
    longestWord,
    shortestWord,
  };
};

/**
 * Check if a work has an abstract available
 * @param work - The work object from OpenAlex
 * @param work.abstract_inverted_index
 * @returns True if abstract is available and reconstructable
 * @example
 * ```typescript
 * const works = await openAlex.works.getWorks({ filter: { has_abstract: true } });
 * const worksWithAbstracts = works.results.filter(hasAbstract);
 * ```
 */
export const hasAbstract = (work: {
  abstract_inverted_index?: Record<string, number[]> | null;
}): boolean => !!(
    work.abstract_inverted_index &&
    typeof work.abstract_inverted_index === "object" &&
    Object.keys(work.abstract_inverted_index).length > 0
  );

/**
 * Keyword extraction options
 */
export interface ExtractKeywordsOptions {
  minLength?: number;
  maxKeywords?: number;
  excludeCommon?: boolean;
}

/**
 * Extract keywords and key phrases from abstract text
 * @param abstract - Reconstructed abstract text
 * @param options - Options for keyword extraction
 * @returns Array of potential keywords sorted by relevance
 * @example
 * ```typescript
 * const abstract = reconstructAbstract(work.abstract_inverted_index);
 * const keywords = extractKeywords(abstract, { minLength: 4, maxKeywords: 10 });
 * ```
 */
export const extractKeywords = (abstract: string | null, options: ExtractKeywordsOptions = {}): string[] => {
  if (!abstract || typeof abstract !== "string") {
    return [];
  }

  const { minLength = 3, maxKeywords = 20, excludeCommon = true } = options;

  const words = extractWordsFromAbstract(abstract, minLength, excludeCommon);
  const wordCount = countWordFrequencies(words);
  const compounds = extractCompoundTerms(words);

  // Combine and sort by frequency
  const allTerms = new Map([...wordCount, ...compounds]);

  return [...allTerms.entries()]
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, maxKeywords)
    .map(([term]) => term);
};
