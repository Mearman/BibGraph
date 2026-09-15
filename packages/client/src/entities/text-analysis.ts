/**
 * OpenAlex Text Analysis API Entity Methods
 * Provides comprehensive methods for analyzing text content using OpenAlex's aboutness assignments
 */

import type {
  QueryParams,
  TextAnalysisConcept,
  TextAnalysisKeyword,
  TextAnalysisResponse,
  TextAnalysisTopic,
} from "@bibgraph/types";
import {
  TextAnalysisConceptSchema,
  TextAnalysisKeywordSchema,
  TextAnalysisResponseSchema,
  TextAnalysisTopicSchema,
} from "@bibgraph/types";
import { z } from "zod";

import type { OpenAlexBaseClient } from "../client";

/**
Minimum allowed length for a text analysis title, in characters
 */
const TITLE_MIN_LENGTH = 20;

/**
Maximum allowed length for a text analysis title, in characters
 */
const TITLE_MAX_LENGTH = 2000;

/**
Maximum allowed length for a text analysis abstract, in characters
 */
const ABSTRACT_MAX_LENGTH = 5000;

/**
Default minimum relevance score threshold used by the getRelevant* helpers
 */
const DEFAULT_MIN_SCORE = 0.3;

/**
Score threshold above which an entity is considered high relevance
 */
const HIGH_SCORE_THRESHOLD = 0.7;

/**
Score threshold above which an entity is considered medium (rather than low) relevance
 */
const MEDIUM_SCORE_THRESHOLD = 0.3;

/**
 * Options for text analysis requests
 */
export interface TextAnalysisOptions {
  /**
  The text title to analyze (required, 20-2000 characters)
   */
  title: string;
  /**
  Optional abstract to provide additional context
   */
  abstract?: string;
  /**
  Output format (defaults to json)
   */
  format?: "json";
}

/**
 * Result types for the text analysis endpoints, canonically defined as Zod-inferred types in the shared types package and re-exported here for the client's public surface
 */

/**
 * Text Analysis API class providing comprehensive methods for analyzing text content
 */
export class TextAnalysisApi {
  constructor(private readonly client: OpenAlexBaseClient) {}

  /**
   * Validate text analysis options
   */
  private validateOptions(options: Readonly<TextAnalysisOptions>): void {
    const titleLength = options.title.length;
    if (titleLength < TITLE_MIN_LENGTH || titleLength > TITLE_MAX_LENGTH) {
      throw new Error(`Title must be between ${String(TITLE_MIN_LENGTH)}-${String(TITLE_MAX_LENGTH)} characters (current: ${String(titleLength)})`);
    }

    if (options.abstract !== undefined && options.abstract.length > ABSTRACT_MAX_LENGTH) {
      throw new Error(`Abstract must be less than ${String(ABSTRACT_MAX_LENGTH)} characters (current: ${String(options.abstract.length)})`);
    }
  }

  /**
   * Build query parameters for text analysis requests
   */
  private buildParams(options: Readonly<TextAnalysisOptions>): QueryParams {
    this.validateOptions(options);

    const parameters: QueryParams = {
      title: options.title,
    };

    if (options.abstract !== undefined) {
      parameters.abstract = options.abstract;
    }

    if (options.format !== undefined) {
      parameters.format = options.format;
    }

    return parameters;
  }

  /**
   * Analyze text and return keywords, topics, and concepts
   * @param options - Text analysis options including title and optional abstract
   * @returns Promise resolving to complete text analysis results
   * @example
   * ```typescript
   * const analysis = await textAnalysisApi.analyzeText({
   *   title: 'Machine learning approaches for drug discovery in oncology',
   *   abstract: 'This paper explores novel computational methods...'
   * });
   *
   * console.log('Keywords:', analysis.keywords);
   * console.log('Topics:', analysis.topics);
   * console.log('Concepts:', analysis.concepts);
   * ```
   */
  async analyzeText(options: Readonly<TextAnalysisOptions>): Promise<TextAnalysisResponse> {
    const parameters = this.buildParams(options);
    return await this.client.get("text", parameters, TextAnalysisResponseSchema);
  }

