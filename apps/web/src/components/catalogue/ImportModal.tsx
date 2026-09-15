/**
 * Modal component for importing catalogue lists from files and compressed data
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import {
  Alert,
  Badge,
  Button,
  Divider,
  FileButton,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconFile,
  IconLink,
  IconUpload,
} from "@tabler/icons-react";
import React, { useCallback,useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { useCatalogue } from "@/hooks/useCatalogue";
import type { ExportFormat } from "@/types/catalogue";
import { validateExportFormat } from "@/utils/catalogue-validation";


interface ImportModalProperties {
  onClose: () => void;
  onImport: (listId: string) => void;
  initialShareData?: string; // T064: Pre-populated share data from URL
}

interface ImportPreview {
  listTitle: string;
  entityCount: number;
  entityTypes: Record<EntityType, number>;
  duplicates: number;
  estimatedSize: string;
}

export const ImportModal = ({ onClose, onImport, initialShareData }: ImportModalProperties) => {
  const {
    importListFromFile,
    importListCompressed,
    importFromShareUrl,
    validateImportData,
    previewImport,
  } = useCatalogue();

  const [compressedData, setCompressedData] = useState("");
  const [shareUrl, setShareUrl] = useState(initialShareData ?? ""); // T063, T064: Share URL input state
  const [isImporting, setIsImporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings?: string[];
  } | null>(null);
  const [dataToImport, setDataToImport] = useState<ExportFormat | null>(null);

  // Validate and preview data
  const validateAndPreview = useCallback(async (data: unknown) => {
    setIsValidating(true);
    setError(null);
    setValidationResult(null);
    setPreview(null);

    try {
      // Validate the data
      const validation = validateImportData(data);
      setValidationResult(validation);

      if (validation.valid) {
        // Narrows `data` to ExportFormat without an `as` cast; throws only if validation.valid lied, which validateExportFormat's own logic never does.
        validateExportFormat(data);
        // Generate preview
        const previewData = await previewImport(data);
        setPreview(previewData);
        setDataToImport(data);
      }
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : "Failed to validate data";
      setError(errorMessage);
      logger.error("catalogue-ui", "Failed to validate import data", { error: validationError });
    } finally {
      setIsValidating(false);
    }
  }, [validateImportData, previewImport]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File | null) => {
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    try {
      const text = await file.text();

      // Validate the file content
      if (!text || text.trim().length === 0) {
        throw new Error("File is empty");
      }

      // Try to parse as JSON to validate structure
      try {
        const parsed: unknown = JSON.parse(text);
        await validateAndPreview(parsed);
      } catch {
        // If not JSON, treat as compressed data
        logger.debug("catalogue-ui", "File content is not JSON, treating as compressed data");
        setCompressedData(text.trim());
      }

      logger.info("catalogue-ui", "File uploaded successfully", {
        fileName: file.name,
        fileSize: file.size,
        contentLength: text.length
      });
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to read file";
      setError(errorMessage);
      logger.error("catalogue-ui", "Failed to upload file", {
        fileName: file.name,
        fileSize: file.size,
        error: uploadError
      });
      setSelectedFile(null);
    }
  }, [validateAndPreview]);

  // Handle compressed data input
  const handleCompressedDataChange = useCallback((value: string) => {
    setCompressedData(value);
    setPreview(null);
    setValidationResult(null);
    setDataToImport(null);
    setError(null);
  }, []);

  // T063: Handle share URL input
  const handleShareUrlChange = useCallback((value: string) => {
    setShareUrl(value);
    setPreview(null);
    setValidationResult(null);
    setDataToImport(null);
    setError(null);
  }, []);


  // Handle paste from clipboard (T063)
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      // T063: Smart paste - detect if it's a URL or compressed data
      if (text.includes('://') || text.includes('?data=')) {
        setShareUrl(text.trim());
      } else {
        setCompressedData(text.trim());
      }
      logger.debug("catalogue-ui", "Clipboard content pasted successfully", {
        textLength: text.trim().length
      });
    } catch (clipboardError) {
      logger.warn("catalogue-ui", "Could not read clipboard", { error: clipboardError });
    }
  }, []);

  // Handle final import (T063, T066)
  const handleConfirmImport = useCallback(async () => {
    setIsImporting(true);
    setError(null);

    try {
      let listId: string | null;

      if (selectedFile && dataToImport) {
        // Import from file (already parsed)
        listId = await importListFromFile(selectedFile);
      } else if (shareUrl.trim()) {
        // T063: Import from share URL
        try {
          listId = await importFromShareUrl(shareUrl.trim());
        } catch (urlError) {
          // T066: Handle invalid share URL errors
          const errorMessage = urlError instanceof Error ? urlError.message : "Invalid share URL";
          throw new Error(errorMessage);
        }
      } else if (compressedData.trim()) {
        // Import from compressed data
        listId = await importListCompressed(compressedData.trim());
      } else {
        throw new Error("No data to import");
      }

      if (listId === null) {
        throw new Error("Import failed: no list ID returned");
      }

      logger.info("catalogue-ui", "List imported successfully", { listId });
      onImport(listId);
      onClose();
    } catch (importError) {
      const errorMessage = importError instanceof Error ? importError.message : "Failed to import list";
      setError(errorMessage);
      logger.error("catalogue-ui", "Failed to import list", { error: importError });
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, dataToImport, shareUrl, compressedData, importListFromFile, importFromShareUrl, importListCompressed, onImport, onClose]);

  return (
    <Modal opened={true} onClose={onClose} title="Import Catalogue List" size="lg" trapFocus returnFocus>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Import a catalogue list from a file or compressed data string.
        </Text>

        <Alert
          icon={<IconAlertTriangle size={ICON_SIZE.MD} />}
          title="Important"
          color="blue"
          variant="light"
        >
          Importing creates a new copy of the list in your account. The list will be marked as "Imported".
        </Alert>

        {/* File Upload Section */}
        <Stack gap="xs">
          <Text size="sm" fw={500} id="file-upload-label">Upload from File</Text>
          <FileButton
            onChange={(file) => { void handleFileUpload(file); }}
            accept=".txt,.json"
          >
            {(properties) => (
              <Paper
                p="md"
                style={{
                  cursor: "pointer",
                  border: "2px dashed var(--mantine-color-gray-3)",
                  transition: "all 0.2s",
                }}
                {...properties}
                role="button"
                aria-labelledby="file-upload-label"
                aria-describedby="file-upload-description"
                data-testid="file-upload-area"
              >
                <Stack align="center" gap="xs">
                  <IconUpload size={ICON_SIZE.EMPTY_STATE_SM} color="var(--mantine-color-blue-6)" />
                  <Text size="sm" fw={500}>
                    Click to upload file
                  </Text>
                  <Text size="xs" c="dimmed" id="file-upload-description">
                    Supports .txt (compressed) and .json files
                  </Text>
                  {selectedFile && (
                    <Group gap="xs">
                      <IconFile size={ICON_SIZE.MD} />
                      <Text size="sm">{selectedFile.name}</Text>
                    </Group>
                  )}
                </Stack>
              </Paper>
            )}
          </FileButton>
        </Stack>

        <Divider label="OR" labelPosition="center" />

        {/* T063: Share URL Input Section */}
        <Stack gap="xs">
          <Text size="sm" fw={500} id="share-url-label">Import from Share URL</Text>
          <TextInput
            placeholder="Paste shared catalogue URL or data string"
            value={shareUrl}
            onChange={(e) => { handleShareUrlChange(e.currentTarget.value); }}
            leftSection={<IconLink size={ICON_SIZE.MD} />}
            rightSection={
              <Button
                variant="subtle"
                size="xs"
                onClick={() => { void handlePaste(); }}
                aria-label="Paste from clipboard"
              >
                Paste
              </Button>
            }
            aria-labelledby="share-url-label"
            aria-describedby="share-url-help"
            data-testid="share-url-input"
          />
          <Text size="xs" c="dimmed" id="share-url-help">
            Enter a full share URL (e.g., https://domain/catalogue?data=xyz) or just the data string
          </Text>
        </Stack>

        <Divider label="OR" labelPosition="center" />

        {/* Compressed Data Input Section */}
        <Stack gap="xs">
          <Text size="sm" fw={500} component="label" htmlFor="compressed-data-textarea">
            Paste Compressed Data
          </Text>
          <Textarea
            id="compressed-data-textarea"
            placeholder="Paste compressed catalogue data here..."
            value={compressedData}
            onChange={(e) => { handleCompressedDataChange(e.currentTarget.value); }}
            minRows={3}
            maxRows={6}
            rightSection={
              <Button
                variant="subtle"
                size="xs"
                onClick={() => { void handlePaste(); }}
                aria-label="Paste from clipboard"
              >
                Paste
              </Button>
            }
            data-testid="compressed-data-input"
          />
        </Stack>

        {/* Validation Errors */}
        {validationResult && !validationResult.valid && (
          <Alert
            icon={<IconAlertTriangle size={ICON_SIZE.MD} />}
            title="Validation Failed"
            color="red"
            variant="light"
          >
            <Stack gap="xs">
              {validationResult.errors.map((error_, index) => (
                <Text key={index} size="sm">{error_}</Text>
              ))}
            </Stack>
          </Alert>
        )}

        {/* Validation Warnings */}
        {validationResult && validationResult.valid && validationResult.warnings && validationResult.warnings.length > 0 && (
          <Alert
            icon={<IconAlertTriangle size={ICON_SIZE.MD} />}
            title="Warnings"
            color="yellow"
            variant="light"
          >
            <Stack gap="xs">
              {validationResult.warnings.map((warning, index) => (
                <Text key={index} size="sm">{warning}</Text>
              ))}
            </Stack>
          </Alert>
        )}

        {/* Import Error */}
        {error !== null && error !== "" && (
          <Alert
            icon={<IconAlertTriangle size={ICON_SIZE.MD} />}
            title="Import Failed"
            color="red"
            variant="light"
            role="alert"
          >
            {error}
          </Alert>
        )}

        {/* Preview Section */}
        {isValidating && (
          <Paper p="md">
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" role="status" aria-live="polite">Validating data...</Text>
            </Group>
          </Paper>
        )}

        {preview && validationResult?.valid === true && (
          <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={700}>Import Preview</Text>
                <Badge color="green" leftSection={<IconCheck size={ICON_SIZE.SM} />}>
                  Valid
                </Badge>
              </Group>

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">List Title:</Text>
                  <Text size="sm" fw={500}>{preview.listTitle}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Total Entities:</Text>
                  <Text size="sm" fw={500}>{preview.entityCount}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Estimated Size:</Text>
                  <Text size="sm" fw={500}>{preview.estimatedSize}</Text>
                </Group>
                {preview.duplicates > 0 && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Duplicates:</Text>
                    <Text size="sm" fw={500} c="orange">
                      {preview.duplicates} entities already in your catalogue
                    </Text>
                  </Group>
                )}
              </Stack>

              <Divider label="Entity Types" labelPosition="center" />

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Count</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Object.entries(preview.entityTypes)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => (
                      <Table.Tr key={type}>
                        <Table.Td>{type}</Table.Td>
                        <Table.Td style={{ textAlign: "right" }}>{count}</Table.Td>
                      </Table.Tr>
                    ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" gap="xs">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isImporting || isValidating}
          >
            Cancel
          </Button>
          <Button
            onClick={() => { void handleConfirmImport(); }}
            loading={isImporting}
            disabled={
              (!preview && !compressedData.trim() && !shareUrl.trim()) ||
              (validationResult !== null && !validationResult.valid) ||
              isValidating
            }
            leftSection={<IconDownload size={ICON_SIZE.MD} />}
            aria-busy={isImporting}
          >
            Import List
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};