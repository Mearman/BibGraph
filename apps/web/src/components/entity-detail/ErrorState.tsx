import { Alert, Button, Code, Container, Flex, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle, IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";

interface ErrorStateProps {
  entityType: string;
  entityId: string;
  error: unknown;
  onRetry?: () => void;
}

export const ErrorState = ({ entityType, entityId, error, onRetry }: ErrorStateProps) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Fallback: reload the current page
      window.location.reload();
    }
  };

  const handleGoBack = () => {
    navigate({ to: "/" });
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

              <Alert variant="light" color="red" title="Error Details">
                <Code block style={{ wordBreak: "break-all", fontFamily: "monospace", color: "var(--mantine-color-red-8)" }}>
                  {String(error)}
                </Code>
              </Alert>

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
