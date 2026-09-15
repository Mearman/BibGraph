/**
 * Geographic Distribution Map component Displays institution locations on a world map
 *
 * Shows:
 * - World map with institution locations
 * - Circle size = works count
 * - Color by citation impact
 * - Zoom to country/region
 * - Tooltip with stats
 * - Export as SVG
 */

import type { CatalogueEntity } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconDownload, IconInfoCircle, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { getHashColor } from '@/utils/colors';

interface GeographicMapProperties {
  entities: CatalogueEntity[];
  onClose?: () => void;
}

interface RegionData {
  name: string;
  x: number;
  y: number;
  worksCount: number;
  entities: CatalogueEntity[];
  citations: number;
}

type ViewMode = 'world' | 'region';
type ImpactMetric = 'works' | 'citations';

const IMPACT_METRICS: ReadonlySet<string> = new Set<ImpactMetric>(["works", "citations"]);
const isImpactMetric = (value: string): value is ImpactMetric => IMPACT_METRICS.has(value);

const VIEW_MODES: ReadonlySet<string> = new Set<ViewMode>(["world", "region"]);
const isViewMode = (value: string): value is ViewMode => VIEW_MODES.has(value);

// Placeholder citation-count formula (CatalogueEntity carries no real citation data yet).
const PLACEHOLDER_CITATIONS_RANDOM_RANGE = 50;
const PLACEHOLDER_CITATIONS_BASE = 10;

// Circle sizing: radius scales linearly between these bounds by relative works/citations share.
const CIRCLE_MIN_RADIUS = 10;
const CIRCLE_RADIUS_RANGE = 30;

// Citation-impact colour thresholds (ratio of a region's citations to the region with the most).
const HIGH_IMPACT_RATIO_THRESHOLD = 0.7;
const MEDIUM_IMPACT_RATIO_THRESHOLD = 0.4;

// Zoom controls.
const ZOOM_STEP = 0.2;
const MAX_ZOOM = 2;
const MIN_ZOOM = 0.5;
const PERCENTAGE_MULTIPLIER = 100;

// Exported SVG map dimensions and layout.
const MAP_EXPORT_WIDTH = 800;
const MAP_EXPORT_HEIGHT = 450;
const MAP_TITLE_Y = 30;
const MAP_TITLE_FONT_SIZE = 18;
const MAP_EXPORT_WORKS_LABEL_FONT_SIZE = 10;
const MAP_EXPORT_REGION_LABEL_FONT_SIZE = 11;
const MAP_WORKS_LABEL_Y_NUDGE = 4;
const MAP_REGION_LABEL_Y_OFFSET = 15;
const MAP_OUTLINE_X = 50;
const MAP_OUTLINE_Y = 50;
const MAP_OUTLINE_WIDTH = 700;
const MAP_OUTLINE_HEIGHT = 350;
const MAP_OUTLINE_CORNER_RADIUS = 10;
const CENTER_DIVISOR = 2;

// Inline (on-screen) map layout constants.
const WORKS_LABEL_FONT_SIZE = 12;
const REGION_LABEL_FONT_SIZE = 11;
const HOVER_RADIUS_MULTIPLIER = 1.2;

// Hover tooltip layout.
const TOOLTIP_BOX_X_OFFSET = 20;
const TOOLTIP_BOX_Y_OFFSET = 40;
const TOOLTIP_WIDTH = 140;
const TOOLTIP_HEIGHT = 70;
const TOOLTIP_TEXT_X_OFFSET = 30;
const TOOLTIP_TITLE_Y_OFFSET = 20;
const TOOLTIP_TITLE_FONT_SIZE = 11;
const TOOLTIP_LINE1_Y_OFFSET = 5;
const TOOLTIP_LINE_FONT_SIZE = 10;
const TOOLTIP_LINE2_Y_OFFSET = 10;

/**
 * World continent regions (simplified coordinates for SVG map) NOTE: These are approximate positions for demonstration In production, would use actual geographic coordinates from institution data
 */
const WORLD_REGIONS = [
  { name: 'North America', x: 200, y: 150, countries: ['US', 'CA', 'MX'] },
  { name: 'South America', x: 280, y: 320, countries: ['BR', 'AR', 'CL'] },
  { name: 'Europe', x: 420, y: 130, countries: ['GB', 'DE', 'FR', 'IT', 'ES'] },
  { name: 'Africa', x: 430, y: 250, countries: ['ZA', 'NG', 'EG'] },
  { name: 'Asia', x: 580, y: 180, countries: ['CN', 'JP', 'IN', 'KR'] },
  { name: 'Oceania', x: 680, y: 350, countries: ['AU', 'NZ'] },
];

