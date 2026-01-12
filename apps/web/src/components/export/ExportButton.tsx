/**
 * Export Button Component
 *
 * Provides export functionality for search results to CSV and BibTeX formats.
 */

import type { AutocompleteResult } from '@bibgraph/types';
import { ActionIcon, Group, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { IconDownload, IconFileExport, IconFileTypography, IconTable } from '@tabler/icons-react';

import { ICON_SIZE } from '@/config/style-constants';
import { exportToBibTeX, exportToCSV, getExportFilename } from '@/utils/exportUtils';

interface ExportButtonProps {
  results: AutocompleteResult[];
  query: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ results, query, disabled = false }) => {
  const handleExportCSV = () => {
    const filename = getExportFilename(query, 'csv');
    exportToCSV(results, filename);
  };

  const handleExportBibTeX = () => {
    const filename = getExportFilename(query, 'bib');
    exportToBibTeX(results, filename);
  };

  return (
    <Menu position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <Tooltip label="Export results" withinPortal>
          <ActionIcon variant="subtle" size="input-lg" disabled={disabled || results.length === 0}>
            <IconFileExport size={ICON_SIZE.MD} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Stack gap="xs">
          <Text size="sm" fw={500} px="xs">
            Export {results.length} result{results.length !== 1 ? 's' : ''}
          </Text>

          <Menu.Item
            leftSection={<IconTable size={ICON_SIZE.SM} />}
            onClick={handleExportCSV}
            disabled={results.length === 0}
          >
            Export as CSV
          </Menu.Item>

          <Menu.Item
            leftSection={<IconFileTypography size={ICON_SIZE.SM} />}
            onClick={handleExportBibTeX}
            disabled={results.length === 0}
          >
            Export as BibTeX
          </Menu.Item>
        </Stack>
      </Menu.Dropdown>
    </Menu>
  );
};
