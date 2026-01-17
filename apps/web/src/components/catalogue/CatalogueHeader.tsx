/**
 * CatalogueHeader component
 * Displays the catalogue title, selected list badge, and action buttons
 */

import type { CatalogueList } from "@bibgraph/utils";
import {
  Badge,
  Button,
  Group,
  Menu,
  Title,
} from "@mantine/core";
import {
  IconBook,
  IconBulb,
  IconChevronDown,
  IconGitMerge,
  IconList,
  IconPlus,
  IconShare,
  IconUpload,
} from "@tabler/icons-react";

import { ICON_SIZE } from '@/config/style-constants';

interface CatalogueHeaderProps {
  selectedList: CatalogueList | null;
  onImportClick: () => void;
  onShareClick: () => void;
  onTemplatesClick: () => void;
  onSmartListsClick: () => void;
  onMergeClick: () => void;
  onCreateClick: () => void;
}

export const CatalogueHeader = ({
  selectedList,
  onImportClick,
  onShareClick,
  onTemplatesClick,
  onSmartListsClick,
  onMergeClick,
  onCreateClick,
}: CatalogueHeaderProps) => <Group justify="space-between">
      <Group>
        <IconList size={ICON_SIZE.EMPTY_STATE_SM} />
        <Title order={1}>Catalogue</Title>
        {selectedList && (
          <Badge size="lg" color="blue">
            {selectedList.type === "bibliography" ? "Bibliography" : "List"}
          </Badge>
        )}
      </Group>

      <Group gap="xs">
        <Button
          variant="light"
          leftSection={<IconUpload size={ICON_SIZE.MD} />}
          onClick={onImportClick}
          aria-label="Open import modal to import a catalogue list"
        >
          Import
        </Button>

        <Button
          variant="light"
          leftSection={<IconShare size={ICON_SIZE.MD} />}
          onClick={onShareClick}
          disabled={!selectedList}
          aria-label={selectedList ? "Open share modal to share this list" : "Select a list to enable sharing"}
        >
          Share
        </Button>

        <Menu
          shadow="md"
          width={200}
          position="bottom-end"
        >
          <Menu.Target>
            <Button
              leftSection={<IconPlus size={ICON_SIZE.MD} />}
              rightSection={<IconChevronDown size={16} />}
              aria-label="Create new list or use templates"
            >
              Create New List
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconBook size={14} />}
              onClick={onTemplatesClick}
            >
              Use Templates
            </Menu.Item>
            <Menu.Item
              leftSection={<IconBulb size={14} />}
              onClick={onSmartListsClick}
            >
              Smart Lists
            </Menu.Item>
            <Menu.Item
              leftSection={<IconGitMerge size={14} />}
              onClick={onMergeClick}
            >
              Merge Lists
            </Menu.Item>
            <Menu.Item
              leftSection={<IconPlus size={14} />}
              onClick={onCreateClick}
            >
              Create Custom List
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>;
