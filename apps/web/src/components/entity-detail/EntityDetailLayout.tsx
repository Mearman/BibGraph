import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { ActionIcon, Affix, Badge, Box, Code, Group, Modal, Paper, SegmentedControl, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconBookmark, IconBookmarkFilled, IconBookmarkOff, IconCode, IconListCheck, IconMenu2, IconX } from "@tabler/icons-react";
import React, { ReactNode, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";
import { useQueryBookmarking } from "@/hooks/use-query-bookmarking";
import { useResponsiveDesign } from "@/hooks/use-sprinkles";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useUserInteractions } from "@/hooks/use-user-interactions";

import { AddToListModal } from "../catalogue/AddToListModal";
import { EntityDataDisplay } from "../EntityDataDisplay";
import type { EntityTypeConfig } from "./EntityTypeConfig";
import { getMantineColor } from "./EntityTypeConfig";

export type DetailViewMode = "rich" | "raw";

interface EntityDetailLayoutProps {
  config: EntityTypeConfig;
  entityType: EntityType;
  entityId: string;
  displayName: string;
  selectParam?: string;
  selectFields: string[];
  viewMode: DetailViewMode;
  onViewModeChange: (mode: DetailViewMode) => void;
  data: Record<string, unknown>;
  children?: ReactNode;
}

