import { Alert, Center, Group, Paper, Stack, Tabs, Text, Title } from "@mantine/core";
import {
  IconBookmark,
  IconCode,
  IconDatabase,
  IconEye,
  IconInfoCircle,
  IconSearch,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback,useState } from "react";

import { SearchInterface } from "./SearchInterface";

interface SearchFilters {
  query: string;
}

interface UnifiedSearchProps {
  defaultTab?: string;
}

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  description: string;
  createdAt: Date;
  usageCount: number;
}

export const UnifiedSearch = ({ defaultTab = "basic" }: UnifiedSearchProps) => {
  const [activeTab, setActiveTab] = useState<string | null>(defaultTab);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedQueries] = useState<SavedQuery[]>([
    {
      id: "1",
      name: "Machine Learning Papers",
      query: "machine learning neural networks deep learning",
      description: "Recent ML research papers",
      createdAt: new Date(Date.now() - 86400000),
      usageCount: 24,
    },
    {
      id: "2",
      name: "Climate Change Research",
      query: "climate change global warming environmental science",
      description: "Climate science and environmental research",
      createdAt: new Date(Date.now() - 172800000),
      usageCount: 18,
    },
    {
      id: "3",
      name: "COVID-19 Studies",
      query: "coronavirus covid-19 pandemic sars-cov-2",
      description: "COVID-19 research and studies",
      createdAt: new Date(Date.now() - 259200000),
      usageCount: 42,
    },
  ]);
  const navigate = useNavigate();

  const handleSearch = useCallback((filters: SearchFilters) => {
    if (filters.query.trim()) {
      // Add to search history (avoid duplicates)
      setSearchHistory(prev => {
        const filtered = prev.filter(q => q !== filters.query.trim());
        return [filters.query.trim(), ...filtered].slice(0, 10); // Keep last 10 searches
      });

      // Navigate to search results
      navigate({
        to: "/search",
        search: { q: filters.query, filter: undefined, search: undefined },
      });
    }
  }, [navigate]);

  const handleSavedQueryClick = useCallback((query: string) => {
    handleSearch({ query });
  }, [handleSearch]);

  const handleHistoryClick = useCallback((query: string) => {
    handleSearch({ query });
  }, [handleSearch]);

  return (
    <Paper p="md">
      <Stack gap="md">
        <Title order={2}>Academic Search</Title>

        <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="basic" leftSection={<IconSearch size={16} />}>
              Basic Search
            </Tabs.Tab>
            <Tabs.Tab value="advanced" leftSection={<IconCode size={16} />}>
              Advanced Query Builder
            </Tabs.Tab>
            <Tabs.Tab value="visual" leftSection={<IconEye size={16} />}>
              Visual Builder
            </Tabs.Tab>
            <Tabs.Tab value="saved" leftSection={<IconBookmark size={16} />}>
              Saved Queries
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="basic" pt="md">
            <Stack gap="lg">
              <SearchInterface
                onSearch={handleSearch}
                placeholder="Search academic works, authors, institutions..."
                showHelp={true}
                showAdvancedFilters={true}
              />

              {/* Recent Searches */}
              {searchHistory.length > 0 && (
                <Stack gap="sm">
                  <Text size="sm" fw={500} c="dimmed">
                    Recent Searches
                  </Text>
                  <Stack gap="xs">
                    {searchHistory.slice(0, 5).map((query, index) => (
                      <Text
                        key={index}
                        size="sm"
                        style={{ cursor: "pointer", padding: "4px 8px", textDecoration: "underline" }}
                        onClick={() => handleHistoryClick(query)}
                        c="blue"
                      >
                        {query}
                      </Text>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="advanced" pt="md">
            <Stack gap="lg">
              <Alert icon={<IconInfoCircle />} color="blue" variant="light">
                <Text size="sm">
                  <strong>Advanced Query Builder</strong> - Coming Soon! Build complex queries using OpenAlex field filters and operators.
                </Text>
              </Alert>

              <Center p="xl">
                <Stack align="center" gap="sm">
                  <IconCode
                    size={48}
                    stroke={1.5}
                    color="var(--mantine-color-gray-6)"
                  />
                  <Text size="lg" fw={500}>
                    Advanced Query Builder
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Complex query builder with field-specific filters, operators,
                    and logic. Will support OpenAlex query syntax with visual
                    assistance.
                  </Text>
                </Stack>
              </Center>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="visual" pt="md">
            <Stack gap="lg">
              <Alert icon={<IconInfoCircle />} color="green" variant="light">
                <Text size="sm">
                  <strong>Visual Builder</strong> - Coming Soon! Build queries using our intuitive drag-and-drop interface.
                </Text>
              </Alert>

              <Center p="xl">
                <Stack align="center" gap="sm">
                  <IconEye
                    size={48}
                    stroke={1.5}
                    color="var(--mantine-color-gray-6)"
                  />
                  <Text size="lg" fw={500}>
                    Visual Builder
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Drag-and-drop interface for building complex queries visually.
                    Will provide a node-based editor for query construction.
                  </Text>
                </Stack>
              </Center>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="saved" pt="md">
            <Stack gap="md">
              <Text size="lg" fw={500}>
                Saved Queries
              </Text>
              <Text size="sm" c="dimmed">
                Click on any saved query to run it instantly
              </Text>

              <Stack gap="sm">
                {savedQueries.map((savedQuery) => (
                  <Paper
                    key={savedQuery.id}
                    p="md"
                    withBorder
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSavedQueryClick(savedQuery.query)}
                  >
                    <Group justify="space-between" align="center">
                      <Stack gap="xs">
                        <Text size="sm" fw={500}>
                          {savedQuery.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {savedQuery.description}
                        </Text>
                        <Text size="xs" c="blue">
                          "{savedQuery.query}"
                        </Text>
                      </Stack>
                      <Stack gap="xs" align="end">
                        <Group gap="xs">
                          <IconDatabase size={14} color="var(--mantine-color-gray-5)" />
                          <Text size="xs" c="dimmed">
                            {savedQuery.usageCount} uses
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {new Date(savedQuery.createdAt).toLocaleDateString()}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  );
};
