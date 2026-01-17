/**
 * CatalogueSearchBar component
 * Provides search input and system catalogues toggle for filtering lists
 */

import {
  Group,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import type { RefObject } from "react";

import { ICON_SIZE } from '@/config/style-constants';

interface CatalogueSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSystemCatalogues: boolean;
  onShowSystemCataloguesChange: (checked: boolean) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export const CatalogueSearchBar = ({
  searchQuery,
  onSearchChange,
  showSystemCatalogues,
  onShowSystemCataloguesChange,
  searchInputRef,
}: CatalogueSearchBarProps) => <Group justify="space-between">
      <Group flex={1}>
        <IconSearch size={ICON_SIZE.MD} />
        <Text fw={500}>Search:</Text>
        <TextInput
          ref={searchInputRef}
          placeholder="Search lists by title, description, or tags..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search catalogue lists"
          aria-describedby="search-help"
          flex={1}
        />
        <Text id="search-help" size="xs" c="dimmed" component="span">
          Press Ctrl+K to focus
        </Text>
      </Group>
      <Switch
        label="Show system catalogues"
        checked={showSystemCatalogues}
        onChange={(e) => onShowSystemCataloguesChange(e.currentTarget.checked)}
        aria-label="Toggle visibility of system catalogues like bookmarks and history"
        data-testid="show-system-catalogues-toggle"
      />
    </Group>;