  /**
   * Analyze text and return keywords, topics, and concepts (alias for analyzeText)
   * @param options - Text analysis options including title and optional abstract
   * @returns Promise resolving to complete text analysis results
   */
  async getText(options: Readonly<TextAnalysisOptions>): Promise<TextAnalysisResponse> {
    return this.analyzeText(options);
  }

  /**
   * Extract keywords from text content
   * @param options - Text analysis options including title and optional abstract
   * @returns Promise resolving to keyword analysis results
   * @example
   * ```typescript
   * const keywords = await textAnalysisApi.getKeywords({
   *   title: 'Deep learning for medical image analysis'
   * });
   *
   * keywords.forEach(keyword => {
   *   console.log(`${keyword.display_name}: ${keyword.score}`);
   * });
   * ```
   */
  async getKeywords(options: Readonly<TextAnalysisOptions>): Promise<TextAnalysisKeyword[]> {
    const parameters = this.buildParams(options);
    return await this.client.get("text/keywords", parameters, z.array(TextAnalysisKeywordSchema));
  }

  /**
   * Identify topics from text content
   * @param options - Text analysis options including title and optional abstract
   * @returns Promise resolving to topic analysis results
   * @example
   * ```typescript
   * const topics = await textAnalysisApi.getTopics({
   *   title: 'Sustainable energy systems and renewable technologies',
   *   abstract: 'An analysis of current trends in sustainable energy...'
   * });
   *
   * topics.forEach(topic => {
   *   console.log(`Topic: ${topic.display_name} (Score: ${topic.score})`);
   *   if (topic.field) {
   *     console.log(`Field: ${topic.field.display_name}`);
   *   }
   * });
   * ```
   */
  async getTopics(options: Readonly<TextAnalysisOptions>): Promise<TextAnalysisTopic[]> {
    const parameters = this.buildParams(options);
    return await this.client.get("text/topics", parameters, z.array(TextAnalysisTopicSchema));
  }

  /**
   * Detect concepts from text content
   * @param options - Text analysis options including title and optional abstract
   * @returns Promise resolving to concept analysis results
   * @example
   * ```typescript
   * const concepts = await textAnalysisApi.getConcepts({
   *   title: 'Quantum computing applications in cryptography'
   * });
   *
   * concepts.forEach(concept => {
   *   console.log(`${concept.display_name} (Level ${concept.level}): ${concept.score}`);
   *   if (concept.wikidata) {
   *     console.log(`Wikidata: ${concept.wikidata}`);
   *   }
   * });
   * ```
   */
  async getConcepts(options: Readonly<TextAnalysisOptions>): Promise<TextAnalysisConcept[]> {
    const parameters = this.buildParams(options);
    return await this.client.get("text/concepts", parameters, z.array(TextAnalysisConceptSchema));
  }

  /**
   * Analyze text and return only keywords with scores above threshold
   * @param options - Text analysis options
   * @param minScore - Minimum score threshold (0-1)
   * @returns Promise resolving to filtered keywords
   * @example
   * ```typescript
   * const relevantKeywords = await textAnalysisApi.getRelevantKeywords({
   *   title: 'Artificial intelligence in healthcare diagnostics'
   * }, 0.5);
   * ```
   */
  async getRelevantKeywords(
    options: Readonly<TextAnalysisOptions>,
    minScore = DEFAULT_MIN_SCORE
  ): Promise<TextAnalysisKeyword[]> {
    const keywords = await this.getKeywords(options);
    return keywords.filter(keyword => keyword.score >= minScore);
  }

  /**
   * Analyze text and return only topics with scores above threshold
   * @param options - Text analysis options
   * @param minScore - Minimum score threshold (0-1)
   * @returns Promise resolving to filtered topics
   * @example
   * ```typescript
   * const relevantTopics = await textAnalysisApi.getRelevantTopics({
   *   title: 'Climate change impact on biodiversity'
   * }, 0.4);
   * ```
   */
  async getRelevantTopics(
    options: Readonly<TextAnalysisOptions>,
    minScore = DEFAULT_MIN_SCORE
  ): Promise<TextAnalysisTopic[]> {
    const topics = await this.getTopics(options);
    return topics.filter(topic => topic.score >= minScore);
  }

