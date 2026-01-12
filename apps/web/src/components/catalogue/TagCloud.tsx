/**
 * Tag Cloud component
 * Visualizes tags across lists and allows filtering by tags
 */

import type { CatalogueList } from "@bibgraph/utils";
import {
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconTag,
  IconX,
} from "@tabler/icons-react";
import { useMemo,useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';

interface TagCloudProps {
  lists: CatalogueList[];
  selectedTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

interface TagInfo {
  tag: string;
  count: number;
  color: string;
}

/**
 * Extract all unique tags from lists and count their usage
 * @param lists - The catalogue lists to extract tags from
 * @returns Array of tag info with counts and colors
 */
const extractTagInfo = (lists: CatalogueList[]): TagInfo[] => {
  const tagMap = new Map<string, number>();

  for (const list of lists) {
    if (list.tags) {
      for (const tag of list.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
  }

  const tags: TagInfo[] = [];
  for (const [tag, count] of tagMap.entries()) {
    // Generate a consistent color based on tag name
    const hash = [...tag].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const color = `hsl(${hue}, 70%, 50%)`;

    tags.push({ tag, count, color });
  }

  return tags.sort((a, b) => b.count - a.count);
};

/**
 * Generate a consistent hash-based color for a tag
 * @param tag - The tag to generate a color for
 * @returns Mantine color name for the tag
 */
const getTagColor = (tag: string): string => {
  const hash = [...tag].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['blue', 'grape', 'pink', 'red', 'orange', 'yellow', 'green', 'cyan', 'indigo'];
  return colors[hash % colors.length];
};

export const TagCloud = ({ lists, selectedTags, onToggleTag, onClearTags }: TagCloudProps) => {
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const tagInfo = useMemo(() => extractTagInfo(lists), [lists]);

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery) return tagInfo;
    const query = searchQuery.toLowerCase();
    return tagInfo.filter((t) => t.tag.toLowerCase().includes(query));
  }, [tagInfo, searchQuery]);

  // Get tag sizes based on frequency
  const maxCount = Math.max(...tagInfo.map((t) => t.count), 1);

  return (
    <Card padding="md" radius="sm" withBorder>
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
          <Group gap="xs">
            <IconTag size={ICON_SIZE.MD} />
            <Text fw={500}>Tags</Text>
            <Badge size="sm" color="blue">
              {tagInfo.length}
            </Badge>
          </Group>
          {expanded ? (
            <IconChevronUp size={ICON_SIZE.SM} />
          ) : (
            <IconChevronDown size={ICON_SIZE.SM} />
          )}
        </Group>

        <Collapse in={expanded}>
          <Stack gap="sm">
            {/* Search */}
            <TextInput
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="xs"
            />

            {/* Selected Tags */}
            {selectedTags.size > 0 && (
              <Group gap="xs" wrap="wrap">
                {[...selectedTags].map((tag) => (
                  <Badge
                    key={tag}
                    size="lg"
                    color={getTagColor(tag)}
                    variant="filled"
                    leftSection={<IconX size={10} />}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onToggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={onClearTags}
                >
                  Clear
                </Button>
              </Group>
            )}

            {/* Tag Cloud */}
            {filteredTags.length > 0 ? (
              <Group gap="xs" wrap="wrap">
                {filteredTags.map((tagInfo) => (
                  <Tooltip
                    key={tagInfo.tag}
                    label={`${tagInfo.count} list${tagInfo.count === 1 ? '' : 's'}`}
                  >
                    <Badge
                      size={tagInfo.count > 5 ? 'lg' : tagInfo.count > 2 ? 'md' : 'sm'}
                      color={selectedTags.has(tagInfo.tag) ? getTagColor(tagInfo.tag) : 'gray'}
                      variant={selectedTags.has(tagInfo.tag) ? 'filled' : 'light'}
                      style={{
                        cursor: 'pointer',
                        fontSize: `${0.75 + (tagInfo.count / maxCount) * 0.5}rem`,
                      }}
                      onClick={() => onToggleTag(tagInfo.tag)}
                    >
                      {tagInfo.tag}
                    </Badge>
                  </Tooltip>
                ))}
              </Group>
            ) : (
              <Text size="sm" c="dimmed" ta="center">
                {searchQuery ? 'No matching tags' : 'No tags found'}
              </Text>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
};
