/**
 * Missing Paper Detection Component for STAR Evaluation Provides UI for identifying potentially missed papers in systematic reviews
 */

import type {
  DetectionProgress,
  MissingPaperDetectionConfig,
  MissingPaperDetectionResults,
 STARDataset, WorkReference } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils/logger";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  Progress,
  rem,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Title} from "@mantine/core";
import { IconAlertTriangle,IconClipboard } from "@tabler/icons-react";
import React, { useMemo,useState } from "react";

import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";

// Converts a millisecond duration into seconds for display.
const MILLISECONDS_PER_SECOND = 1000;
// Default detection-configuration values used when the number input is cleared or invalid.
const DEFAULT_MAX_PAPERS_PER_METHOD = 50;
const DEFAULT_MIN_CITATION_THRESHOLD = 5;
// Converts a 0-1 ratio to a percentage value for display.
const PERCENTAGE_MULTIPLIER = 100;
// Font size (px) for the large summary statistic values.
const STAT_VALUE_FONT_SIZE_PX = 32;
// Maximum number of candidate papers rendered before truncating with a "showing top N" message.
const MAX_DISPLAYED_CANDIDATES = 20;
// Number of characters of an algorithmic-bias message used to disambiguate its React key.
const BIAS_KEY_PREVIEW_LENGTH = 10;
// Maximum number of author names listed before collapsing into "et al.".
const MAX_DISPLAYED_AUTHORS = 3;

const getMethodDescription = (method: string): string => {
  const descriptions: Record<string, string> = {
    temporalGapAnalysis:
      "Find papers published during review period matching search criteria",
    citationNetworkAnalysis:
      "Discover papers that cite or are cited by included papers",
    authorNetworkAnalysis:
      "Locate papers by authors who published included papers",
    keywordExpansionAnalysis:
      "Use semantic similarity to find papers with related terminology",
  };

  return descriptions[method] || "Unknown detection method";
};

interface PaperCardProperties {
  paper: Readonly<WorkReference>;
  rank: number;
}

const PaperCard = ({ paper, rank }: PaperCardProperties) => <Card p="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box flex={1}>
          <Group align="center" mb="xs">
            <Badge
              color="blue"
              variant="filled"
              size="sm"
              radius="xl"
              fw={600}
            >
              #{rank}
            </Badge>
            <Text
              size="sm"
              fw={600}
              c="var(--mantine-color-text)"
              lineClamp={2}
            >
              {paper.title}
            </Text>
          </Group>

          <Text size="xs" c="dimmed" mb="xs">
            {paper.authors.slice(0, MAX_DISPLAYED_AUTHORS).join(", ")}
            {paper.authors.length > MAX_DISPLAYED_AUTHORS
              ? ` et al. (${String(paper.authors.length)} authors)`
              : ""}
          </Text>

          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed">
              {paper.publicationYear} • {paper.source}
            </Text>
            {paper.citedByCount !== undefined && (
              <Badge
                variant="light"
                color="gray"
                size="xs"
              >
                {paper.citedByCount} citations
              </Badge>
            )}
            {paper.doi !== undefined && paper.doi !== "" && (
              <Badge
                component="a"
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                color="blue"
                size="xs"
              >
                DOI
              </Badge>
            )}
          </Group>
        </Box>
      </Group>
    </Card>;

interface MissingPaperResultsProperties {
  results: MissingPaperDetectionResults;
  executionTime: string;
}

