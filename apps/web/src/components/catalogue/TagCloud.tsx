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

interface TagCloudProperties {
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
Full range of hues on the HSL colour wheel, used to spread hash-generated tag colours evenly around it.
 */
const HUE_DEGREES = 360;

/**
Tag usage count above which a tag badge is rendered at "large" size in the tag cloud.
 */
const LARGE_TAG_COUNT_THRESHOLD = 5;

/**
The smallest font size (in rem) a tag cloud badge can render at, for a tag used only once.
 */
const MIN_TAG_FONT_SIZE_REM = 0.75;

/**
How much larger (in rem) the most-used tag's badge can grow relative to {@link MIN_TAG_FONT_SIZE_REM}.
 */
const TAG_FONT_SIZE_RANGE_REM = 0.5;

/**
 * Sum the Unicode code points of a string's characters, as a cheap, deterministic hash. A plain `for...of` loop (rather than spreading or `Array.from`-ing the string into an array first) keeps this Unicode-code-point-aware without tripping the project's spread-on-string and prefer-spread lint rules against each other.
 * @param value - The string to hash
 * @returns The summed code point value
 */
const hashTag = (value: string): number => {
  let hash = 0;
  for (const char of value) {
    hash += char.codePointAt(0) ?? 0;
  }
  return hash;
};

/**
 * Extract all unique tags from lists and count their usage
 * @param lists - The catalogue lists to extract tags from
 * @returns Array of tag info with counts and colors
 */
const extractTagInfo = (lists: readonly CatalogueList[]): TagInfo[] => {
  const tagMap = new Map<string, number>();

  for (const list of lists) {
    if (list.tags) {
      for (const tag of list.tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
      }
    }
  }

  const tags: TagInfo[] = [];
  for (const [tag, count] of tagMap) {
    // Generate a consistent color based on tag name
    const hue = hashTag(tag) % HUE_DEGREES;
    const color = `hsl(${String(hue)}, 70%, 50%)`;

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
  const hash = hashTag(tag);
  const colors = ['blue', 'grape', 'pink', 'red', 'orange', 'yellow', 'green', 'cyan', 'indigo'];
  return colors[hash % colors.length];
};

export const TagCloud = ({ lists, selectedTags, onToggleTag, onClearTags }: TagCloudProperties) => {
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
        <Group justify="space-between" onClick={() => { setExpanded(!expanded); }} style={{ cursor: 'pointer' }}>
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

        <Collapse expanded={expanded}>
          <Stack gap="sm">
            {/* Search */}
            <TextInput
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
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
                    onClick={() => { onToggleTag(tag); }}
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
                {filteredTags.map((info) => (
                  <Tooltip
                    key={info.tag}
                    label={`${String(info.count)} list${info.count === 1 ? '' : 's'}`}
                  >
                    <Badge
                      size={info.count > LARGE_TAG_COUNT_THRESHOLD ? 'lg' : info.count > 2 ? 'md' : 'sm'}
                      color={selectedTags.has(info.tag) ? getTagColor(info.tag) : 'gray'}
                      variant={selectedTags.has(info.tag) ? 'filled' : 'light'}
                      style={{
                        cursor: 'pointer',
                        fontSize: `${String(MIN_TAG_FONT_SIZE_REM + (info.count / maxCount) * TAG_FONT_SIZE_RANGE_REM)}rem`,
                      }}
                      onClick={() => { onToggleTag(info.tag); }}
                    >
                      {info.tag}
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