/**
 * Group entities by geographic region NOTE: Since CatalogueEntity doesn't include location data, this uses hash-based region assignment as a placeholder In production, would fetch actual institution coordinates from OpenAlex API
 * @param entities - The catalogue entities to analyze
 */
const groupByRegion = (entities: readonly CatalogueEntity[]): RegionData[] => {
  const regionMap = new Map<string, CatalogueEntity[]>();

  // Assign entities to regions based on hash of entity ID (placeholder)
  for (const entity of entities) {
    let hash = 0;
    for (let index = 0; index < entity.entityId.length; index++) {
      hash += entity.entityId.charCodeAt(index);
    }
    const regionIndex = hash % WORLD_REGIONS.length;
    const region = WORLD_REGIONS[regionIndex];

    if (!regionMap.has(region.name)) {
      regionMap.set(region.name, []);
    }

    const regionEntities = regionMap.get(region.name);
    if (regionEntities) {
      regionEntities.push(entity);
    }
  }

  // Build region data
  const data: RegionData[] = [];

  for (const { name, x, y } of WORLD_REGIONS) {
    const regionEntities = regionMap.get(name) ?? [];

    data.push({
      name,
      x,
      y,
      worksCount: regionEntities.length,
      entities: regionEntities,
      citations: regionEntities.length * Math.floor(Math.random() * PLACEHOLDER_CITATIONS_RANDOM_RANGE) + PLACEHOLDER_CITATIONS_BASE, // Placeholder
    });
  }

  return data;
};

/**
 * Generate SVG export of geographic map
 * @param regions - Region data
 * @param maxWorks - Maximum works count for sizing
 */
