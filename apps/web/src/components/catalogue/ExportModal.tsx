/**
 * Modal component for exporting catalogue lists
 */

import { logger } from "@bibgraph/utils";
import {
  Alert,
  Button,
  Group,
  Radio,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDownload } from "@tabler/icons-react";
import React, { useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';
import { useCatalogue } from "@/hooks/useCatalogue";


type ExportFormat = "compressed" | "json" | "csv" | "bibtex";

interface ExportFormatOption {
  value: ExportFormat;
  label: string;
  description: string;
}

// Radio cards render each format as one labelled control: the name, the description and the indicator all select the format.
const EXPORT_FORMAT_OPTIONS: readonly ExportFormatOption[] = [
  { value: "json", label: "JSON", description: "Standard JSON format with full metadata" },
  { value: "compressed", label: "Compressed Data", description: "Compact format for sharing via URL" },
  { value: "csv", label: "CSV", description: "Spreadsheet-compatible format" },
  { value: "bibtex", label: "BibTeX", description: "Bibliography format (works only)" },
] as const;

interface ExportModalProperties {
  listId: string;
  listTitle: string;
  onClose: () => void;
}

export const ExportModal = ({ listId, listTitle, onClose }: ExportModalProperties) => {
  const { exportListAsFile } = useCatalogue();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      await exportListAsFile(listId, selectedFormat);

      logger.debug("catalogue-ui", "List exported successfully", {
        listId,
        listTitle,
        format: selectedFormat,
      });

      setExportSuccess(true);

      notifications.show({
        title: "Export Successful",
        message: `List exported as ${selectedFormat.toUpperCase()} format`,
        color: "green",
        icon: <IconCheck size={ICON_SIZE.MD} />,
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to export list", {
        listId,
        format: selectedFormat,
        error,
      });

      notifications.show({
        title: "Export Failed",
        message: error instanceof Error ? error.message : "Failed to export list. Please try again.",
        color: "red",
      });
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <Stack gap="md" aria-busy={isExporting}>
      <Text size="sm" c="dimmed">
        Export "{listTitle}" to share or backup your catalogue list
      </Text>

      <Radio.Group
        value={selectedFormat}
        onChange={(value) => { setSelectedFormat(value); }}
        label="Select Export Format"
        required
        aria-required="true"
      >
        <Stack gap="xs" mt="xs">
          {EXPORT_FORMAT_OPTIONS.map((option) => (
            <Radio.Card
              key={option.value}
              value={option.value}
              aria-label={option.label}
              p="sm"
            >
              <Group wrap="nowrap" align="flex-start" gap="sm">
                <Radio.Indicator mt={3} />
                <Stack gap={2}>
                  <Text size="sm" fw={500}>{option.label}</Text>
                  <Text size="xs" c="dimmed">{option.description}</Text>
                </Stack>
              </Group>
            </Radio.Card>
          ))}
        </Stack>
      </Radio.Group>

      {exportSuccess && (
        <Alert color="green" icon={<IconCheck size={ICON_SIZE.MD} />} role="status" aria-live="polite">
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Export Successful!
            </Text>
            <Text size="xs" c="dimmed">
              Your catalogue list has been downloaded as a {selectedFormat.toUpperCase()} file.
            </Text>
          </Stack>
        </Alert>
      )}

      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" onClick={onClose} disabled={isExporting}>
          {exportSuccess ? "Done" : "Cancel"}
        </Button>
        <Button
          onClick={() => { void handleExport(); }}
          loading={isExporting}
          leftSection={<IconDownload size={ICON_SIZE.MD} />}
          data-testid="export-list-button"
        >
          {exportSuccess ? "Export Again" : "Export"}
        </Button>
      </Group>
    </Stack>
  );
};
