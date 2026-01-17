/**
 * Readability Analysis
 * Utilities for analyzing text readability using Flesch metrics
 */

/**
 * Readability analysis result type
 */
export interface ReadabilityResult {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  readingLevel: string;
}

/**
 * Count syllables in a word (simple approximation)
 * @param word
 */
const countSyllables = (word: string): number => {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  const vowels = word.match(/[aeiouy]+/g);
  let syllables = vowels ? vowels.length : 1;
  if (word.endsWith("e")) syllables--;
  return Math.max(1, syllables);
};

/**
 * Determine reading level from Flesch Reading Ease score
 * @param fleschReadingEase
 */
const determineReadingLevel = (fleschReadingEase: number): string => {
  if (fleschReadingEase >= 90) return "Very Easy";
  if (fleschReadingEase >= 80) return "Easy";
  if (fleschReadingEase >= 70) return "Fairly Easy";
  if (fleschReadingEase >= 60) return "Standard";
  if (fleschReadingEase >= 50) return "Fairly Difficult";
  if (fleschReadingEase >= 30) return "Difficult";
  return "Very Difficult";
};

// Flesch Reading Ease formula coefficients
const FLESCH_BASE = 206.835;
const FLESCH_WORDS_COEFFICIENT = 1.015;
const FLESCH_SYLLABLES_COEFFICIENT = 84.6;

// Flesch-Kincaid Grade Level formula coefficients
const KINCAID_WORDS_COEFFICIENT = 0.39;
const KINCAID_SYLLABLES_COEFFICIENT = 11.8;
const KINCAID_OFFSET = 15.59;

// Rounding precision for output values
const ROUNDING_FACTOR = 100;

/**
 * Calculate Flesch Reading Ease and Grade Level scores
 * @param avgWordsPerSentence
 * @param avgSyllablesPerWord
 */
const calculateFleschScores = (avgWordsPerSentence: number, avgSyllablesPerWord: number): { fleschReadingEase: number; fleschKincaidGrade: number } => {
  const fleschReadingEase =
    FLESCH_BASE - FLESCH_WORDS_COEFFICIENT * avgWordsPerSentence - FLESCH_SYLLABLES_COEFFICIENT * avgSyllablesPerWord;

  const fleschKincaidGrade =
    KINCAID_WORDS_COEFFICIENT * avgWordsPerSentence + KINCAID_SYLLABLES_COEFFICIENT * avgSyllablesPerWord - KINCAID_OFFSET;

  return { fleschReadingEase, fleschKincaidGrade };
};

/**
 * Analyze abstract readability using simple metrics
 * @param abstract - Reconstructed abstract text
 * @returns Readability metrics
 * @example
 * ```typescript
 * const abstract = reconstructAbstract(work.abstract_inverted_index);
 * const readability = analyzeReadability(abstract);
 * logger.debug("general", `Reading level: ${readability.fleschKincaidGrade}`);
 * ```
 */
export const analyzeReadability = (abstract: string | null): ReadabilityResult | null => {
  if (!abstract || typeof abstract !== "string") {
    return null;
  }

  const words = abstract.trim().split(/\s+/);
  const sentences = abstract.split(/[!.?]+/).filter((s) => s.trim().length > 0);

  const wordCount = words.length;
  const sentenceCount = sentences.length;

  if (wordCount === 0 || sentenceCount === 0) {
    return null;
  }

  const totalSyllables = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0,
  );

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;

  const { fleschReadingEase, fleschKincaidGrade } = calculateFleschScores(
    avgWordsPerSentence,
    avgSyllablesPerWord,
  );

  const readingLevel = determineReadingLevel(fleschReadingEase);

  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * ROUNDING_FACTOR) / ROUNDING_FACTOR,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * ROUNDING_FACTOR) / ROUNDING_FACTOR,
    fleschReadingEase: Math.round(fleschReadingEase * ROUNDING_FACTOR) / ROUNDING_FACTOR,
    fleschKincaidGrade: Math.round(fleschKincaidGrade * ROUNDING_FACTOR) / ROUNDING_FACTOR,
    readingLevel,
  };
};
