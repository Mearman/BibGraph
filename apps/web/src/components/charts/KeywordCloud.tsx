/**
 * Keyword Cloud component
 * Displays word cloud of keywords/concepts from entity data
 *
 * Shows:
 * - Word cloud of concepts/keywords
 * - Size = frequency
 * - Color = category
 * - Click to search
 * - Export as image
 */

import type { CatalogueEntity } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconDownload, IconInfoCircle, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { getHashColor } from '@/utils/colors';

interface KeywordCloudProps {
  entities: CatalogueEntity[];
  onClose?: () => void;
  onSearch?: (keyword: string) => void;
}

interface KeywordInfo {
  keyword: string;
  count: number;
  color: string;
  category: string;
}

type ViewMode = 'cloud' | 'list';
type SortBy = 'frequency' | 'alphabetical';

/**
 * Extract keywords from entity IDs
 * NOTE: Since CatalogueEntity doesn't include actual keywords/concepts,
 * this extracts words from entity IDs as a placeholder for demonstration
 * In production, would fetch actual keyword/concept data from OpenAlex API
 * @param entities - The catalogue entities to analyze
 * @param minWordLength - Minimum word length to include (default: 3)
 */
const extractKeywords = (entities: CatalogueEntity[], minWordLength: number = 3): KeywordInfo[] => {
  const keywordMap = new Map<string, number>();

  // Extract words from entity IDs (placeholder for actual keywords)
  for (const entity of entities) {
    // Split entity ID into words and clean them
    const words = entity.entityId
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(word => word.length >= minWordLength)
      .filter(word => !/^\d+$/.test(word)); // Filter out pure numbers

    for (const word of words) {
      keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
    }
  }

  // Build keyword info with categories and colors
  const keywords: KeywordInfo[] = [];

  for (const [keyword, count] of keywordMap.entries()) {
    // Determine category based on keyword characteristics
    let category = 'general';
    if (keyword.startsWith('http') || keyword.includes('www')) {
      category = 'url';
    } else if (/^\d/.test(keyword)) {
      category = 'numeric';
    } else if (keyword.length <= 4) {
      category = 'short';
    } else if (keyword.length > 10) {
      category = 'long';
    }

    keywords.push({
      keyword,
      count,
      color: getHashColor(keyword),
      category,
    });
  }

  return keywords.sort((a, b) => b.count - a.count);
};

/**
 * Generate SVG export of keyword cloud
 * @param keywords - Keyword data
 * @param maxCount - Maximum keyword count for sizing
 */
