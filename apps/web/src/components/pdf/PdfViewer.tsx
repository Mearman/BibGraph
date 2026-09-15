/**
 * Inline PDF Viewer component
 * Displays PDFs using an iframe with fallback handling
 */

import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconExternalLink,
  IconFileTypePdf,
  IconMaximize,
  IconMinimize,
  IconRefresh,
} from "@tabler/icons-react";
import React, { useCallback,useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

export interface PdfViewerProps {
  /**
  URL of the PDF to display
   */
  pdfUrl: string | null | undefined;
  /**
  Whether the PDF URL is still loading
   */
  isLoading?: boolean;
  /**
  Title for the PDF (optional)
   */
  title?: string;
  /**
  Error message if PDF loading failed
   */
  error?: string | null;
  /**
  Callback when user requests to open in new tab
   */
  onOpenExternal?: () => void;
  /**
  Source attribution (e.g., "OpenAlex" or "Unpaywall")
   */
  source?: string;
  /**
  Initial collapsed state
   */
  defaultCollapsed?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  isLoading = false,
  title,
  error,
  onOpenExternal,
  source,
  defaultCollapsed = false,
}) => {
  const [iframeError, setIframeError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const handleIframeLoad = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
    setIsIframeLoading(false);
  }, []);

  const handleRetry = useCallback(() => {
    setIframeError(false);
    setIsIframeLoading(true);
  }, []);

  const handleOpenExternal = useCallback(() => {
    if (pdfUrl !== null && pdfUrl !== undefined && pdfUrl !== "") {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
    onOpenExternal?.();
  }, [pdfUrl, onOpenExternal]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((previous) => !previous);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="md">
        <Stack gap="sm">
          <Group gap="xs">
            <IconFileTypePdf size={ICON_SIZE.XL} />
            <Text size="sm" fw={500}>
              PDF Document
            </Text>
            <Skeleton height={16} width={100} />
          </Group>
          <Skeleton height={400} />
        </Stack>
      </Paper>
    );
  }

  // No PDF available
  if ((pdfUrl === null || pdfUrl === undefined || pdfUrl === "") && (error === null || error === undefined || error === "")) {
    return null;
  }

  // Error state
  if (error !== null && error !== undefined && error !== "") {
    return (
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="md">
        <Alert
          icon={<IconAlertCircle size={ICON_SIZE.MD} />}
          title="PDF Unavailable"
          color="yellow"
          variant="light"
        >
          <Text size="sm">{error}</Text>
        </Alert>
      </Paper>
    );
  }

  // Iframe error state
  if (iframeError && pdfUrl !== null && pdfUrl !== undefined && pdfUrl !== "") {
    return (
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="md">
        <Stack gap="md">
          <Group gap="xs">
            <IconFileTypePdf size={ICON_SIZE.XL} />
            <Text size="sm" fw={500}>
              PDF Document
            </Text>
            {source !== undefined && source !== "" && (
              <Text size="xs" c="dimmed">
                via {source}
              </Text>
            )}
          </Group>
          <Alert
            icon={<IconAlertCircle size={ICON_SIZE.MD} />}
            title="Unable to Display PDF Inline"
            color="yellow"
            variant="light"
          >
            <Stack gap="sm">
              <Text size="sm">
                The PDF cannot be displayed inline. This may be due to the
                publisher's security settings or CORS restrictions.
              </Text>
              <Group gap="sm">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconExternalLink size={ICON_SIZE.SM} />}
                  onClick={handleOpenExternal}
                >
                  Open in New Tab
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconRefresh size={ICON_SIZE.SM} />}
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              </Group>
            </Stack>
          </Alert>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="md">
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            <IconFileTypePdf size={ICON_SIZE.XL} style={{ color: "var(--mantine-color-red-6)" }} />
            <Text size="sm" fw={500}>
              {title ?? "PDF Document"}
            </Text>
            {source !== undefined && source !== "" && (
              <Text size="xs" c="dimmed">
                via {source}
              </Text>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label={isExpanded ? "Collapse" : "Expand"}>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={toggleExpanded}
                aria-label={isExpanded ? "Collapse PDF viewer" : "Expand PDF viewer"}
              >
                {isExpanded ? (
                  <IconMinimize size={ICON_SIZE.MD} />
                ) : (
                  <IconMaximize size={ICON_SIZE.MD} />
                )}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Open in new tab">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleOpenExternal}
                aria-label="Open PDF in new tab"
              >
                <IconExternalLink size={ICON_SIZE.MD} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* PDF Viewer */}
        {isExpanded && pdfUrl !== null && pdfUrl !== undefined && pdfUrl !== "" && (
          <div style={{ position: "relative" }}>
            {isIframeLoading && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--mantine-color-gray-0)",
                  borderRadius: "var(--mantine-radius-sm)",
                }}
              >
                <Stack align="center" gap="xs">
                  <Skeleton height={20} width={200} />
                  <Text size="xs" c="dimmed">
                    Loading PDF...
                  </Text>
                </Stack>
              </div>
            )}
            <iframe
              src={pdfUrl}
              title={title ?? "PDF Document"}
              style={{
                width: "100%",
                height: "600px",
                border: "none",
                borderRadius: "var(--mantine-radius-sm)",
              }}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-popups allow-forms"
            />
          </div>
        )}

        {/* Collapsed state */}
        {!isExpanded && pdfUrl !== null && pdfUrl !== undefined && pdfUrl !== "" && (
          <Group gap="sm">
            <Button
              variant="light"
              size="xs"
              leftSection={<IconMaximize size={ICON_SIZE.SM} />}
              onClick={toggleExpanded}
            >
              Show PDF
            </Button>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconExternalLink size={ICON_SIZE.SM} />}
              onClick={handleOpenExternal}
            >
              Open in New Tab
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
};
