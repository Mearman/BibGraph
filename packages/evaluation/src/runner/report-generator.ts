/**
 * Report generation for experiment results
 */

import type { ExperimentReport, MethodComparison, StatisticalTestResult } from '../types';

/**
 * Generate markdown report from experiment results.
 *
 * @param report - Experiment report to format
 * @returns Formatted markdown string
 *
 * @example
 * ```typescript
 * const report = await runExperiment(config, graph);
 * const markdown = generateMarkdownReport(report);
 * console.log(markdown);
 * // Output:
 * // # MI vs Random Baseline
 * //
 * // ## Results
 * //
 * // ### Method Performance
 * //
 * // | Method | Spearman | Kendall | NDCG |
 * // |--------|----------|---------|------|
 * // | MI     | 0.85     | 0.72    | 0.88 |
 * // | Random | 0.02     | 0.01    | 0.05 |
 * // ```
 */
export const generateMarkdownReport = (report: ExperimentReport): string => {
  const lines: string[] = [];

  // Title
  lines.push(`# ${report.name}\n`);

  // Metadata
  lines.push(`**Timestamp:** ${report.timestamp}\n`);
  lines.push(`**Graph Spec:** ${report.graphSpec}\n`);
  if (report.duration) {
    lines.push(`**Duration:** ${report.duration}ms\n`);
  }
  lines.push('');

  // Winner
  lines.push(`## Winner\n`);
  lines.push(`**${report.winner}**\n`);
  lines.push('');

  // Method Performance
  lines.push('## Method Performance\n');
  lines.push('| Method | ' + getMetricHeaders(report).join(' | ') + ' |');
  lines.push('|' + '-|'.repeat(Object.keys(report.methods[0]!.results).length + 1) + '|');

  for (const method of report.methods) {
    const values = Object.values(method.results).map((v) => v.toFixed(4));
    lines.push(`| ${method.method} | ${values.join(' | ')} |`);
  }
  lines.push('');

  // Statistical Tests
  if (report.statisticalTests.length > 0) {
    lines.push('## Statistical Tests\n');
    lines.push('| Test | Comparison | p-value | Significant |');
    lines.push('|------|------------|---------|------------|');

    for (const test of report.statisticalTests) {
      const pValue = test.pValue.toExponential(4);
      const sig = test.significant ? '✓' : '✗';

      let stats = '';
      if (test.statistic !== undefined) {
        stats = ` (${test.statistic.toFixed(4)})`;
      }

      lines.push(`| ${test.type}${stats} | ${test.comparison} | ${pValue} | ${sig} |`);
    }
    lines.push('');
  }

  // Interpretation
  lines.push('## Interpretation\n');
  lines.push(generateInterpretation(report));

  return lines.join('\n');
};

/**
 * Generate LaTeX table from experiment results.
 *
 * @param report - Experiment report
 * @returns LaTeX table string
 *
 * @example
 * ```typescript
 * const latex = generateLatexTable(report);
 * console.log(latex);
 * // Output:
 * // \\begin{table}[h]
 * // \\centering
 * // \\begin{tabular}{lcccc}
 * // \\toprule
 * // Method & Spearman & Kendall & NDCG \\\\
 * // \\midrule
 * // MI & 0.85 & 0.72 & 0.88 \\\\
 * // Random & 0.02 & 0.01 & 0.05 \\\\
 * // \\bottomrule
 * // \\end{tabular}
 * // \\end{table}
 * ```
 */
export const generateLatexTable = (report: ExperimentReport): string => {
  const lines: string[] = [];

  lines.push(String.raw`\begin{table}[h]`);
  lines.push(String.raw`\centering`);
  lines.push(String.raw`\caption{Results for ` + escapeLaTeX(report.name) + '}');

  // Table specification
  const numCols = Object.keys(report.methods[0]!.results).length + 1;
  lines.push(String.raw`\begin{tabular}{l` + 'c'.repeat(numCols - 1) + '}');

  // Header
  lines.push(String.raw`\toprule`);
  lines.push('Method & ' + getMetricHeaders(report).join(' & ') + String.raw` \\ `);

  // Data rows
  lines.push(String.raw`\midrule`);
  for (const method of report.methods) {
    const values = Object.values(method.results).map((v) => v.toFixed(4));
    lines.push(escapeLaTeX(method.method) + ' & ' + values.join(' & ') + String.raw` \\ `);
  }

  lines.push(String.raw`\bottomrule`);
  lines.push(String.raw`\end{tabular}`);
  lines.push(String.raw`\end{table}`);

  return lines.join('\n');
};