const MissingPaperResults = ({
  results,
  executionTime,
}: MissingPaperResultsProperties) => {
  const [activeTab, setActiveTab] = useState<
    "summary" | "candidates" | "methods" | "validation"
  >("summary");

  const formatPercent = (value: number) => `${(value * PERCENTAGE_MULTIPLIER).toFixed(1)}%`;

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p={0}>
      <Tabs value={activeTab} onChange={(value) => {
        if (value === "summary" || value === "candidates" || value === "methods" || value === "validation") {
          setActiveTab(value);
        }
      }}>
        <Tabs.List>
          <Tabs.Tab value="summary">Summary</Tabs.Tab>
          <Tabs.Tab value="candidates">
            Candidates ({results.candidateMissingPapers.length})
          </Tabs.Tab>
          <Tabs.Tab value="methods">Methods</Tabs.Tab>
          <Tabs.Tab value="validation">Validation</Tabs.Tab>
        </Tabs.List>

              <Tabs.Panel value="summary" p="lg">
          <Title order={4} mb="md">
            Detection Summary
          </Title>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg" mb="xl">
            <Stack gap="xs" align="center">
              <Text size={rem(STAT_VALUE_FONT_SIZE_PX)} fw="bold" c="blue">
                {results.detectionStatistics.totalCandidates}
              </Text>
              <Text size="sm" c="dimmed">
                Total Candidates
              </Text>
            </Stack>

            <Stack gap="xs" align="center">
              <Text size={rem(STAT_VALUE_FONT_SIZE_PX)} fw="bold" c="green">
                {results.detectionStatistics.highConfidenceCandidates}
              </Text>
              <Text size="sm" c="dimmed">
                High Confidence
              </Text>
            </Stack>

            <Stack gap="xs" align="center">
              <Text size={rem(STAT_VALUE_FONT_SIZE_PX)} fw="bold" c="purple">
                {results.detectionStatistics.averageCitationCount.toFixed(1)}
              </Text>
              <Text size="sm" c="dimmed">
                Avg Citations
              </Text>
            </Stack>

            <Stack gap="xs" align="center">
              <Text size={rem(STAT_VALUE_FONT_SIZE_PX)} fw="bold" c="yellow">
                {formatPercent(results.validationMetrics.confidenceScore)}
              </Text>
              <Text size="sm" c="dimmed">
                Confidence
              </Text>
            </Stack>
          </SimpleGrid>

          <Card p="md" radius="md" bg="var(--mantine-color-gray-0)">
            <Text size="sm" fw={600} c="var(--mantine-color-gray-7)" mb="xs">
              Execution Details
            </Text>
            <Text size="xs" c="dimmed">
              Dataset: {results.dataset.name} • Execution Time:{" "}
              {executionTime} • Methods:{" "}
              {
                Object.values(
                  results.detectionStatistics.methodContributions,
                ).filter((count) => count > 0).length
              }
              /4
            </Text>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="candidates" p="lg">
          <Stack>
            <Group justify="space-between" align="center">
              <Text size="lg" fw={600} c="var(--mantine-color-text)">
                Candidate Missing Papers
              </Text>
              {results.candidateMissingPapers.length > 0 && (
                <Button
                  onClick={() => {
                    logger.debug(
                      "ui",
                      "Create work from missing papers clicked",
                      {
                        count: results.candidateMissingPapers.length,
                      },
                      "MissingPaperDetection",
                    );
                  }}
                  variant="outline"
                  color="blue"
                  size="sm"
                >
                  Create Work from Missing
                </Button>
              )}
            </Group>

            {results.candidateMissingPapers.length === 0 ? (
              <Paper
                p="xl"
                radius="md"
                bg="var(--mantine-color-gray-0)"
                ta="center"
              >
                <Stack gap="md" align="center">
                  <IconClipboard size={48} style={{ opacity: 0.3 }} />
                  <Text size="md" c="var(--mantine-color-dimmed)">
                    No potential missing papers detected
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Stack gap="md">
                {results.candidateMissingPapers
                  .slice(0, MAX_DISPLAYED_CANDIDATES)
                  .map((paper, index) => (
                    <PaperCard
                      key={paper.title || `paper-${String(index)}`}
                      paper={paper}
                      rank={index + 1}
                    />
                  ))}

                {results.candidateMissingPapers.length > MAX_DISPLAYED_CANDIDATES && (
                  <Paper
                    p="md"
                    radius="md"
                    bg="var(--mantine-color-gray-0)"
                    ta="center"
                  >
                    <Text size="sm" c="var(--mantine-color-dimmed)">
                      Showing top {MAX_DISPLAYED_CANDIDATES} of {results.candidateMissingPapers.length}{" "}
                      candidates
                    </Text>
                  </Paper>
                )}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="methods" p="lg">
          <Title order={4} mb="md">
            Detection Methods Breakdown
          </Title>

          <Stack gap="md">
            {Object.entries(
              results.detectionStatistics.methodContributions,
            ).map(([method, count]) => (
              <Card key={method} p="md" radius="md" bg="var(--mantine-color-gray-0)">
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs" flex={1}>
                    <Text size="sm" fw={600}>
                      {method
                        .replaceAll(/([A-Z])/g, " $1")
                        .replace(/^./, (string_) => string_.toUpperCase())}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {getMethodDescription(method)}
                    </Text>
                  </Stack>
                  <Badge
                    color={count > 0 ? "green" : "gray"}
                    variant="filled"
                    size="lg"
                  >
                    {count}
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="validation" p="lg">
          <Title order={4} mb="md">
            Validation Metrics
          </Title>

          <Stack gap="lg">
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="var(--mantine-color-gray-6)">
                  Algorithm Confidence
                </Text>
                <Text size="sm" fw={600}>
                  {formatPercent(results.validationMetrics.confidenceScore)}
                </Text>
              </Group>
              <Progress
                value={results.validationMetrics.confidenceScore * PERCENTAGE_MULTIPLIER}
                color="blue"
                size="sm"
              />
            </Box>

            {results.validationMetrics.algorithmicBias.length > 0 && (
              <Stack gap="sm">
                <Text size="sm" fw={600} c="red" mb="xs">
                  Potential Algorithmic Biases
                </Text>
                {results.validationMetrics.algorithmicBias.map(
                  (bias, index) => (
                    <Alert
                      key={`bias-${String(index)}-${bias.slice(0, BIAS_KEY_PREVIEW_LENGTH)}`}
                      color="red"
                      variant="light"
                      icon={<IconAlertTriangle size={16} />}
                    >
                      <Text size="xs">{bias}</Text>
                    </Alert>
                  ),
                )}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
};

interface MissingPaperDetectionProperties {
  dataset: STARDataset;
  onDetectionComplete?: (results: MissingPaperDetectionResults) => void;
}

interface DetectionJob {
  id: string;
  datasetId: string;
  status: "ready" | "running" | "completed" | "failed";
  results?: MissingPaperDetectionResults;
  progress?: DetectionProgress;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export const MissingPaperDetection = ({
  dataset,
  onDetectionComplete,
}: MissingPaperDetectionProperties) => {
  const [detectionJobs, setDetectionJobs] = useState<DetectionJob[]>([]);
  const [detectionConfig, setDetectionConfig] =
    useState<MissingPaperDetectionConfig>({
      maxPapersPerMethod: 50,
      minimumCitationThreshold: 5,
      temporalWindowYears: 2,
      enableCitationAnalysis: true,
      enableAuthorAnalysis: true,
      enableTemporalAnalysis: true,
      enableKeywordExpansion: false,
    });

  const currentJob = useMemo(() => {
    return detectionJobs.find((job) => job.datasetId === dataset.id);
  }, [detectionJobs, dataset.id]);

  const updateJobProgress = (jobId: string, progressData: Readonly<DetectionProgress>) => {
    setDetectionJobs((previous) =>
      previous.map((job) => (job.id === jobId ? { ...job, progress: progressData } : job)),
    );
  };

  const handleStartDetection = async () => {
    const jobId = "detection_" + dataset.id + "_" + Date.now().toString();
    const newJob: DetectionJob = {
      id: jobId,
      datasetId: dataset.id,
      status: "running",
      startTime: new Date(),
    };

    setDetectionJobs((previous) => [
      ...previous.filter((index) => index.datasetId !== dataset.id),
      newJob,
    ]);

    try {
      // Dynamic import to avoid loading the heavy detection module until needed
      const { detectMissingPapers } = await import("@bibgraph/utils");

      const results = detectMissingPapers({
        dataset,
        config: detectionConfig,
        onProgress: (progress) => { updateJobProgress(jobId, progress); },
      });

      const completedJob: DetectionJob = {
        ...newJob,
        status: "completed",
        results,
        endTime: new Date(),
      };
      delete completedJob.progress;

      setDetectionJobs((previous) =>
        previous.map((job) => (job.id === jobId ? completedJob : job)),
      );

      onDetectionComplete?.(results);
    } catch (error) {
      const failedJob: DetectionJob = {
        ...newJob,
        status: "failed",
        error: error instanceof Error ? error.message : "Detection failed",
        endTime: new Date(),
      };
      delete failedJob.progress;

      setDetectionJobs((previous) =>
        previous.map((job) => (job.id === jobId ? failedJob : job)),
      );
    }
  };

  const formatExecutionTime = (job: DetectionJob): string => {
    if (!job.startTime || !job.endTime) return "N/A";
    const duration = job.endTime.getTime() - job.startTime.getTime();
    return `${(duration / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
  };

  return (
    <Paper p="lg" radius="lg" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Stack gap="lg" mb="lg">
        <Title order={3} c="var(--mantine-color-text)">
          Missing Paper Detection
        </Title>
        <Text c="dimmed" size="sm">
          Identify potentially relevant papers that may have been missed by the
          systematic review
        </Text>
      </Stack>

      {/* Configuration Panel */}
      <Card p="md" radius="md" style={{ border: BORDER_STYLE_GRAY_3 }} bg="var(--mantine-color-gray-0)" mb="lg">
        <Title order={4} mb="md">
          Detection Configuration
        </Title>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
          <NumberInput
            label="Max Papers per Method"
            value={detectionConfig.maxPapersPerMethod}
            onChange={(value) => {
              setDetectionConfig((previous) => ({
                ...previous,
                maxPapersPerMethod: Number(value) || DEFAULT_MAX_PAPERS_PER_METHOD,
              }));
            }}
            min={10}
            max={200}
          />

          <NumberInput
            label="Min Citation Threshold"
            value={detectionConfig.minimumCitationThreshold}
            onChange={(value) => {
              setDetectionConfig((previous) => ({
                ...previous,
                minimumCitationThreshold: Number(value) || DEFAULT_MIN_CITATION_THRESHOLD,
              }));
            }}
            min={0}
            max={50}
          />

          <NumberInput
            label="Temporal Window (Years)"
            value={detectionConfig.temporalWindowYears}
            onChange={(value) => {
              setDetectionConfig((previous) => ({
                ...previous,
                temporalWindowYears: Number(value) || 2,
              }));
            }}
            min={0}
            max={10}
          />
        </SimpleGrid>

        {/* Detection Method Toggles */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Switch
            label="Temporal Gap Analysis"
            checked={detectionConfig.enableTemporalAnalysis}
            onChange={(event) => {
              setDetectionConfig((previous) => ({
                ...previous,
                enableTemporalAnalysis: event.currentTarget.checked,
              }));
            }}
            size="sm"
          />

          <Switch
            label="Citation Network Analysis"
            checked={detectionConfig.enableCitationAnalysis}
            onChange={(event) => {
              setDetectionConfig((previous) => ({
                ...previous,
                enableCitationAnalysis: event.currentTarget.checked,
              }));
            }}
            size="sm"
          />

          <Switch
            label="Author Network Analysis"
            checked={detectionConfig.enableAuthorAnalysis}
            onChange={(event) => {
              setDetectionConfig((previous) => ({
                ...previous,
                enableAuthorAnalysis: event.currentTarget.checked,
              }));
            }}
            size="sm"
          />

          <Switch
            label="Keyword Expansion (Experimental)"
            checked={detectionConfig.enableKeywordExpansion}
            onChange={(event) => {
              setDetectionConfig((previous) => ({
                ...previous,
                enableKeywordExpansion: event.currentTarget.checked,
              }));
            }}
            size="sm"
          />
        </SimpleGrid>
      </Card>

      {/* Detection Control */}
      <div style={{ marginBottom: "24px" }}>
        <Group>
          <Button
            onClick={() => {
              void handleStartDetection();
            }}
            disabled={currentJob?.status === "running"}
            loading={currentJob?.status === "running"}
            variant="filled"
            color="blue"
            size="md"
            fw={600}
          >
            {currentJob?.status === "running"
              ? "Detecting..."
              : "Start Detection"}
          </Button>

          {currentJob?.results && (
            <Button
              onClick={() => {
                logger.debug(
                  "ui",
                  "Export detection results clicked",
                  {
                    resultsCount:
                      currentJob.results?.candidateMissingPapers.length,
                  },
                  "MissingPaperDetection",
                );
              }}
              variant="filled"
              color="green"
              size="md"
              fw={600}
            >
              Export Results
            </Button>
          )}
        </Group>
      </div>

      {/* Progress Display */}
      {currentJob?.progress && (
        <Alert color="yellow" mb="lg">
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500} c="var(--mantine-color-yellow-6)">
              {currentJob.progress.currentMethod}
            </Text>
            <Text size="sm" fw={500} c="var(--mantine-color-yellow-6)">
              {currentJob.progress.progress}%
            </Text>
          </Group>
          <Progress
            value={currentJob.progress.progress ?? 0}
            color="yellow"
            size="sm"
            mb="xs"
          />
          <Text size="xs" c="var(--mantine-color-yellow-8)">
            {currentJob.progress.message} • {currentJob.progress.papersFound}{" "}
            papers found
          </Text>
        </Alert>
      )}

      {/* Results Display */}
      {currentJob?.results && (
        <MissingPaperResults
          results={currentJob.results}
          executionTime={formatExecutionTime(currentJob)}
        />
      )}

      {/* Error Display */}
      {currentJob?.status === "failed" && (
        <Alert color="red" title="Detection Failed">
          <Text size="sm">{currentJob.error}</Text>
        </Alert>
      )}
    </Paper>
  );
};
