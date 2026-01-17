/**
 * Citation Formatters
 * Utilities for formatting OpenAlex work data into various citation styles
 */

/**
 * Work data shape for citation formatting
 */
export interface CitationWorkData {
  display_name?: string;
  authorships?: Array<{
    author: {
      display_name?: string;
    };
  }>;
  publication_year?: number;
  primary_location?: {
    source?: {
      display_name?: string;
    };
  };
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  doi?: string;
}

/**
 * Citation style type
 */
export type CitationStyle = "apa" | "mla" | "chicago";

/**
 * Citation parameters extracted from work data
 */
interface CitationParams {
  authors: string[];
  display_name: string;
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  authorshipsLength: number;
}

/**
 * Extract and prepare author names for citation
 * @param authorships
 */
const prepareAuthors = (authorships: Array<{ author: { display_name?: string } }>): string[] => {
  const authors = authorships
    .slice(0, 3) // Limit to first 3 authors
    .map((authorship) => authorship.author.display_name)
    .filter((name): name is string => !!name);

  if (authors.length === 0) {
    authors.push("Unknown Author");
  }

  return authors;
};

/**
 * Extract citation parameters from work object
 * @param work
 */
const extractCitationParams = (work: CitationWorkData): CitationParams => {
  const {
    display_name = "Untitled",
    authorships = [],
    publication_year,
    primary_location,
    biblio,
    doi,
  } = work;

  const authors = prepareAuthors(authorships);
  const journal = primary_location?.source?.display_name;
  const year = publication_year?.toString();
  const volume = biblio?.volume;
  const issue = biblio?.issue;
  const pages =
    biblio?.first_page && biblio.last_page
      ? `${biblio.first_page}-${biblio.last_page}`
      : biblio?.first_page;

  return {
    authors,
    display_name,
    year,
    journal,
    volume,
    issue,
    pages,
    doi,
    authorshipsLength: authorships.length,
  };
};

/**
 * Format APA style citation
 * @param params
 */
const formatAPACitation = (params: CitationParams): string => {
  const { authors, display_name, year, journal, volume, issue, pages, doi, authorshipsLength } = params;
  let citation = "";

  // Authors
  if (authors.length === 1) {
    citation += authors[0];
  } else if (authors.length === 2) {
    citation += `${authors[0]} & ${authors[1]}`;
  } else {
    citation += `${authors[0]}, ${authors[1]}, & ${authors[2]}`;
    if (authorshipsLength > 3) citation += ", et al.";
  }

  // Year
  citation += year ? ` (${year}).` : " (n.d.).";

  // Title
  citation += ` ${display_name}.`;

  // Journal info
  if (journal) {
    citation += ` *${journal}*`;
    if (volume && issue) citation += `, ${volume}(${issue})`;
    else if (volume) citation += `, ${volume}`;
    if (pages) citation += `, ${pages}`;
    citation += ".";
  }

  // DOI
  if (doi) citation += ` https://doi.org/${doi}`;

  return citation;
};

/**
 * Format a single author name for MLA style (Last, First)
 * @param author
 */
const formatMLASingleAuthor = (author: string): string => {
  const nameParts = author.split(" ");
  if (nameParts.length > 1) {
    const lastName = nameParts.at(-1);
    const firstNames = nameParts.slice(0, -1).join(" ");
    return `${lastName}, ${firstNames}`;
  }
  return author;
};

/**
 * Format author names for MLA style
 * @param authors
 */
const formatMLAAuthors = (authors: string[]): string => {
  if (authors.length === 0) return "";

  // First author (Last, First)
  let citation = formatMLASingleAuthor(authors[0]);

  // Additional authors
  if (authors.length === 2) {
    citation += `, and ${authors[1]}`;
  } else if (authors.length > 2) {
    citation += ", et al.";
  }

  return citation;
};

/**
 * Format journal information for MLA style
 * @param journal
 * @param volume
 * @param issue
 * @param year
 * @param pages
 */
const formatMLAJournalInfo = (journal: string, volume?: string, issue?: string, year?: string, pages?: string): string => {
  let journalInfo = ` *${journal}*`;
  if (volume) journalInfo += `, vol. ${volume}`;
  if (issue) journalInfo += `, no. ${issue}`;
  if (year) journalInfo += `, ${year}`;
  if (pages) journalInfo += `, pp. ${pages}`;
  journalInfo += ".";
  return journalInfo;
};

/**
 * Format MLA style citation
 * @param params
 */
const formatMLACitation = (params: CitationParams): string => {
  const { authors, display_name, year, journal, volume, issue, pages } = params;
  let citation = formatMLAAuthors(authors);
  citation += `. "${display_name}."`;

  if (journal) {
    citation += formatMLAJournalInfo(journal, volume, issue, year, pages);
  }

  return citation;
};

/**
 * Format Chicago style citation
 * @param params
 */
const formatChicagoCitation = (params: CitationParams): string => {
  const { authors, display_name, year, journal, volume, issue, pages, doi } = params;
  let citation = "";

  // Authors
  if (authors.length === 1) {
    citation += `${authors[0]}.`;
  } else if (authors.length <= 3) {
    citation += `${authors.join(", ")}.`;
  } else {
    citation += `${authors[0]} et al.`;
  }

  // Title
  citation += ` "${display_name}."`;

  // Journal info
  if (journal) {
    citation += ` *${journal}*`;
    if (volume && issue) citation += ` ${volume}, no. ${issue}`;
    else if (volume) citation += ` ${volume}`;
    if (year) citation += ` (${year})`;
    if (pages) citation += `: ${pages}`;
    citation += ".";
  }

  // DOI
  if (doi) citation += ` https://doi.org/${doi}.`;

  return citation;
};

/**
 * Format citation text from OpenAlex work data
 * @param work - Work object from OpenAlex
 * @param style - Citation style ('apa' | 'mla' | 'chicago')
 * @returns Formatted citation string
 * @example
 * ```typescript
 * const work = await openAlex.works.getWork('W2741809807');
 * const citation = formatCitation(work, 'apa');
 * ```
 */
export const formatCitation = (work: CitationWorkData, style: CitationStyle = "apa"): string => {
  const params = extractCitationParams(work);

  switch (style) {
    case "apa":
      return formatAPACitation(params);
    case "mla":
      return formatMLACitation(params);
    case "chicago":
      return formatChicagoCitation(params);
    default:
      return formatCitation(work, "apa");
  }
};