/**
 * Generate JSON summary for programmatic access.
 *
 * @param report - Experiment report
 * @returns JSON string with pretty formatting
 *
 * @example
 * ```typescript
 * const json = generateJSONSummary(report);
 * const data = JSON.parse(json);
 * console.log(data.methods[0].results.spearman); // 0.85
 * ```
 */
export const generateJSONSummary = (report: ExperimentReport): string => {
  const summary = {
    name: report.name,
    timestamp: report.timestamp,
    graphSpec: report.graphSpec,
    winner: report.winner,
    methods: report.methods.map((m) => ({
      name: m.method,
      results: m.results,
      runtime: m.runtime,
    })),
    statisticalTests: report.statisticalTests.map((t) => ({
      type: t.type,
      comparison: t.comparison,
      pValue: t.pValue,
      significant: t.significant,
    })),
  };

  return JSON.stringify(summary, null, 2);
};

/**
 * Get metric headers for tables.
 * @param report
 */
const getMetricHeaders = (report: ExperimentReport): string[] => {
  const metrics = new Set<string>();

  for (const method of report.methods) {
    for (const metric of Object.keys(method.results)) {
      // Format metric name
      if (metric.startsWith('precision_at_') || metric.startsWith('recall_at_')) {
        const k = metric.split('_').pop();
        metrics.add(metric.split('_')[0]!.toUpperCase() + '@' + k);
      } else {
        metrics.add(metric.charAt(0).toUpperCase() + metric.slice(1));
      }
    }
  }

  return [...metrics];
};

/**
 * Escape special LaTeX characters.
 * @param str
 */
const escapeLaTeX = (str: string): string => str
    .replaceAll('\\', String.raw`\textbackslash{}`)
    .replaceAll('%', String.raw`\%`)
    .replaceAll('$', String.raw`\$`)
    .replaceAll('#', String.raw`\#`)
    .replaceAll('_', String.raw`\_`)
    .replaceAll('{', String.raw`\{`)
    .replaceAll('}', String.raw`\}`)
    .replaceAll('&', String.raw`\&`)
    .replaceAll('~', String.raw`\textasciitilde{}`)
    .replaceAll('^', String.raw`\^{}`);

/**
 * Generate interpretation text for experiment results.
 * @param report
 */
const generateInterpretation = (report: ExperimentReport): string => {
  const lines: string[] = [];

  const winner = report.methods.find((m) => m.method === report.winner);
  const winnerMetric = winner?.results['spearman'] ?? 0;

  lines.push(`The **${report.winner}** method achieved the best performance `);

  if (winnerMetric > 0.8) {
    lines.push('with strong correlation (Spearman ρ > 0.8).\n');
  } else if (winnerMetric > 0.5) {
    lines.push('with moderate correlation (Spearman ρ > 0.5).\n');
  } else {
    lines.push(`with Spearman ρ = ${winnerMetric.toFixed(3)}.\n`);
  }

  // Statistical significance
  const significantTests = report.statisticalTests.filter((t) => t.significant);

  if (significantTests.length > 0) {
    lines.push('**Statistical Significance:**\n\n');
    lines.push('The following comparisons were statistically significant:\n\n');

    for (const test of significantTests) {
      lines.push(`- ${test.comparison}: ${test.type} p = ${test.pValue.toExponential(2)}\n`);
    }
    lines.push('');
  } else {
    lines.push('**Note:** No statistically significant differences were found at α = 0.05.\n\n');
  }

  // Practical significance
  lines.push('**Practical Significance:**\n\n');

  if (winnerMetric > 0.5) {
    lines.push(`The winner demonstrates practically meaningful improvement `);
    lines.push(`in ranking quality over baseline methods.\n`);
  } else if (winnerMetric > 0.2) {
    lines.push(`The winner shows modest improvement, though practical `);
    lines.push(`significance may depend on the use case.\n`);
  } else {
    lines.push(`Differences between methods are small; all methods perform similarly.\n`);
  }

  return lines.join('');
};

