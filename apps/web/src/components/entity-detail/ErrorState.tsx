import { Alert, Button, Code, Container, Flex, Group, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconAlertCircle, IconArrowLeft, IconChevronDown, IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

import { describeEntityError } from "./error-presentation";

interface ErrorStateProperties {
  entityType: string;
  entityId: string;
  error: unknown;
  onRetry?: () => void;
}

export const ErrorState = ({ entityType, entityId, error, onRetry }: ErrorStateProperties) => {
  const navigate = useNavigate();
  const [showTechnicalDetail, setShowTechnicalDetail] = useState(false);
  const presentation = describeEntityError(error);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Fallback: reload the current page
      window.location.reload();
    }
  };

  const handleGoBack = () => {
    void navigate({ to: "/", params: {} });
  };

  return (
    <Container size="md" p="xl" data-testid="error-state" role="alert" aria-live="assertive">
      <Flex h="100vh" justify="center" align="center">
        <Paper p="xl" radius="xl" style={{ border: BORDER_STYLE_GRAY_3 }} w="100%" maw="48rem">
          <Stack gap="lg">
            <Group justify="center" mb="md">
              <Alert variant="light" color="red" radius="xl" p="lg" w="fit-content">
                <IconAlertCircle size={ICON_SIZE.HERO} />
              </Alert>
            </Group>

            <Title order={2} ta="center" c="red">
              Error Loading {entityType}
            </Title>

            <Stack gap="md">
              <Paper p="md" radius="lg" style={{ border: BORDER_STYLE_GRAY_3 }} bg="var(--mantine-color-red-light-0)">
                <Stack gap="xs">
                  <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                    {entityType} ID:
                  </Text>
                  <Code block style={{ wordBreak: "break-all", fontFamily: "monospace" }}>
                    {entityId}
                  </Code>
                </Stack>
              </Paper>

              {/* Human sentence first; raw internals only behind an explicit disclosure */}
              <Stack gap="xs">
                <Text size="md" data-testid="error-headline">
                  {presentation.headline}
                </Text>
                <UnstyledButton
                  onClick={() => { setShowTechnicalDetail(previous => !previous); }}
                  aria-expanded={showTechnicalDetail}
                  c="dimmed"
                >
                  <Group gap={4} align="center">
                    <Text size="sm" c="dimmed">
                      Technical details
                    </Text>
                    <IconChevronDown
                      size={14}
                      style={{
                        transform: showTechnicalDetail ? "rotate(180deg)" : "none",
                        transition: "transform 150ms ease",
                      }}
                    />
                  </Group>
                </UnstyledButton>
                {showTechnicalDetail && (
                  <Code
                    block
                    data-testid="error-technical-details"
                    style={{ wordBreak: "break-all", fontFamily: "monospace", color: "var(--mantine-color-red-8)" }}
                  >
                    {presentation.technicalDetail}
                  </Code>
                )}
              </Stack>

              {/* Action buttons for user recovery */}
              <Group justify="center" gap="md" mt="md">
                <Button
                  variant="outline"
                  color="gray"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleGoBack}
                >
                  Go Home
                </Button>
                <Button
                  variant="filled"
                  color="blue"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Paper>
      </Flex>
    </Container>
  );
};
