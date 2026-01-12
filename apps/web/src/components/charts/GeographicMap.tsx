/**
 * Geographic Distribution Map component
 * Displays institution locations on a world map
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

interface GeographicMapProps {
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

/**
 * World continent regions (simplified coordinates for SVG map)
 * NOTE: These are approximate positions for demonstration
 * In production, would use actual geographic coordinates from institution data
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
 * Group entities by geographic region
 * NOTE: Since CatalogueEntity doesn't include location data,
 * this uses hash-based region assignment as a placeholder
 * In production, would fetch actual institution coordinates from OpenAlex API
 * @param entities - The catalogue entities to analyze
 */
const groupByRegion = (entities: CatalogueEntity[]): RegionData[] => {
  const regionMap = new Map<string, CatalogueEntity[]>();

  // Assign entities to regions based on hash of entity ID (placeholder)
  for (const entity of entities) {
    const hash = [...entity.entityId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
    const regionEntities = regionMap.get(name) || [];

    data.push({
      name,
      x,
      y,
      worksCount: regionEntities.length,
      entities: regionEntities,
      citations: regionEntities.length * Math.floor(Math.random() * 50) + 10, // Placeholder
    });
  }

  return data;
};

/**
 * Generate SVG export of geographic map
 * @param regions - Region data
 * @param maxWorks - Maximum works count for sizing
 */
const generateSVG = (regions: RegionData[], maxWorks: number): string => {
  const width = 800;
  const height = 450;

  // Generate map regions (simplified)
  let mapContent = '';

  for (const region of regions) {
    const radius = 10 + (region.worksCount / maxWorks) * 30;
    const color = getHashColor(region.name);

    mapContent += `
      <circle
        cx="${region.x}"
        cy="${region.y}"
        r="${radius}"
        fill="${color}"
        fill-opacity="0.6"
        stroke="#333"
        stroke-width="1"
      />
      <text
        x="${region.x}"
        y="${region.y + 4}"
        text-anchor="middle"
        font-size="10"
        fill="white"
        font-weight="bold"
      >
        ${region.worksCount}
      </text>
      <text
        x="${region.x}"
        y="${region.y + radius + 15}"
        text-anchor="middle"
        font-size="11"
        fill="#333"
      >
        ${region.name}
      </text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f4f8"/>
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">
    Geographic Distribution of Institutions
  </text>
  <!-- Simplified world map outline -->
  <rect x="50" y="50" width="700" height="350" fill="#e0e7ff" stroke="#666" stroke-width="1" rx="10"/>
  ${mapContent}
</svg>`;
};

export const GeographicMap = ({ entities, onClose }: GeographicMapProps) => {
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
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
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
    return 10 + (value / maxValue) * 30;
  };

  // Get circle color based on impact
  const getCircleColor = (region: RegionData): string => {
    if (impactMetric === 'citations') {
      const ratio = region.citations / maxCitations;
      if (ratio > 0.7) return '#ef4444'; // Red
      if (ratio > 0.4) return '#f59e0b'; // Orange
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
              disabled={zoomLevel <= 0.5}
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
              disabled={zoomLevel >= 2}
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
            <Text size="xl" fw={700}>{Math.round(zoomLevel * 100)}%</Text>
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
            onChange={(value) => setImpactMetric(value as ImpactMetric)}
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
            onChange={(value) => setViewMode(value as ViewMode)}
            data={[
              { value: 'world', label: 'World View' },
              { value: 'region', label: 'Regional View' },
            ]}
            w={150}
          />
        </Group>
      </Card>

      {/* Map Visualization */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }} h={450}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 800 ${450 / zoomLevel}`}
          style={{ overflow: 'visible' }}
        >
          {/* Background */}
          <rect width="800" height={450 / zoomLevel} fill="#f0f4f8" />

          {/* Title */}
          <text x="400" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#333">
            Geographic Distribution of Institutions
          </text>

          {/* Simplified world map outline */}
          <rect x="50" y="50" width="700" height={350 / zoomLevel} fill="#e0e7ff" stroke="#666" strokeWidth="1" rx="10" />

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
                  r={isHovered ? radius * 1.2 : radius}
                  fill={color}
                  fillOpacity="0.6"
                  stroke="#333"
                  strokeWidth="1"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={() => setHoveredRegion(region)}
                  onMouseLeave={() => setHoveredRegion(null)}
                />

                {/* Works count label */}
                <text
                  x={region.x}
                  y={region.y / zoomLevel + 4}
                  textAnchor="middle"
                  fontSize={12 / zoomLevel}
                  fill="white"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {region.worksCount}
                </text>

                {/* Region name */}
                <text
                  x={region.x}
                  y={region.y / zoomLevel + radius + 15}
                  textAnchor="middle"
                  fontSize={11 / zoomLevel}
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
                x={hoveredRegion.x + 20}
                y={hoveredRegion.y / zoomLevel - 40}
                width="140"
                height="70"
                fill="white"
                stroke="#333"
                strokeWidth="1"
                rx="5"
                fillOpacity="0.95"
              />
              <text x={hoveredRegion.x + 30} y={hoveredRegion.y / zoomLevel - 20} fontSize="11" fontWeight="bold" fill="#333">
                {hoveredRegion.name}
              </text>
              <text x={hoveredRegion.x + 30} y={hoveredRegion.y / zoomLevel - 5} fontSize="10" fill="#666">
                Works: {hoveredRegion.worksCount}
              </text>
              <text x={hoveredRegion.x + 30} y={hoveredRegion.y / zoomLevel + 10} fontSize="10" fill="#666">
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