/**
 * Generate comprehensive HTML report.
 *
 * @param report - Experiment report
 * @returns HTML string with embedded CSS
 *
 * @example
 * ```typescript
 * const html = generateHTMLReport(report);
 * // Save to file
 * fs.writeFileSync('report.html', html);
 * ```
 */
export const generateHTMLReport = (report: ExperimentReport): string => {
  const lines: string[] = [];

  lines.push('<!DOCTYPE html>');
  lines.push('<html lang="en">');
  lines.push('<head>');
  lines.push('<meta charset="UTF-8">');
  lines.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  lines.push('<title>' + escapeHTML(report.name) + '</title>');
  lines.push('<style>');
  lines.push('body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }');
  lines.push('h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }');
  lines.push('h2 { color: #555; margin-top: 30px; }');
  lines.push('table { border-collapse: collapse; width: 100%; margin: 20px 0; }');
  lines.push('th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }');
  lines.push('th { background-color: #4CAF50; color: white; }');
  lines.push('tr:nth-child(even) { background-color: #f9f9f9; }');
  lines.push('.significant { color: #4CAF50; font-weight: bold; }');
  lines.push('.not-significant { color: #f44336; }');
  lines.push('.winner { background-color: #fff9c4; padding: 10px; border-left: 4px solid #4CAF50; margin: 20px 0; }');
  lines.push('</style>');
  lines.push('</head>');
  lines.push('<body>');

  // Title
  lines.push('<h1>' + escapeHTML(report.name) + '</h1>');

  // Metadata
  lines.push('<p><strong>Timestamp:</strong> ' + escapeHTML(report.timestamp) + '</p>');
  lines.push('<p><strong>Graph Spec:</strong> ' + escapeHTML(report.graphSpec) + '</p>');

  // Winner
  lines.push('<div class="winner">');
  lines.push('<h2>Winner</h2>');
  lines.push('<p><strong>' + escapeHTML(report.winner) + '</strong></p>');
  lines.push('</div>');

  // Method Performance
  lines.push('<h2>Method Performance</h2>');
  lines.push('<table>');
  lines.push('<tr><th>Method</th>');
  for (const metric of getMetricHeaders(report)) {
    lines.push('<th>' + escapeHTML(metric) + '</th>');
  }
  lines.push('</tr>');

  for (const method of report.methods) {
    const isWinner = method.method === report.winner;
    lines.push('<tr' + (isWinner ? ' style="font-weight: bold;"' : '') + '>');

    lines.push('<td>' + escapeHTML(method.method) + '</td>');
    for (const value of Object.values(method.results)) {
      lines.push('<td>' + value.toFixed(4) + '</td>');
    }

    lines.push('</tr>');
  }

  lines.push('</table>');

  // Statistical Tests
  if (report.statisticalTests.length > 0) {
    lines.push('<h2>Statistical Tests</h2>');
    lines.push('<table>');
    lines.push('<tr><th>Test</th><th>Comparison</th><th>p-value</th><th>Significant</th></tr>');

    for (const test of report.statisticalTests) {
      const sigClass = test.significant ? 'significant' : 'not-significant';
      const sigText = test.significant ? 'Yes' : 'No';

      let stats = '';
      if (test.statistic !== undefined) {
        stats = ` (${test.statistic.toFixed(4)})`;
      }

      lines.push('<tr>');
      lines.push('<td>' + escapeHTML(test.type) + stats + '</td>');
      lines.push('<td>' + escapeHTML(test.comparison) + '</td>');
      lines.push('<td>' + test.pValue.toExponential(4) + '</td>');
      lines.push('<td class="' + sigClass + '">' + sigText + '</td>');
      lines.push('</tr>');
    }

    lines.push('</table>');
  }

  lines.push('</body>');
  lines.push('</html>');

  return lines.join('\n');
};

/**
 * Escape special HTML characters.
 * @param str
 */
const escapeHTML = (str: string): string => str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#039;');