const generateSVG = (keywords: KeywordInfo[], maxCount: number): string => {
  const width = 900;
  const height = 500;
  const padding = 40;

  let svgContent = '';

  // Simple layout: spiral pattern from center
  const centerX = width / 2;
  const centerY = height / 2;
  let angle = 0;
  let radius = 0;

  for (const keyword of keywords.slice(0, 50)) {
    // Calculate font size based on frequency
    const fontSize = 12 + (keyword.count / maxCount) * 36;

    // Position in spiral
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    svgContent += `
      <text
        x="${x}"
        y="${y}"
        text-anchor="middle"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${keyword.color}"
        style="cursor: pointer"
      >
        ${keyword.keyword}
      </text>
    `;

    // Move to next position in spiral
    angle += 0.5;
    radius += 2;

    // Reset to center if too far
    if (radius > Math.min(width, height) / 2 - padding) {
      angle = 0;
      radius = 0;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">
    Keyword Cloud
  </text>
  ${svgContent}
</svg>`;
};

export const KeywordCloud = ({ entities, onClose, onSearch }: KeywordCloudProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cloud');
  const [sortBy, setSortBy] = useState<SortBy>('frequency');
  const [maxKeywords, setMaxKeywords] = useState<number>(50);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const allKeywords = useMemo(() => extractKeywords(entities, 3), [entities]);
  const maxCount = Math.max(...allKeywords.map(k => k.count), 1);
  const totalKeywords = allKeywords.length;
  const uniqueCategories = useMemo(() => {
    const categories = new Set(allKeywords.map(k => k.category));
    return [...categories];
  }, [allKeywords]);

  // Initialize selected categories with all categories
  useMemo(() => {
    if (selectedCategories.size === 0) {
      setSelectedCategories(new Set(uniqueCategories));
    }
  }, [uniqueCategories, selectedCategories.size]);

  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    let keywords = allKeywords.filter(k => selectedCategories.has(k.category));

    if (sortBy === 'alphabetical') {
      keywords = [...keywords].sort((a, b) => a.keyword.localeCompare(b.keyword));
    } else {
      keywords = [...keywords].sort((a, b) => b.count - a.count);
    }

    return keywords.slice(0, maxKeywords);
  }, [allKeywords, selectedCategories, sortBy, maxKeywords]);

  const totalOccurrences = filteredKeywords.reduce((sum, k) => sum + k.count, 0);

  // Handle keyword click
  const handleKeywordClick = (keyword: string) => {
    if (onSearch) {
      onSearch(keyword);
    } else {
      logger.info('charts-keyword', 'Keyword clicked', { keyword });
    }
  };

  // Handle export
  const handleExportSVG = () => {
    try {
      const svgContent = generateSVG(filteredKeywords, maxCount);
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', 'keyword-cloud.svg');
      link.style.visibility = 'hidden';

      document.body.append(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      logger.info('charts-keyword', 'Cloud exported as SVG', {
        keywordCount: filteredKeywords.length,
      });
    } catch (error) {
      logger.error('charts-keyword', 'Failed to export cloud', {
        error,
      });
    }
  };

  // Handle category toggle
  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={3}>Keyword Cloud</Title>
          <Text size="sm" c="dimmed">
            {totalKeywords} unique keywords from {entities.length} entities
          </Text>
        </div>
        <Tooltip label="Export as SVG">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={handleExportSVG}
            aria-label="Export cloud as SVG"
          >
            <IconDownload size={ICON_SIZE.MD} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Info Banner */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={ICON_SIZE.MD} />}>
        <Text size="sm">
          Keyword cloud extracted from entity data. Current implementation uses words from entity IDs
          as placeholders. Full keyword analysis would require actual concept/keyword data from
          OpenAlex API. {onSearch && 'Click any keyword to search for it.'}
        </Text>
      </Alert>

      {/* Metrics Summary */}
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="sm">
        <Group grow>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Keywords</Text>
            <Text size="xl" fw={700}>{totalKeywords}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Displayed</Text>
            <Text size="xl" fw={700}>{filteredKeywords.length}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Occurrences</Text>
            <Text size="xl" fw={700}>{totalOccurrences}</Text>
          </Stack>
        </Group>
      </Paper>

      {/* Controls */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Group justify="space-between">
          <Select
            label="View Mode"
            description="How to display keywords"
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            data={[
              { value: 'cloud', label: 'Word Cloud' },
              { value: 'list', label: 'List View' },
            ]}
            w={150}
          />

          <Select
            label="Sort By"
            description="Keyword sorting order"
            value={sortBy}
            onChange={(value) => setSortBy(value as SortBy)}
            data={[
              { value: 'frequency', label: 'Frequency' },
              { value: 'alphabetical', label: 'Alphabetical' },
            ]}
            w={150}
          />

          <Select
            label="Max Keywords"
            description="Number of keywords to display"
            value={maxKeywords.toString()}
            onChange={(value) => setMaxKeywords(Number(value) || 50)}
            data={[
              { value: '20', label: 'Top 20' },
              { value: '50', label: 'Top 50' },
              { value: '100', label: 'Top 100' },
              { value: '200', label: 'Top 200' },
            ]}
            w={120}
          />
        </Group>
      </Card>

      {/* Category Filter */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Text fw={500} mb="sm">Categories</Text>
        <Group gap="xs">
          {uniqueCategories.map((category) => (
            <Checkbox
              key={category}
              checked={selectedCategories.has(category)}
              onChange={() => handleToggleCategory(category)}
              label={category}
              styles={{ label: { textTransform: 'capitalize' } }}
            />
          ))}
        </Group>
      </Card>

      {/* Keyword Cloud / List */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        {viewMode === 'cloud' ? (
          // Word Cloud View
          <Stack gap="md" style={{ minHeight: 400 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
              }}
            >
              {filteredKeywords.map((keyword) => {
                const fontSize = 0.75 + (keyword.count / maxCount) * 1.25;

                return (
                  <Tooltip key={keyword.keyword} label={`${keyword.count} occurrences`}>
                    <Badge
                      size="xl"
                      leftSection={onSearch && <IconSearch size={12} />}
                      style={{
                        fontSize: `${fontSize}rem`,
                        cursor: onSearch ? 'pointer' : 'default',
                        backgroundColor: keyword.color,
                        color: 'white',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      onClick={() => handleKeywordClick(keyword.keyword)}
                    >
                      {keyword.keyword}
                    </Badge>
                  </Tooltip>
                );
              })}
            </div>
          </Stack>
        ) : (
          // List View
          <Stack gap="sm" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filteredKeywords.map((keyword) => (
              <Card
                key={keyword.keyword}
                padding="sm"
                radius="xs"
                withBorder
                style={{ cursor: onSearch ? 'pointer' : 'default' }}
                onClick={() => onSearch && handleKeywordClick(keyword.keyword)}
              >
                <Group justify="space-between">
                  <Group gap="md">
                    <Badge
                      size="lg"
                      style={{
                        backgroundColor: keyword.color,
                        color: 'white',
                        fontSize: `${0.875 + (keyword.count / maxCount) * 0.5}rem`,
                      }}
                    >
                      {keyword.keyword}
                    </Badge>
                    {onSearch && (
                      <Tooltip label="Search for this keyword">
                        <IconSearch size={16} style={{ color: '#666' }} />
                      </Tooltip>
                    )}
                  </Group>
                  <Group gap="md">
                    <Badge color="gray" variant="light">
                      {keyword.count}
                    </Badge>
                    <Badge size="xs" color="blue" variant="light">
                      {keyword.category}
                    </Badge>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Card>

      {/* Actions */}
      {onClose && (
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </Group>
      )}
    </Stack>
  );
};
