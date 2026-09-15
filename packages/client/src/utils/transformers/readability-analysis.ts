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

// A word this short or shorter is treated as a single syllable outright, skipping the vowel-cluster heuristic below.
const SHORT_WORD_MAX_LENGTH = 3;

/**
 * Count syllables in a word (simple approximation)
 */
const countSyllables = (word: string): number => {
  word = word.toLowerCase();
  if (word.length <= SHORT_WORD_MAX_LENGTH) return 1;
  const vowels = word.match(/[aeiouy]+/g);
  let syllables = vowels ? vowels.length : 1;
  if (word.endsWith("e")) syllables--;
  return Math.max(1, syllables);
};

// Flesch Reading Ease score thresholds for each reading-level label.
const READING_EASE_VERY_EASY_MIN = 90;
const READING_EASE_EASY_MIN = 80;
const READING_EASE_FAIRLY_EASY_MIN = 70;
const READING_EASE_STANDARD_MIN = 60;
const READING_EASE_FAIRLY_DIFFICULT_MIN = 50;
const READING_EASE_DIFFICULT_MIN = 30;

/**
 * Determine reading level from Flesch Reading Ease score
 */
const determineReadingLevel = (fleschReadingEase: number): string => {
  if (fleschReadingEase >= READING_EASE_VERY_EASY_MIN) return "Very Easy";
  if (fleschReadingEase >= READING_EASE_EASY_MIN) return "Easy";
  if (fleschReadingEase >= READING_EASE_FAIRLY_EASY_MIN) return "Fairly Easy";
  if (fleschReadingEase >= READING_EASE_STANDARD_MIN) return "Standard";
  if (fleschReadingEase >= READING_EASE_FAIRLY_DIFFICULT_MIN) return "Fairly Difficult";
  if (fleschReadingEase >= READING_EASE_DIFFICULT_MIN) return "Difficult";
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
  if (abstract === null || abstract === "" || typeof abstract !== "string") {
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
