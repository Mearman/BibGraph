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
import { IconAlertCircle, IconCheck, IconDownload } from "@tabler/icons-react";
import React, { useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';
import { useCatalogue } from "@/hooks/useCatalogue";


type ExportFormat = "compressed" | "json" | "csv" | "bibtex";

interface ExportModalProps {
  listId: string;
  listTitle: string;
  onClose: () => void;
}

export const ExportModal = ({ listId, listTitle, onClose }: ExportModalProps) => {
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
        onChange={(value) => setSelectedFormat(value as ExportFormat)}
        label="Select Export Format"
        required
        aria-required="true"
      >
        <Stack gap="xs" mt="xs">
          <Radio
            value="json"
            label="JSON"
            description="Standard JSON format with full metadata"
            aria-describedby="json-description"
          />
          <Radio
            value="compressed"
            label="Compressed Data"
            description="Compact format for sharing via URL"
            aria-describedby="compressed-description"
          />
          <Radio
            value="csv"
            label="CSV"
            description="Spreadsheet-compatible format"
            aria-describedby="csv-description"
          />
          <Radio
            value="bibtex"
            label="BibTeX"
            description="Bibliography format (works only)"
            aria-describedby="bibtex-description"
          />
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
          onClick={handleExport}
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
