/**
 * Search History Dropdown Component
 *
 * Displays search history in a dropdown menu.
 * Shows recent searches with ability to re-run or remove them.
 */

import { ActionIcon, Box, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconClock, IconHistory, IconTrash, IconX } from '@tabler/icons-react';

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { useSearchHistory } from '@/hooks/useSearchHistory';

interface SearchHistoryDropdownProps {
  onSearchQuerySelect: (query: string) => void;
}

const MAX_DISPLAY_ITEMS = 10;

export const SearchHistoryDropdown: React.FC<SearchHistoryDropdownProps> = ({
  onSearchQuerySelect,
}) => {
  const { searchHistory, removeSearchQuery, clearSearchHistory } = useSearchHistory();
  const displayHistory = searchHistory.slice(0, MAX_DISPLAY_ITEMS);

  const handleRemoveQuery = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await removeSearchQuery(id);
  };

  const handleClearAll = async () => {
    await clearSearchHistory();
  };

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <Menu position="bottom-end" shadow="md" width={300} withinPortal>
      <Menu.Target>
        <Tooltip label="Search history" withinPortal>
          <ActionIcon variant="subtle" size="input-lg">
            <IconHistory size={ICON_SIZE.MD} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Stack gap="xs">
          {/* Header */}
          <Group justify="space-between" align="center" px="xs">
            <Group gap="xs" align="center">
              <IconClock size={ICON_SIZE.SM} />
              <Text size="sm" fw={500}>
                Recent Searches
              </Text>
            </Group>

            {searchHistory.length > 0 && (
              <Tooltip label="Clear all history" withinPortal>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={handleClearAll}
                >
                  <IconTrash size={ICON_SIZE.XS} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          {/* History Items */}
          {displayHistory.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No search history yet
            </Text>
          ) : (
            <Stack gap={2}>
              {displayHistory.map((entry) => (
                <UnstyledButton
                  key={entry.id}
                  onClick={() => onSearchQuerySelect(entry.query)}
                  py="xs"
                  px="sm"
                  style={{
                    borderRadius: '4px',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Text
                      size="sm"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {entry.query}
                    </Text>

                    <ActionIcon
                      variant="transparent"
                      color="gray"
                      size="xs"
                      onClick={(e) => void handleRemoveQuery(entry.id, e)}
                    >
                      <IconX size={ICON_SIZE.XS} />
                    </ActionIcon>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          )}

          {/* Footer */}
          {searchHistory.length > MAX_DISPLAY_ITEMS && (
            <Text size="xs" c="dimmed" ta="center" py="xs">
              Showing {MAX_DISPLAY_ITEMS} of {searchHistory.length} searches
            </Text>
          )}
        </Stack>
      </Menu.Dropdown>
    </Menu>
  );
};
