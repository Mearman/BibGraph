/**
 * STAR datasets management interface
 * Upload, manage, and process systematic literature review datasets
 */

import type { STARDataset } from "@bibgraph/utils";
import {
  createSTARDatasetFromParseResult,
  parseSTARFile,
} from "@bibgraph/utils";
import { logError, logger } from "@bibgraph/utils/logger";
import {
  Button,
  Card,
  Container,
  FileInput,
  Group,
  Modal,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconChartBar,IconUpload } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';


// Types are imported from @bibgraph/utils

const DatasetsManagement = () => {
  const [datasets, setDatasets] = useState<STARDataset[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (file: File | null) => {
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Show initial progress
      setUploadProgress(10);

      // Parse file using actual file parser
      setUploadProgress(30);
      const parseResult = await parseSTARFile();

      // Check for parsing errors
      if (parseResult.metadata.errors.length > 0) {
        logger.warn(
          "ui",
          "File parsing warnings",
          { errors: parseResult.metadata.errors },
          "DatasetsManagement",
        );

        // Show error details to user for critical errors
        const criticalErrors = parseResult.metadata.errors.filter((error) =>
          error.includes("Failed to parse"),
        );

        if (criticalErrors.length > 0) {
          alert(
            `Upload failed: ${criticalErrors.join(", ")}\n\nSupported formats: CSV, JSON, Excel`,
          );
          throw new Error("File parsing failed");
        }
      }

      setUploadProgress(70);

      // Create dataset from parse result
      const reviewTopic =
        prompt("Enter the review topic for this dataset:") ??
        "Systematic Literature Review";
      const newDataset = createSTARDatasetFromParseResult({
        file: uploadFile,
        parseResult,
        reviewTopic,
      });

      setUploadProgress(100);

      // Add to datasets
      setDatasets((prev) => [...prev, newDataset]);

      // Reset upload state
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadFile(null);
        setShowUploadModal(false);
      }, 1000);
    } catch (error) {
      logError(
        logger,
        "Upload failed:",
        error,
        "DatasetsManagement",
        "routing",
      );
      setIsUploading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Container size="xl" p="lg" maw={1200}>
      {/* Header */}
      <Group justify="space-between" align="center" mb="xl">
        <div>
          <Title order={1} fw={700} c="gray.9" mb="xs">
            STAR Datasets
          </Title>
          <Text size="lg" c="dimmed">
            Manage systematic literature review datasets for evaluation
            comparisons
          </Text>
        </div>

        <Button
          onClick={() => {
            setShowUploadModal(true);
          }}
          leftSection={<IconUpload size={ICON_SIZE.MD} />}
          size="md"
        >
          Upload Dataset
        </Button>
      </Group>

      {/* Datasets Grid */}
      {datasets.length === 0 ? (
        <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl" bg="gray.0">
          <Stack align="center" gap="md">
            <div style={{ opacity: 0.3 }}>
              <IconChartBar size={ICON_SIZE.EMPTY_STATE} />
            </div>
            <Title order={3} fw={600} c="gray.7">
              No datasets uploaded yet
            </Title>
            <Text size="sm" c="dimmed" ta="center" maw={400}>
              Upload your first STAR dataset to begin evaluation. Supported
              formats: CSV, JSON, Excel.
            </Text>
            <Button
              onClick={() => {
                setShowUploadModal(true);
              }}
              color="blue"
            >
              Upload Your First Dataset
            </Button>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid
          cols={{ base: 1, md: 2 }}
          spacing="lg"
        >
          {datasets.map((dataset) => (
            <Card key={dataset.id} style={{ border: BORDER_STYLE_GRAY_3 }} p="md" shadow="sm">
              <Stack gap="md" mb="md">
                <Title order={3} fw={600} c="gray.7" size="sm">
                  {dataset.name}
                </Title>
                <Text size="sm" c="dimmed">
                  Topic: {dataset.reviewTopic}
                </Text>
                <Text size="xs" c="gray.5">
                  Uploaded {formatDate(dataset.uploadDate)}
                </Text>
              </Stack>

              <Card p="sm" bg="gray.0" mb="md">
                <Group grow>
                  <Stack gap={0} align="center">
                    <Text size="lg" fw="bold" c="gray.7">
                      {dataset.originalPaperCount}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Total Papers
                    </Text>
                  </Stack>
                  <Stack gap={0} align="center">
                    <Text size="lg" fw="bold" c="green">
                      {dataset.includedPapers.length}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Included
                    </Text>
                  </Stack>
                </Group>
              </Card>

              {"description" in dataset.metadata &&
                typeof dataset.metadata.description === "string" && (
                  <Text size="xs" c="dimmed" mb="md" lineClamp={3}>
                    {dataset.metadata["description"]}
                  </Text>
                )}

              <Group gap="xs">
                <Button
                  variant="light"
                  color="gray"
                  size="sm"
                  onClick={() => {
                    logger.debug(
                      "ui",
                      "View dataset details clicked",
                      { datasetId: dataset.id },
                      "DatasetsManagement",
                    );
                  }}
                  style={{ flex: 1 }}
                >
                  View Details
                </Button>
                <Button
                  color="green"
                  size="sm"
                  onClick={() => {
                    logger.debug(
                      "ui",
                      "Run comparison clicked",
                      { datasetId: dataset.id },
                      "DatasetsManagement",
                    );
                  }}
                  style={{ flex: 1 }}
                >
                  Run Comparison
                </Button>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Upload Modal */}
      <Modal
        opened={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadProgress(0);
        }}
        title="Upload STAR Dataset"
        size="md"
        radius="md"
      >
        <Stack>
          {uploadFile ? (
            <Stack gap="md">
              <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }} bg="var(--mantine-color-gray-0)">
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Selected file: {uploadFile.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Size: {(uploadFile.size / 1024).toFixed(1)} KB
                  </Text>
                </Stack>
              </Paper>

              {isUploading && (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Uploading...</Text>
                    <Text size="sm" c="dimmed">
                      {uploadProgress}%
                    </Text>
                  </Group>
                  <Progress
                    value={uploadProgress}
                    color="blue"
                    size="sm"
                  />
                </Stack>
              )}
            </Stack>
          ) : (
            <FileInput
              accept=".csv,.json,.xlsx,.xls"
              onChange={(file) => handleFileUpload(file)}
              placeholder={
                <Stack align="center" gap="md" p="xl">
                  <IconUpload size={ICON_SIZE.EMPTY_STATE_SM} style={{ color: "var(--mantine-color-blue-6)" }} />
                  <Text size="lg" fw={500} ta="center">
                    Upload your dataset file
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Supported formats: CSV, JSON, Excel (.xlsx)
                  </Text>
                  <Text size="sm" c="blue" ta="center" style={{ textDecoration: "underline" }}>
                    Click to select file
                  </Text>
                </Stack>
              }
              styles={{
                input: {
                  borderStyle: "dashed",
                  backgroundColor: "var(--mantine-color-gray-0)",
                  cursor: "pointer",
                  textAlign: "center",
                },
              }}
            />
          )}

          <Group justify="flex-end" mt="lg">
            <Button
              variant="light"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadProgress(0);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleUpload()}
              disabled={!uploadFile || isUploading}
              loading={isUploading}
            >
              Upload Dataset
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export const Route = createFileRoute("/evaluation/datasets")({
  component: DatasetsManagement,
});
