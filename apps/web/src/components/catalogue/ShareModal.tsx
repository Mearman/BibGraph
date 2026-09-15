/**
 * Modal component for sharing catalogue lists
 */

import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconQrcode,
} from "@tabler/icons-react";
import QRCode from "qrcode";
import React, { useEffect,useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';

const QR_CODE_PENDING = "PENDING";

interface ShareModalProperties {
  shareUrl: string;
  listTitle: string;
  onClose: () => void;
}

export const ShareModal = ({ shareUrl, listTitle, onClose }: ShareModalProperties) => {
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (!(showQR && shareUrl)) {
    	return;
    }

    // Wrapped in an async function (rather than setting state directly in the effect body) so the initial "pending" state update runs deferred, alongside the eventual result/error update, instead of synchronously during the effect's own render pass.
    const generateQrCode = async () => {
      setQrCodeUrl(QR_CODE_PENDING);
      try {
        const url = await QRCode.toDataURL(shareUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(url);
        logger.debug("catalogue-ui", "QR code generated successfully", {
          urlLength: shareUrl.length
        });
      } catch (error) {
        logger.error("catalogue-ui", "Failed to generate QR code", {
          urlLength: shareUrl.length,
          error
        });
        setQrCodeUrl("");
      }
    };

    void generateQrCode();
  }, [showQR, shareUrl]);

  const handleOpenLink = () => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const isGeneratingQR = qrCodeUrl === QR_CODE_PENDING;
  const hasValidQRCode = qrCodeUrl !== "" && qrCodeUrl !== QR_CODE_PENDING;

  return (
    <>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Share this list with others by sending them this link:
        </Text>

        <Stack gap="xs">
          <Text size="sm" fw={500} component="label" htmlFor="share-url-field">Share URL</Text>
          <Group gap="xs">
            <TextInput
              id="share-url-field"
              value={shareUrl}
              readOnly
              flex={1}
              size="sm"
              aria-label="Share URL for this catalogue list"
              data-testid="share-url-input"
            />
            <CopyButton value={shareUrl}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy"}>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={ICON_SIZE.MD} /> : <IconCopy size={ICON_SIZE.MD} />}
                    aria-label={copied ? "URL copied to clipboard" : "Copy share URL to clipboard"}
                    data-testid="copy-share-url-button"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>

        <Group>
          <Button
            variant={showQR ? "filled" : "outline"}
            leftSection={<IconQrcode size={ICON_SIZE.MD} />}
            onClick={() => { setShowQR(!showQR); }}
            size="sm"
            aria-expanded={showQR}
            aria-controls="qr-code-section"
            data-testid="toggle-qr-code-button"
          >
            {showQR ? "Hide" : "Show"} QR Code
          </Button>
          <Tooltip label="Open link in new tab">
            <ActionIcon
              onClick={handleOpenLink}
              size="lg"
              variant="light"
              aria-label="Open share link in new tab"
              data-testid="open-share-link-button"
            >
              <IconExternalLink size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {showQR && isGeneratingQR && (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader size="md" />
          </Box>
        )}

        {showQR && hasValidQRCode && (
          <Stack align="center" gap="xs" id="qr-code-section">
            <Text size="sm" fw={500}>QR Code</Text>
            <img
              src={qrCodeUrl}
              alt={`QR Code containing share URL for ${listTitle}`}
              style={{ width: 200, height: 200 }}
              data-testid="share-qr-code"
            />
            <Text size="xs" c="dimmed">
              Scan with a mobile device to view this list
            </Text>
          </Stack>
        )}

        <Text size="xs" c="dimmed" ta="center">
          Anyone with this link can view and import this list. The link will remain active indefinitely.
        </Text>

        <Group justify="flex-end">
          <Button onClick={onClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </>
  );
};