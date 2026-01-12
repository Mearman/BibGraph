/**
 * Citation Style Preview component
 * Displays list entities in various citation formats with copy/export functionality
 *
 * NOTE: This component works with CatalogueEntity references. Full citation formatting
 * requires fetching entity metadata from OpenAlex API, which is not included in the
 * CatalogueEntity structure. This implementation provides a functional preview with
 * available data and demonstrates the UI/UX patterns for citation preview.
 */

import type { CatalogueEntity } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Radio,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconClipboard, IconDownload, IconInfoCircle, IconPrinter } from "@tabler/icons-react";
import { useMemo,useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'ieee' | 'bibtex';

interface CitationStylePreviewProps {
  entities: CatalogueEntity[];
  listTitle: string;
  onClose: () => void;
}

interface CitationStyleOption {
  value: CitationStyle;
  label: string;
  description: string;
}

const CITATION_STYLES: CitationStyleOption[] = [
  { value: 'apa', label: 'APA', description: 'American Psychological Association (7th ed.)' },
  { value: 'mla', label: 'MLA', description: 'Modern Language Association (9th ed.)' },
  { value: 'chicago', label: 'Chicago', description: 'Chicago Manual of Style (17th ed.)' },
  { value: 'ieee', label: 'IEEE', description: 'Institute of Electrical and Electronics Engineers' },
  { value: 'bibtex', label: 'BibTeX', description: 'BibTeX format for LaTeX' },
];

/**
 * Format entity for citation based on available CatalogueEntity data
 * NOTE: Full citation formatting would require fetching entity metadata from OpenAlex API
 * @param entity - The catalogue entity to format
 */
const formatEntityForCitation = (entity: CatalogueEntity): {
  id: string;
  type: string;
  year: string;
  url: string;
} => {
  return {
    id: entity.entityId,
    type: entity.entityType,
    year: entity.addedAt.getFullYear().toString(),
    url: `https://openalex.org/${entity.entityType}/${entity.entityId}`,
  };
};

/**
 * Format citation in APA style
 * @param data - Entity reference data
 * @param index - Index for enumeration
 * @returns APA formatted citation
 */
const formatAPA = (data: ReturnType<typeof formatEntityForCitation>, index: number): string => {
  return `${index + 1}. ${data.type.toUpperCase()}: ${data.id}. (${data.year}). Retrieved from OpenAlex: ${data.url}`;
};

/**
 * Format citation in MLA style
 * @param data - Entity reference data
 * @param index - Index for enumeration
 * @returns MLA formatted citation
 */
const formatMLA = (data: ReturnType<typeof formatEntityForCitation>, index: number): string => {
  return `${index + 1}. "${data.type.toUpperCase()} Entity: ${data.id}." OpenAlex, ${data.year}, ${data.url}`;
};

/**
 * Format citation in Chicago style
 * @param data - Entity reference data
 * @param index - Index for enumeration
 * @returns Chicago formatted citation
 */
const formatChicago = (data: ReturnType<typeof formatEntityForCitation>, index: number): string => {
  return `${index + 1}. ${data.type.toUpperCase()}: ${data.id}. OpenAlex (${data.year}). ${data.url}`;
};

/**
 * Format citation in IEEE style
 * @param data - Entity reference data
 * @param index - Index for enumeration
 * @returns IEEE formatted citation
 */
const formatIEEE = (data: ReturnType<typeof formatEntityForCitation>, index: number): string => {
  return `[${index + 1}] ${data.type.toUpperCase()} Entity: ${data.id}, ${data.year}. [Online]. Available: ${data.url}`;
};

/**
 * Format citation in BibTeX style
 * @param data - Entity reference data
 * @param index - Index for unique key
 * @returns BibTeX formatted entry
 */
const formatBibTeX = (data: ReturnType<typeof formatEntityForCitation>, index: number): string => {
  const key = `${data.type}${index + 1}`;
  return `@misc{${key},
  title = {${data.type.toUpperCase()}: ${data.id}},
  year = {${data.year}},
  url = {${data.url}},
  note = {OpenAlex}
}`;
};

/**
 * Generate formatted citations for all entities in the selected style
 * @param entities - The catalogue entities to format
 * @param style - The citation style to use
 */
const generateCitations = (
  entities: CatalogueEntity[],
  style: CitationStyle
): string[] => {
  return entities.map((entity, index) => {
    const data = formatEntityForCitation(entity);

    switch (style) {
      case 'apa':
        return formatAPA(data, index);
      case 'mla':
        return formatMLA(data, index);
      case 'chicago':
        return formatChicago(data, index);
      case 'ieee':
        return formatIEEE(data, index);
      case 'bibtex':
        return formatBibTeX(data, index);
      default:
        return formatAPA(data, index);
    }
  });
};

export const CitationStylePreview = ({ entities, listTitle, onClose }: CitationStylePreviewProps) => {
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('apa');

  const citations = useMemo(() => generateCitations(entities, selectedStyle), [entities, selectedStyle]);
  const citationText = citations.join('\n\n');

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      logger.info('catalogue-citation', 'Citations copied to clipboard', {
        listTitle,
        style: selectedStyle,
        count: entities.length,
      });
    } catch (error) {
      logger.error('catalogue-citation', 'Failed to copy citations', {
        listTitle,
        error,
      });
    }
  };

  // Handle print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const doc = printWindow.document;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${listTitle} - ${selectedStyle.toUpperCase()}</title>
          <style>
            body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { text-align: center; }
            .citation { margin-bottom: 20px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${listTitle}</h1>
          <p><strong>Citation Style: ${selectedStyle.toUpperCase()}</strong></p>
          <p><strong>Number of Items: ${entities.length}</strong></p>
          <hr>
          ${citations.map(citation => `<div class="citation">${citation}</div>`).join('')}
        </body>
      </html>
    `;

    // Use DOMParser to avoid deprecated document.write
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(html, 'text/html');
    doc.replaceChild(doc.importNode(parsedDoc.documentElement, true), doc.documentElement);

    printWindow.print();

    logger.info('catalogue-citation', 'Citations printed', {
      listTitle,
      style: selectedStyle,
      count: entities.length,
    });
  };

  // Handle export
  const handleExport = () => {
    try {
      const filename = `${listTitle.replaceAll(/[^a-z0-9]/gi, '_')}_${selectedStyle}.txt`;
      const blob = new Blob([citationText], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.append(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      logger.info('catalogue-citation', 'Citations exported', {
        listTitle,
        style: selectedStyle,
        filename,
        count: entities.length,
      });
    } catch (error) {
      logger.error('catalogue-citation', 'Failed to export citations', {
        listTitle,
        error,
      });
    }
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={3}>Citation Style Preview</Title>
          <Text size="sm" c="dimmed">
            Preview and export "{listTitle}" in various citation formats
          </Text>
        </div>
      </Group>

      {/* Info Alert */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={ICON_SIZE.MD} />}>
        <Text size="sm">
          This preview uses entity reference data. Full citation formatting with authors, titles,
          and publication details requires fetching entity metadata from OpenAlex API. The current
          implementation demonstrates the citation format styles and UI functionality.
        </Text>
      </Alert>

      {/* Style Selector */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Radio.Group
          value={selectedStyle}
          onChange={(value) => setSelectedStyle(value as CitationStyle)}
          label="Select citation style"
          description="Choose the citation format you want to use"
        >
          <Stack gap="xs" mt="sm">
            {CITATION_STYLES.map((style) => (
              <Radio
                key={style.value}
                value={style.value}
                label={style.label}
                description={style.description}
              />
            ))}
          </Stack>
        </Radio.Group>
      </Card>

      {/* Citation Preview */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Group justify="space-between" mb="md">
          <Text fw={500} size="lg">
            {selectedStyle.toUpperCase()} Preview ({entities.length} items)
          </Text>
          <Group gap="xs">
            <Tooltip label="Copy to clipboard">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={handleCopy}
                aria-label="Copy citations to clipboard"
              >
                <IconClipboard size={ICON_SIZE.MD} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Print">
              <ActionIcon
                variant="light"
                color="green"
                onClick={handlePrint}
                aria-label="Print citations"
              >
                <IconPrinter size={ICON_SIZE.MD} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Export as text file">
              <ActionIcon
                variant="light"
                color="orange"
                onClick={handleExport}
                aria-label="Export citations"
              >
                <IconDownload size={ICON_SIZE.MD} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <ScrollArea.Autosize mah={500}>
          <Stack gap="md">
            {citations.map((citation, index) => (
              <Card key={index} padding="sm" radius="xs" withBorder bg="gray.0">
                <Text size="sm" style={{ fontFamily: selectedStyle === 'bibtex' ? 'monospace' : 'inherit' }}>
                  {citation}
                </Text>
                <Badge size="xs" variant="light" mt="xs">
                  {entities[index].entityType.toUpperCase()}
                </Badge>
              </Card>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Card>

      {/* Info */}
      <Text size="xs" c="dimmed" ta="center">
        Citation formats are generated from available entity reference data.
        Full citations with complete metadata would require API integration.
      </Text>

      {/* Actions */}
      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Stack>
  );
};