const generateSVG = (regions: readonly RegionData[], maxWorks: number): string => {
  // Generate map regions (simplified)
  let mapContent = '';

  for (const region of regions) {
    const radius = CIRCLE_MIN_RADIUS + (region.worksCount / maxWorks) * CIRCLE_RADIUS_RANGE;
    const color = getHashColor(region.name);

    mapContent += `
      <circle
        cx="${String(region.x)}"
        cy="${String(region.y)}"
        r="${String(radius)}"
        fill="${color}"
        fill-opacity="0.6"
        stroke="#333"
        stroke-width="1"
      />
      <text
        x="${String(region.x)}"
        y="${String(region.y + MAP_WORKS_LABEL_Y_NUDGE)}"
        text-anchor="middle"
        font-size="${String(MAP_EXPORT_WORKS_LABEL_FONT_SIZE)}"
        fill="white"
        font-weight="bold"
      >
        ${String(region.worksCount)}
      </text>
      <text
        x="${String(region.x)}"
        y="${String(region.y + radius + MAP_REGION_LABEL_Y_OFFSET)}"
        text-anchor="middle"
        font-size="${String(MAP_EXPORT_REGION_LABEL_FONT_SIZE)}"
        fill="#333"
      >
        ${region.name}
      </text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${String(MAP_EXPORT_WIDTH)}" height="${String(MAP_EXPORT_HEIGHT)}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f4f8"/>
  <text x="${String(MAP_EXPORT_WIDTH / CENTER_DIVISOR)}" y="${String(MAP_TITLE_Y)}" text-anchor="middle" font-size="${String(MAP_TITLE_FONT_SIZE)}" font-weight="bold" fill="#333">
    Geographic Distribution of Institutions
  </text>
  <!-- Simplified world map outline -->
  <rect x="${String(MAP_OUTLINE_X)}" y="${String(MAP_OUTLINE_Y)}" width="${String(MAP_OUTLINE_WIDTH)}" height="${String(MAP_OUTLINE_HEIGHT)}" fill="#e0e7ff" stroke="#666" stroke-width="1" rx="${String(MAP_OUTLINE_CORNER_RADIUS)}"/>
  ${mapContent}
</svg>`;
};

export const GeographicMap = ({ entities, onClose }: GeographicMapProperties) => {
  const [viewMode, setViewMode] = useState<ViewMode>('world');
  const [impactMetric, setImpactMetric] = useState<ImpactMetric>('works');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);

  const regions = useMemo(() => groupByRegion(entities), [entities]);
  const maxWorks = Math.max(...regions.map(r => r.worksCount), 1);
  const maxCitations = Math.max(...regions.map(r => r.citations), 1);
  const totalWorks = regions.reduce((sum, r) => sum + r.worksCount, 0);

  // Handle zoom
  const handleZoomIn = () => {
    setZoomLevel(previous => Math.min(previous + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoomLevel(previous => Math.max(previous - ZOOM_STEP, MIN_ZOOM));
  };

  // Handle export
  const handleExportSVG = () => {
    try {
      const svgContent = generateSVG(regions, maxWorks);
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', 'geographic-distribution-map.svg');
      link.style.visibility = 'hidden';

      document.body.append(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      logger.info('charts-geographic', 'Map exported as SVG', {
        regionCount: regions.length,
      });
    } catch (error) {
      logger.error('charts-geographic', 'Failed to export map', {
        error,
      });
    }
  };

  // Get circle size based on metric
  const getCircleSize = (region: RegionData): number => {
    const value = impactMetric === 'works' ? region.worksCount : region.citations;
    const maxValue = impactMetric === 'works' ? maxWorks : maxCitations;
    return CIRCLE_MIN_RADIUS + (value / maxValue) * CIRCLE_RADIUS_RANGE;
  };

  // Get circle color based on impact
  const getCircleColor = (region: RegionData): string => {
    if (impactMetric === 'citations') {
      const ratio = region.citations / maxCitations;
      if (ratio > HIGH_IMPACT_RATIO_THRESHOLD) return '#ef4444'; // Red
      if (ratio > MEDIUM_IMPACT_RATIO_THRESHOLD) return '#f59e0b'; // Orange
      return '#3b82f6'; // Blue
    }
    return getHashColor(region.name);
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={3}>Geographic Distribution</Title>
          <Text size="sm" c="dimmed">
            Institution locations across {regions.length} regions
          </Text>
        </div>
        <Group gap="xs">
          <Tooltip label="Zoom out">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <IconZoomOut size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Zoom in">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <IconZoomIn size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export as SVG">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={handleExportSVG}
              aria-label="Export map as SVG"
            >
              <IconDownload size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Info Banner */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={ICON_SIZE.MD} />}>
        <Text size="sm">
          Geographic distribution based on {totalWorks} entities across {regions.length} regions.
          Current implementation uses hash-based region assignment as a placeholder. Full geographic
          visualization would require actual institution coordinates from OpenAlex API.
        </Text>
      </Alert>

      {/* Metrics Summary */}
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="sm">
        <Group grow>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Regions</Text>
            <Text size="xl" fw={700}>{regions.length}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Works</Text>
            <Text size="xl" fw={700}>{totalWorks}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Zoom Level</Text>
            <Text size="xl" fw={700}>{Math.round(zoomLevel * PERCENTAGE_MULTIPLIER)}%</Text>
          </Stack>
        </Group>
      </Paper>

      {/* Controls */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Group justify="space-between">
          <Select
            label="Circle Size"
            description="What circle size represents"
            value={impactMetric}
            onChange={(value) => {
              if (value !== null && isImpactMetric(value)) setImpactMetric(value);
            }}
            data={[
              { value: 'works', label: 'Works Count' },
              { value: 'citations', label: 'Citations' },
            ]}
            w={150}
          />

          <Select
            label="View Mode"
            description="Map view mode"
            value={viewMode}
            onChange={(value) => {
              if (value !== null && isViewMode(value)) setViewMode(value);
            }}
            data={[
              { value: 'world', label: 'World View' },
              { value: 'region', label: 'Regional View' },
            ]}
            w={150}
          />
        </Group>
      </Card>

      {/* Map Visualization */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }} h={MAP_EXPORT_HEIGHT}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${String(MAP_EXPORT_WIDTH)} ${String(MAP_EXPORT_HEIGHT / zoomLevel)}`}
          style={{ overflow: 'visible' }}
        >
          {/* Background */}
          <rect width={MAP_EXPORT_WIDTH} height={MAP_EXPORT_HEIGHT / zoomLevel} fill="#f0f4f8" />

          {/* Title */}
          <text x={MAP_EXPORT_WIDTH / CENTER_DIVISOR} y={MAP_TITLE_Y} textAnchor="middle" fontSize={MAP_TITLE_FONT_SIZE} fontWeight="bold" fill="#333">
            Geographic Distribution of Institutions
          </text>

          {/* Simplified world map outline */}
          <rect x={MAP_OUTLINE_X} y={MAP_OUTLINE_Y} width={MAP_OUTLINE_WIDTH} height={MAP_OUTLINE_HEIGHT / zoomLevel} fill="#e0e7ff" stroke="#666" strokeWidth="1" rx={MAP_OUTLINE_CORNER_RADIUS} />

          {/* Map regions */}
          {regions.map((region) => {
            const radius = getCircleSize(region) / zoomLevel;
            const color = getCircleColor(region);
            const isHovered = hoveredRegion?.name === region.name;

            return (
              <g key={region.name}>
                {/* Region circle */}
                <circle
                  cx={region.x}
                  cy={region.y / zoomLevel}
                  r={isHovered ? radius * HOVER_RADIUS_MULTIPLIER : radius}
                  fill={color}
                  fillOpacity="0.6"
                  stroke="#333"
                  strokeWidth="1"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={() => { setHoveredRegion(region); }}
                  onMouseLeave={() => { setHoveredRegion(null); }}
                />

                {/* Works count label */}
                <text
                  x={region.x}
                  y={region.y / zoomLevel + MAP_WORKS_LABEL_Y_NUDGE}
                  textAnchor="middle"
                  fontSize={WORKS_LABEL_FONT_SIZE / zoomLevel}
                  fill="white"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {region.worksCount}
                </text>

                {/* Region name */}
                <text
                  x={region.x}
                  y={region.y / zoomLevel + radius + MAP_REGION_LABEL_Y_OFFSET}
                  textAnchor="middle"
                  fontSize={REGION_LABEL_FONT_SIZE / zoomLevel}
                  fill="#333"
                  pointerEvents="none"
                >
                  {region.name}
                </text>
              </g>
            );
          })}

          {/* Tooltip for hovered region */}
          {hoveredRegion && (
            <g>
              <rect
                x={hoveredRegion.x + TOOLTIP_BOX_X_OFFSET}
                y={hoveredRegion.y / zoomLevel - TOOLTIP_BOX_Y_OFFSET}
                width={TOOLTIP_WIDTH}
                height={TOOLTIP_HEIGHT}
                fill="white"
                stroke="#333"
                strokeWidth="1"
                rx="5"
                fillOpacity="0.95"
              />
              <text x={hoveredRegion.x + TOOLTIP_TEXT_X_OFFSET} y={hoveredRegion.y / zoomLevel - TOOLTIP_TITLE_Y_OFFSET} fontSize={TOOLTIP_TITLE_FONT_SIZE} fontWeight="bold" fill="#333">
                {hoveredRegion.name}
              </text>
              <text x={hoveredRegion.x + TOOLTIP_TEXT_X_OFFSET} y={hoveredRegion.y / zoomLevel - TOOLTIP_LINE1_Y_OFFSET} fontSize={TOOLTIP_LINE_FONT_SIZE} fill="#666">
                Works: {hoveredRegion.worksCount}
              </text>
              <text x={hoveredRegion.x + TOOLTIP_TEXT_X_OFFSET} y={hoveredRegion.y / zoomLevel + TOOLTIP_LINE2_Y_OFFSET} fontSize={TOOLTIP_LINE_FONT_SIZE} fill="#666">
                Citations: {hoveredRegion.citations}
              </text>
            </g>
          )}
        </svg>
      </Card>

      {/* Legend */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Text fw={500} mb="sm">Impact Legend</Text>
        <Group gap="md">
          {impactMetric === 'citations' ? (
            <>
              <Group gap="xs">
                <Box w={16} h={16} bg="#ef4444" style={{ borderRadius: '50%' }} />
                <Text size="sm">High Impact</Text>
              </Group>
              <Group gap="xs">
                <Box w={16} h={16} bg="#f59e0b" style={{ borderRadius: '50%' }} />
                <Text size="sm">Medium Impact</Text>
              </Group>
              <Group gap="xs">
                <Box w={16} h={16} bg="#3b82f6" style={{ borderRadius: '50%' }} />
                <Text size="sm">Low Impact</Text>
              </Group>
            </>
          ) : (
            <Text size="sm" c="dimmed">Colors represent unique regions (hash-based)</Text>
          )}
        </Group>
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