  /**
   * Analyze text and return only concepts with scores above threshold
   * @param options - Text analysis options
   * @param minScore - Minimum score threshold (0-1)
   * @returns Promise resolving to filtered concepts
   * @example
   * ```typescript
   * const relevantConcepts = await textAnalysisApi.getRelevantConcepts({
   *   title: 'Blockchain technology for supply chain management'
   * }, 0.5);
   * ```
   */
  async getRelevantConcepts(
    options: Readonly<TextAnalysisOptions>,
    minScore = DEFAULT_MIN_SCORE
  ): Promise<TextAnalysisConcept[]> {
    const concepts = await this.getConcepts(options);
    return concepts.filter(concept => concept.score >= minScore);
  }

  /**
   * Get the most relevant single result from each analysis type
   * @param options - Text analysis options
   * @returns Promise resolving to top results from each category
   * @example
   * ```typescript
   * const topResults = await textAnalysisApi.getTopResults({
   *   title: 'Neural networks for natural language processing'
   * });
   *
   * if (topResults.topKeyword) {
   *   console.log('Top keyword:', topResults.topKeyword.display_name);
   * }
   * ```
   */
  async getTopResults(options: Readonly<TextAnalysisOptions>): Promise<{
    topKeyword?: TextAnalysisKeyword;
    topTopic?: TextAnalysisTopic;
    topConcept?: TextAnalysisConcept;
  }> {
    const [keywords, topics, concepts] = await Promise.all([
      this.getKeywords(options),
      this.getTopics(options),
      this.getConcepts(options)
    ]);

    return {
      topKeyword: keywords.length > 0 ? keywords[0] : undefined,
      topTopic: topics.length > 0 ? topics[0] : undefined,
      topConcept: concepts.length > 0 ? concepts[0] : undefined,
    };
  }

  /**
   * Get comprehensive analysis with summary statistics
   * @param options - Text analysis options
   * @returns Promise resolving to detailed analysis with statistics
   * @example
   * ```typescript
   * const analysis = await textAnalysisApi.getDetailedAnalysis({
   *   title: 'Computational biology methods for protein structure prediction'
   * });
   *
   * console.log(`Found ${analysis.summary.totalEntities} entities`);
   * console.log(`Average score: ${analysis.summary.averageScore}`);
   * ```
   */
  async getDetailedAnalysis(options: Readonly<TextAnalysisOptions>): Promise<{
    keywords: TextAnalysisKeyword[];
    topics: TextAnalysisTopic[];
    concepts: TextAnalysisConcept[];
    summary: {
      totalEntities: number;
      averageScore: number;
      topKeyword?: TextAnalysisKeyword;
      topTopic?: TextAnalysisTopic;
      topConcept?: TextAnalysisConcept;
      scoreDistribution: {
        high: number; // score >= 0.7
        medium: number; // 0.3 <= score < 0.7
        low: number; // score < 0.3
      };
    };
  }> {
    const [keywords, topics, concepts] = await Promise.all([
      this.getKeywords(options),
      this.getTopics(options),
      this.getConcepts(options)
    ]);

    const allEntities = [...keywords, ...topics, ...concepts];
    const totalEntities = allEntities.length;
    const averageScore = totalEntities > 0
      ? allEntities.reduce((sum, entity) => sum + entity.score, 0) / totalEntities
      : 0;

    const scoreDistribution = allEntities.reduce(
      (distribution, entity) => {
        if (entity.score >= HIGH_SCORE_THRESHOLD) distribution.high++;
        else if (entity.score >= MEDIUM_SCORE_THRESHOLD) distribution.medium++;
        else distribution.low++;
        return distribution;
      },
      { high: 0, medium: 0, low: 0 }
    );

    return {
      keywords,
      topics,
      concepts,
      summary: {
        totalEntities,
        averageScore,
        topKeyword: keywords.length > 0 ? keywords[0] : undefined,
        topTopic: topics.length > 0 ? topics[0] : undefined,
        topConcept: concepts.length > 0 ? concepts[0] : undefined,
        scoreDistribution,
      },
    };
  }
}