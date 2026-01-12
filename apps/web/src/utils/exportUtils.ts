/**
 * Export Utilities
 *
 * Provides functionality to export search results to CSV and BibTeX formats.
 */

import type { AutocompleteResult } from '@bibgraph/types';

/**
 * Convert search results to CSV format
 * @param results
 * @param filename
 */
export const exportToCSV = (results: AutocompleteResult[], filename?: string): void => {
  if (results.length === 0) return;

  // CSV headers
  const headers = [
    'ID',
    'Display Name',
    'Entity Type',
    'Citation Count',
    'Works Count',
    'Hint',
    'URL',
  ];

  // Convert results to CSV rows
  const rows = results.map((result) => [
    result.id,
    `"${result.display_name.replaceAll('"', '""')}"`, // Escape quotes
    result.entity_type,
    result.cited_by_count ?? 0,
    result.works_count ?? 0,
    result.hint ?? '',
    result.id,
  ]);

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `search-results-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.append(link);
  link.click();
  link.remove();
};

/**
 * Convert a work result to BibTeX format
 * @param result
 */
const workToBibTeX = (result: AutocompleteResult): string => {
  const id = result.id.replace('https://openalex.org/', '').toUpperCase();
  const bibKey = `work${id}`.replaceAll(/[^a-z0-9]/gi, '');

  let bibtex = `@misc{${bibKey},\n`;
  bibtex += `  title = {${result.display_name}},\n`;

  if (result.hint) {
    bibtex += `  howpublished = {${result.hint}},\n`;
  }

  if (result.cited_by_count) {
    bibtex += `  citations = {${result.cited_by_count}},\n`;
  }

  bibtex += `  url = {${result.id}},\n`;
  bibtex += `}\n`;

  return bibtex;
};

/**
 * Convert author result to BibTeX format
 * @param result
 */
const authorToBibTeX = (result: AutocompleteResult): string => {
  const id = result.id.replace('https://openalex.org/', '').toUpperCase();
  const bibKey = `${result.display_name.split(' ').pop() || 'author'}${id}`.replaceAll(/[^a-z0-9]/gi, '');

  let bibtex = `@misc{${bibKey},\n`;
  bibtex += `  author = {${result.display_name}},\n`;

  if (result.cited_by_count) {
    bibtex += `  citations = {${result.cited_by_count}},\n`;
  }

  if (result.works_count) {
    bibtex += `  works = {${result.works_count}},\n`;
  }

  bibtex += `  url = {${result.id},\n`;
  bibtex += `}\n`;

  return bibtex;
};

/**
 * Convert search results to BibTeX format
 * @param results
 * @param filename
 */
export const exportToBibTeX = (results: AutocompleteResult[], filename?: string): void => {
  if (results.length === 0) return;

  // Convert results to BibTeX entries
  const bibtexEntries = results.map((result) => {
    if (result.entity_type === 'work') {
      return workToBibTeX(result);
    }
    return authorToBibTeX(result);
  });

  const bibtexContent = bibtexEntries.join('\n');

  // Create blob and download
  const blob = new Blob([bibtexContent], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `search-results-${Date.now()}.bib`);
  link.style.visibility = 'hidden';
  document.body.append(link);
  link.click();
  link.remove();
};

/**
 * Get export filename based on current search query
 * @param query
 * @param format
 */
export const getExportFilename = (query: string, format: 'csv' | 'bib'): string => {
  const sanitizedQuery = query.trim().replaceAll(/[^a-z0-9]/gi, '-').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  return sanitizedQuery
    ? `${sanitizedQuery}-results-${timestamp}.${format}`
    : `search-results-${timestamp}.${format}`;
};
