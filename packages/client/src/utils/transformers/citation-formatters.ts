/**
 * Citation Formatters
 * Utilities for formatting OpenAlex work data into various citation styles
 */

/**
 * Work data shape for citation formatting
 */
export interface CitationWorkData {
  display_name?: string;
  authorships?: {
    author: {
      display_name?: string;
    };
  }[];
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
interface CitationParameters {
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

const MAX_CITATION_AUTHORS = 3;

/**
 * Extract and prepare author names for citation
 */
const prepareAuthors = (authorships: readonly { author: { display_name?: string } }[]): string[] => {
  const authors = authorships
    .slice(0, MAX_CITATION_AUTHORS)
    .map((authorship) => authorship.author.display_name)
    .filter((name): name is string => name !== undefined && name !== "");

  if (authors.length === 0) {
    authors.push("Unknown Author");
  }

  return authors;
};

/**
 * Extract citation parameters from work object
 */
const extractCitationParameters = (work: CitationWorkData): CitationParameters => {
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
    biblio?.first_page !== undefined && biblio.first_page !== "" &&
    biblio.last_page !== undefined && biblio.last_page !== ""
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
 */
const formatAPACitation = (params: CitationParameters): string => {
  const { authors, display_name, year, journal, volume, issue, pages, doi, authorshipsLength } = params;
  let citation = "";

  // Authors
  if (authors.length === 1) {
    citation += authors[0];
  } else if (authors.length === 2) {
    citation += `${authors[0]} & ${authors[1]}`;
  } else {
    citation += `${authors[0]}, ${authors[1]}, & ${authors[2]}`;
    if (authorshipsLength > MAX_CITATION_AUTHORS) citation += ", et al.";
  }

  // Year
  citation += year !== undefined && year !== "" ? ` (${year}).` : " (n.d.).";

  // Title
  citation += ` ${display_name}.`;

  // Journal info
  if (journal !== undefined && journal !== "") {
    citation += ` *${journal}*`;
    if (volume !== undefined && volume !== "" && issue !== undefined && issue !== "") citation += `, ${volume}(${issue})`;
    else if (volume !== undefined && volume !== "") citation += `, ${volume}`;
    if (pages !== undefined && pages !== "") citation += `, ${pages}`;
    citation += ".";
  }

  // DOI
  if (doi !== undefined && doi !== "") citation += ` https://doi.org/${doi}`;

  return citation;
};

/**
 * Format a single author name for MLA style (Last, First)
 */
const formatMLASingleAuthor = (author: string): string => {
  const nameParts = author.split(" ");
  if (nameParts.length > 1) {
    const lastName = nameParts.at(-1);
    const firstNames = nameParts.slice(0, -1).join(" ");
    return `${String(lastName)}, ${firstNames}`;
  }
  return author;
};

/**
 * Format author names for MLA style
 */
const formatMLAAuthors = (authors: readonly string[]): string => {
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
 */
const formatMLAJournalInfo = (journal: string, volume?: string, issue?: string, year?: string, pages?: string): string => {
  let journalInfo = ` *${journal}*`;
  if (volume !== undefined && volume !== "") journalInfo += `, vol. ${volume}`;
  if (issue !== undefined && issue !== "") journalInfo += `, no. ${issue}`;
  if (year !== undefined && year !== "") journalInfo += `, ${year}`;
  if (pages !== undefined && pages !== "") journalInfo += `, pp. ${pages}`;
  journalInfo += ".";
  return journalInfo;
};

/**
 * Format MLA style citation
 */
const formatMLACitation = (params: CitationParameters): string => {
  const { authors, display_name, year, journal, volume, issue, pages } = params;
  let citation = formatMLAAuthors(authors);
  citation += `. "${display_name}."`;

  if (journal !== undefined && journal !== "") {
    citation += formatMLAJournalInfo(journal, volume, issue, year, pages);
  }

  return citation;
};

/**
 * Format Chicago style citation
 */
const formatChicagoCitation = (params: CitationParameters): string => {
  const { authors, display_name, year, journal, volume, issue, pages, doi } = params;
  let citation = "";

  // Authors
  if (authors.length === 1) {
    citation += `${authors[0]}.`;
  } else if (authors.length <= MAX_CITATION_AUTHORS) {
    citation += `${authors.join(", ")}.`;
  } else {
    citation += `${authors[0]} et al.`;
  }

  // Title
  citation += ` "${display_name}."`;

  // Journal info
  if (journal !== undefined && journal !== "") {
    citation += ` *${journal}*`;
    if (volume !== undefined && volume !== "" && issue !== undefined && issue !== "") citation += ` ${volume}, no. ${issue}`;
    else if (volume !== undefined && volume !== "") citation += ` ${volume}`;
    if (year !== undefined && year !== "") citation += ` (${year})`;
    if (pages !== undefined && pages !== "") citation += `: ${pages}`;
    citation += ".";
  }

  // DOI
  if (doi !== undefined && doi !== "") citation += ` https://doi.org/${doi}.`;

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
  const parameters = extractCitationParameters(work);

  switch (style) {
    case "apa":
      return formatAPACitation(parameters);
    case "mla":
      return formatMLACitation(parameters);
    case "chicago":
      return formatChicagoCitation(parameters);
    default:
      return formatCitation(work, "apa");
  }
};