export const EntityDetailLayout = ({
  config,
  entityType,
  entityId,
  displayName,
  selectParam,
  selectFields,
  viewMode,
  onViewModeChange,
  data,
  children,
}: EntityDetailLayoutProps) => {
  // Initialize theme colors hook
  useThemeColors();

  // Initialize responsive design hook
  const { isMobile } = useResponsiveDesign();

  // Initialize user interactions hook for entity bookmark functionality
  const userInteractions = useUserInteractions({
    entityId,
    entityType,
    autoTrackVisits: true,
    displayName,
  });

  // Initialize query bookmarking hook for query-specific bookmarking
  const queryBookmarking = useQueryBookmarking({
    entityType,
    entityId,
  });

  // Modal state for adding to catalogue
  const [showAddToListModal, setShowAddToListModal] = useState(false);

  // Mobile navigation state
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const handleBookmarkToggle = async () => {
    try {
      await (userInteractions.isBookmarked ? userInteractions.unbookmarkEntity() : userInteractions.bookmarkEntity({
          title: displayName,
          notes: `${config.name} from OpenAlex`,
          tags: [config.name.toLowerCase(), "openalex"],
        }));
    } catch (error) {
      logger.error("ui", "Failed to toggle bookmark", { error, entityType, entityId });
    }
  };

  const handleQueryBookmarkToggle = async () => {
    try {
      await (queryBookmarking.isQueryBookmarked ? queryBookmarking.unbookmarkCurrentQuery() : queryBookmarking.bookmarkCurrentQuery({
          title: `${displayName} (Query)`,
          notes: `Query bookmark for ${config.name} with specific parameters`,
          tags: [config.name.toLowerCase(), "query", "entity-query"]
        }));
    } catch (error) {
      logger.error("ui", "Failed to toggle query bookmark", { error, entityType, entityId });
    }
  };
  return (
    <Box
      p={isMobile() ? "sm" : "xl"}
      pb={isMobile() ? 80 : undefined}
      bg="var(--mantine-color-body)"
      style={{ minHeight: '100%' }}
      data-testid="entity-detail-layout"
    >
      <Stack gap={isMobile() ? "lg" : "xl"}>
          {/* Header Section */}
          <Paper p={isMobile() ? "lg" : "xl"} radius="xl">
            <Stack gap="lg">
              {/* Mobile Header */}
              {isMobile() && (
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <Badge
                      size="lg"
                      variant="light"
                      color={getMantineColor(entityType)}
                      leftSection={
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                          {config.icon}
                        </svg>
                      }
                    >
                      {config.name}
                    </Badge>
                  </Group>

                  <ActionIcon
                    variant="light"
                    onClick={() => setMobileActionsOpen(!mobileActionsOpen)}
                    aria-label="Actions menu"
                  >
                    {mobileActionsOpen ? <IconX size={ICON_SIZE.LG} /> : <IconMenu2 size={ICON_SIZE.LG} />}
                  </ActionIcon>
                </Group>
              )}

              {/* Desktop Header */}
              {!isMobile() && (
                <Group align="flex-start" justify="space-between" gap="xl">
                  <Stack gap="lg" style={{ flex: '1' }}>
                    <Badge
                      size="xl"
                      variant="light"
                      color={getMantineColor(entityType)}
                      leftSection={
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                          {config.icon}
                        </svg>
                      }
                    >
                      {config.name}
                    </Badge>

                    <Title order={1} size="h1" c="var(--mantine-color-text)">
                      {displayName}
                    </Title>
                  </Stack>

                  <Group gap="sm">
                    {/* Desktop Action Buttons */}
                    <Tooltip label="Add to catalogue list" position="bottom">
                      <ActionIcon
                        size="lg"
                        variant="light"
                        color="green"
                        onClick={() => setShowAddToListModal(true)}
                        data-testid="add-to-catalogue-button"
                      >
                        <IconListCheck size={ICON_SIZE.XL} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip
                      label={userInteractions.isBookmarked ? "Remove entity bookmark" : "Bookmark this entity"}
                      position="bottom"
                    >
                      <ActionIcon
                        size="lg"
                        variant={userInteractions.isBookmarked ? "filled" : "light"}
                        color={userInteractions.isBookmarked ? "yellow" : "gray"}
                        onClick={handleBookmarkToggle}
                        loading={userInteractions.isLoadingBookmarks}
                        data-testid="entity-bookmark-button"
                      >
                        {userInteractions.isBookmarked ? (
                          <IconBookmark size={ICON_SIZE.XL} fill="currentColor" />
                        ) : (
                          <IconBookmarkOff size={ICON_SIZE.XL} />
                        )}
                      </ActionIcon>
                    </Tooltip>

                    {(selectParam || Object.keys(queryBookmarking.currentQueryParams).length > 0) && (
                      <Tooltip
                        label={
                          queryBookmarking.isQueryBookmarked
                            ? "Remove query bookmark"
                            : "Bookmark this query (ignores pagination)"
                        }
                        position="bottom"
                      >
                        <ActionIcon
                          size="lg"
                          variant={queryBookmarking.isQueryBookmarked ? "filled" : "light"}
                          color={queryBookmarking.isQueryBookmarked ? "blue" : "gray"}
                          onClick={handleQueryBookmarkToggle}
                        >
                          {queryBookmarking.isQueryBookmarked ? (
                            <IconBookmarkFilled size={ICON_SIZE.XL} />
                          ) : (
                            <IconBookmark size={ICON_SIZE.XL} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}

                    <SegmentedControl
                      value={viewMode}
                      onChange={(value) => onViewModeChange(value as DetailViewMode)}
                      data={[
                        { label: 'Rich', value: 'rich' },
                        { label: 'Raw', value: 'raw' },
                      ]}
                    />
                  </Group>
                </Group>
              )}

              {/* Mobile Title and Actions */}
              {isMobile() && (
                <>
                  <Title order={1} size="h2" c="var(--mantine-color-text)" ta="left">
                    {displayName}
                  </Title>

                  {/* Mobile Actions Panel */}
                  {mobileActionsOpen && (
                    <Paper p="sm" radius="md" bg="var(--mantine-color-gray-0)">
                      <Stack gap="sm">
                        <Text size="sm" fw={600} c="dimmed">Actions</Text>
                        <Group gap="sm" justify="space-around">
                          <ActionIcon
                            size="lg"
                            variant="light"
                            color="green"
                            onClick={() => {
                              setShowAddToListModal(true);
                              setMobileActionsOpen(false);
                            }}
                            data-testid="mobile-add-to-catalogue-button"
                          >
                            <IconListCheck size={ICON_SIZE.LG} />
                          </ActionIcon>

                          <ActionIcon
                            size="lg"
                            variant={userInteractions.isBookmarked ? "filled" : "light"}
                            color={userInteractions.isBookmarked ? "yellow" : "gray"}
                            onClick={() => {
                              handleBookmarkToggle();
                              setMobileActionsOpen(false);
                            }}
                            loading={userInteractions.isLoadingBookmarks}
                            data-testid="mobile-entity-bookmark-button"
                          >
                            {userInteractions.isBookmarked ? (
                              <IconBookmark size={ICON_SIZE.LG} fill="currentColor" />
                            ) : (
                              <IconBookmarkOff size={ICON_SIZE.LG} />
                            )}
                          </ActionIcon>

                          {(selectParam || Object.keys(queryBookmarking.currentQueryParams).length > 0) && (
                            <ActionIcon
                              size="lg"
                              variant={queryBookmarking.isQueryBookmarked ? "filled" : "light"}
                              color={queryBookmarking.isQueryBookmarked ? "blue" : "gray"}
                              onClick={() => {
                                handleQueryBookmarkToggle();
                                setMobileActionsOpen(false);
                              }}
                            >
                              {queryBookmarking.isQueryBookmarked ? (
                                <IconBookmarkFilled size={ICON_SIZE.LG} />
                              ) : (
                                <IconBookmark size={ICON_SIZE.LG} />
                              )}
                            </ActionIcon>
                          )}

                          <SegmentedControl
                            size="sm"
                            value={viewMode}
                            onChange={(value) => {
                              onViewModeChange(value as DetailViewMode);
                              setMobileActionsOpen(false);
                            }}
                            data={[
                              { label: 'Rich', value: 'rich' },
                              { label: 'Raw', value: 'raw' },
                            ]}
                          />
                        </Group>
                      </Stack>
                    </Paper>
                  )}
                </>
              )}

              {/* Entity Details - shown on both mobile and desktop */}
              <Paper p={isMobile() ? "sm" : "md"} radius="lg" bg="var(--mantine-color-body)">
                <Stack gap="sm">
                  <Group align="flex-start" gap="sm" wrap="nowrap">
                    <Text size="sm" fw={600} c="dimmed" miw={isMobile() ? "80px" : "100px"}>
                      {config.name} ID:
                    </Text>
                    <Code flex={1} style={{ wordBreak: 'break-all' }}>
                      {entityId}
                    </Code>
                  </Group>
                  <Group align="flex-start" gap="sm" wrap="nowrap">
                    <Text size="sm" fw={600} c="dimmed" miw={isMobile() ? "80px" : "100px"}>
                      Select fields:
                    </Text>
                    <Text size="sm" c="dimmed" flex={1}>
                      {selectParam && typeof selectParam === 'string'
                        ? selectParam
                        : `default (${selectFields.length} fields)`}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Paper>

        {/* Content Section */}
          {viewMode === "raw" ? (
            <Paper style={{ overflow: 'hidden', border: BORDER_STYLE_GRAY_3 }} radius="xl">
              <Paper p={isMobile() ? "sm" : "md"} bg="var(--mantine-color-gray-0)" style={{ borderBottom: BORDER_STYLE_GRAY_3 }}>
                <Group gap="sm">
                  <IconCode size={isMobile() ? ICON_SIZE.LG : ICON_SIZE.XL} color="var(--mantine-color-gray-6)" />
                  <Text size={isMobile() ? "md" : "lg"} fw={600} c="var(--mantine-color-gray-9)">
                    Raw JSON Data
                  </Text>
                </Group>
              </Paper>
              <Paper p={isMobile() ? "sm" : "xl"} bg="var(--mantine-color-gray-1)" style={{ overflow: 'auto' }}>
                <Text
                  component="pre"
                  size={isMobile() ? "xs" : "sm"}
                  c="var(--mantine-color-gray-9)"
                  ff="monospace"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: isMobile() ? '400px' : 'none',
                    overflow: isMobile() ? 'auto' : 'visible'
                  }}
                >
                  {JSON.stringify(data, null, 2)}
                </Text>
              </Paper>
            </Paper>
          ) : (
            <>
              {/* Stacked layout for entity data sections */}
              <EntityDataDisplay data={data} />
              {/* Relationship sections in dedicated row */}
              {children}
            </>
          )}
        </Stack>

        {/* Add to List Modal */}
        <Modal
          opened={showAddToListModal}
          onClose={() => {
            setShowAddToListModal(false);
            setMobileActionsOpen(false);
          }}
          title="Add to Catalogue"
          size={isMobile() ? "sm" : "md"}
          fullScreen={isMobile()}
        >
          <AddToListModal
            entityType={entityType}
            entityId={entityId}
            entityDisplayName={displayName}
            onClose={() => {
              setShowAddToListModal(false);
              setMobileActionsOpen(false);
            }}
          />
        </Modal>

        {/* Mobile Sticky Bottom Action Bar */}
        {isMobile() && (
          <Affix position={{ bottom: 0, left: 0, right: 0 }}>
            <Paper
              p="sm"
              shadow="lg"
              style={{
                borderTop: '1px solid var(--mantine-color-gray-3)',
                borderRadius: 0,
                backgroundColor: 'var(--mantine-color-body)',
              }}
            >
              <Group justify="space-around" gap="xs">
                <Tooltip label="Add to list" position="top">
                  <ActionIcon
                    size="lg"
                    variant="light"
                    color="green"
                    onClick={() => setShowAddToListModal(true)}
                    aria-label="Add to catalogue list"
                  >
                    <IconListCheck size={ICON_SIZE.LG} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip
                  label={userInteractions.isBookmarked ? "Remove bookmark" : "Bookmark"}
                  position="top"
                >
                  <ActionIcon
                    size="lg"
                    variant={userInteractions.isBookmarked ? "filled" : "light"}
                    color={userInteractions.isBookmarked ? "yellow" : "gray"}
                    onClick={handleBookmarkToggle}
                    loading={userInteractions.isLoadingBookmarks}
                    aria-label={userInteractions.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                  >
                    {userInteractions.isBookmarked ? (
                      <IconBookmark size={ICON_SIZE.LG} fill="currentColor" />
                    ) : (
                      <IconBookmarkOff size={ICON_SIZE.LG} />
                    )}
                  </ActionIcon>
                </Tooltip>

                {(selectParam || Object.keys(queryBookmarking.currentQueryParams).length > 0) && (
                  <Tooltip
                    label={queryBookmarking.isQueryBookmarked ? "Remove query bookmark" : "Bookmark query"}
                    position="top"
                  >
                    <ActionIcon
                      size="lg"
                      variant={queryBookmarking.isQueryBookmarked ? "filled" : "light"}
                      color={queryBookmarking.isQueryBookmarked ? "blue" : "gray"}
                      onClick={handleQueryBookmarkToggle}
                      aria-label={queryBookmarking.isQueryBookmarked ? "Remove query bookmark" : "Add query bookmark"}
                    >
                      {queryBookmarking.isQueryBookmarked ? (
                        <IconBookmarkFilled size={ICON_SIZE.LG} />
                      ) : (
                        <IconBookmark size={ICON_SIZE.LG} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                )}

                <SegmentedControl
                  size="xs"
                  value={viewMode}
                  onChange={(value) => onViewModeChange(value as DetailViewMode)}
                  data={[
                    { label: 'Rich', value: 'rich' },
                    { label: 'Raw', value: 'raw' },
                  ]}
                />
              </Group>
            </Paper>
          </Affix>
        )}
    </Box>
  );
};
