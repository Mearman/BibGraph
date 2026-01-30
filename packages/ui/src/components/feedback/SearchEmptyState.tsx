import { Alert, Badge,Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconBook, IconBrain, IconFlask, IconHeart,IconMicroscope, IconTrendingUp } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface SearchEmptyStateProps {
  variant: "initial" | "no-results";
  query?: string;
  onQuickSearch?: (query: string) => void;
  className?: string;
}

interface QuickSearchItem {
  query: string;
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  category: string;
}

const QUICK_SEARCHES: QuickSearchItem[] = [
  {
    query: "machine learning",
    label: "Machine Learning",
    description: "AI algorithms and neural networks",
    icon: <IconBrain size={16} />,
    color: "blue",
    category: "Technology"
  },
  {
    query: "COVID-19 vaccine",
    label: "COVID-19 Research",
    description: "Pandemic response and vaccinology",
    icon: <IconFlask size={16} />,
    color: "red",
    category: "Health"
  },
  {
    query: "climate change",
    label: "Climate Science",
    description: "Global warming and environmental impact",
    icon: <IconTrendingUp size={16} />,
    color: "green",
    category: "Environment"
  },
  {
    query: "quantum computing",
    label: "Quantum Computing",
    description: "Quantum mechanics and computing theory",
    icon: <IconMicroscope size={16} />,
    color: "purple",
    category: "Physics"
  },
  {
    query: "cancer immunotherapy",
    label: "Cancer Research",
    description: "Oncology and immune system treatments",
    icon: <IconHeart size={16} />,
    color: "pink",
    category: "Medicine"
  },
  {
    query: "Shakespeare",
    label: "Literature",
    description: "Literary analysis and classical works",
    icon: <IconBook size={16} />,
    color: "yellow",
    category: "Humanities"
  }
];

const SEARCH_TIPS = [
  "Use quotes for exact phrases: \"machine learning\"",
  "Combine terms: AI AND healthcare",
  "Exclude terms: climate -change",
  "Search by entity type: authors:Smith",
  "Use wildcards: neural* networks",
  "Filter by year: published:>2020"
];

export const SearchEmptyState = ({
  variant,
  query,
  onQuickSearch,
  className
}: SearchEmptyStateProps) => {
  const handleQuickSearch = (searchQuery: string) => {
    if (onQuickSearch) {
      onQuickSearch(searchQuery);
    }
  };

  // Helper function to handle category item clicks
  const handleCategoryItemClick = (itemQuery: string) => {
    handleQuickSearch(itemQuery);
  };

  // Helper function to render category items
  const renderCategoryItems = (items: typeof QUICK_SEARCHES[0][]) => {
    return items.map((item) => (
      <Button
        key={item.query}
        variant="subtle"
        size="xs"
        fullWidth
        onClick={handleCategoryItemClick.bind(null, item.query)}
      >
        {item.label}
      </Button>
    ));
  };

  const renderQuickSearchButtons = () => (
    <Stack gap="sm">
      <Text size="sm" fw={600} c="dimmed">Popular Searches</Text>
      <Group gap="xs" wrap="wrap">
        {QUICK_SEARCHES.map((item) => (
          <Button
            key={item.query}
            variant="light"
            color={item.color}
            size="sm"
            leftSection={item.icon}
            onClick={() => handleQuickSearch(item.query)}
            style={{ flex: '0 0 auto' }}
          >
            {item.label}
          </Button>
        ))}
      </Group>
    </Stack>
  );

  const renderSearchCategories = () => {
    const categories = QUICK_SEARCHES.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, QuickSearchItem[]>);

    return (
      <Stack gap="md">
        <Text size="sm" fw={600} c="dimmed">Browse by Category</Text>
        <Group gap="md" wrap="nowrap">
          {Object.entries(categories).map(([category, items]) => (
            <Card key={category} p="sm" radius="md" withBorder style={{ minWidth: '120px', flex: '1' }}>
              <Stack gap="xs" align="center">
                <Badge size="xs" variant="light" color={items[0]?.color}>
                  {category}
                </Badge>
                {renderCategoryItems(items)}
              </Stack>
            </Card>
          ))}
        </Group>
      </Stack>
    );
  };

  const renderSearchTips = () => (
    <Card p="md" radius="md" bg="var(--mantine-color-blue-0)" style={{ border: '1px solid var(--mantine-color-blue-2)' }}>
      <Stack gap="sm">
        <Text size="sm" fw={600} c="blue">
          Pro Search Tips
        </Text>
        {SEARCH_TIPS.slice(0, 3).map((tip, index) => (
          <Text key={index} size="xs" c="var(--mantine-color-blue-8)">
            • {tip}
          </Text>
        ))}
        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
          More tips available in the search interface help
        </Text>
      </Stack>
    </Card>
  );

  if (variant === "no-results" && query) {
    return (
      <Alert
        icon={<IconBook size={16} />}
        title="No results found"
        color="yellow"
        variant="light"
        className={className}
        data-testid="no-results"
      >
        <Stack gap="md">
          <Text size="sm">
            No entities found for &quot;<strong>{query}</strong>&quot;.
            Try different search terms or explore these suggestions:
          </Text>

          {renderQuickSearchButtons()}

          <Group gap="sm" mt="sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSearch('')}
            >
              Clear Search
            </Button>
          </Group>
        </Stack>
      </Alert>
    );
  }

  return (
    <Card style={{ border: '1px solid var(--mantine-color-gray-3)' }} className={className}>
      <Stack align="center" py="xl" gap="lg">
        <Stack align="center" gap="sm">
          <Title order={3} size="h2" ta="center">
            Explore Academic Literature
          </Title>
          <Text size="lg" c="dimmed" ta="center">
            Search across millions of works, authors, and institutions
          </Text>
        </Stack>

        {renderSearchCategories()}

        <Stack gap="sm" w="100%">
          <Text size="sm" fw={500} c="dimmed" ta="center">
            Or try these popular searches:
          </Text>
          {renderQuickSearchButtons()}
        </Stack>

        {renderSearchTips()}

        <Text size="xs" c="dimmed" ta="center" mt="md">
          Start typing in the search box above or click any suggestion to begin exploring
        </Text>
      </Stack>
    </Card>
  );
};