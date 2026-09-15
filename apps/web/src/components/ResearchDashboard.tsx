/**
 * Research Dashboard - Quick access to common academic research tasks
 * Provides a central hub for researchers to manage their research workflow
 */

import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  List,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBook,
  IconBuilding,
  IconBulb,
  IconChartBar,
  IconClock,
  IconDatabase,
  IconDownload,
  IconExternalLink,
  IconFilter,
  IconNews,
  IconRefresh,
  IconSearch,
  IconShare,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect,useState } from "react";

// Number of most-recent activity entries shown in the Recent Activity list.
const RECENT_ACTIVITY_DISPLAY_COUNT = 5;

// Units for converting the mock recent-activity timestamps below into offsets from now.
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;
const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;
const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY;
const RECENT_SEARCH_MINUTES_AGO = 30;
const RECENT_BOOKMARK_HOURS_AGO = 2;

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";
import { useCatalogue } from "@/hooks/useCatalogue";


interface QuickSearchProperties {
  onSearch: (query: string, entityType: string) => void;
}

const QuickSearch = ({ onSearch }: QuickSearchProperties) => {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("works");

  const handleSearch = () => {
    if (!query.trim()) {
    	return;
    }

    onSearch(query.trim(), entityType);
    logger.debug("dashboard", "Quick search initiated", { query, entityType });
  };

  return (
    <Card padding="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Title order={4} mb="md">Quick Search</Title>
      <Group gap="sm">
        <Select
          value={entityType}
          onChange={(value) => { setEntityType(value !== null && value !== "" ? value : "works"); }}
          data={[
            { value: "works", label: "Works" },
            { value: "authors", label: "Authors" },
            { value: "venues", label: "Venues" },
            { value: "institutions", label: "Institutions" },
            { value: "concepts", label: "Concepts" },
          ]}
          w={120}
        />
        <TextInput
          placeholder="Search academic literature..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          style={{ flex: 1 }}
        />
        <ActionIcon size="lg" onClick={handleSearch} color="blue" aria-label="Search">
          <IconSearch size={ICON_SIZE.LG} />
        </ActionIcon>
      </Group>
    </Card>
  );
};

interface RecentActivityProperties {
  activities: {
    id: string;
    type: string;
    description: string;
    timestamp: Date;
  }[];
}

const RecentActivity = ({ activities }: RecentActivityProperties) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "search":
        return <IconSearch size={ICON_SIZE.MD} />;
      case "bookmark":
        return <IconBook size={ICON_SIZE.MD} />;
      case "export":
        return <IconDownload size={ICON_SIZE.MD} />;
      case "share":
        return <IconShare size={ICON_SIZE.MD} />;
      default:
        return <IconClock size={ICON_SIZE.MD} />;
    }
  };

  return (
    <Card padding="md" style={{ border: BORDER_STYLE_GRAY_3 }} h="100%">
      <Title order={4} mb="md">Recent Activity</Title>
      <List spacing="sm" size="sm">
        {activities.slice(0, RECENT_ACTIVITY_DISPLAY_COUNT).map((activity) => (
          <List.Item
            key={activity.id}
            icon={
              <ThemeIcon color="blue" size={24} radius="xl">
                {getActivityIcon(activity.type)}
              </ThemeIcon>
            }
          >
            <div>
              <Text size="sm">{activity.description}</Text>
              <Text size="xs" c="dimmed">
                {activity.timestamp.toLocaleString()}
              </Text>
            </div>
          </List.Item>
        ))}
        {activities.length === 0 && (
          <Text c="dimmed" size="sm">
            No recent activity
          </Text>
        )}
      </List>
    </Card>
  );
};

interface QuickActionsProperties {
  onAction: (action: string) => void;
}

const QuickActions = ({ onAction }: QuickActionsProperties) => {
  const actions = [
    {
      id: "advanced-search",
      title: "Advanced Search",
      description: "Complex queries with filters",
      icon: <IconFilter size={ICON_SIZE.XXL} />,
      color: "blue" as const,
    },
    {
      id: "create-list",
      title: "Create List",
      description: "Start a new bibliography",
      icon: <IconBook size={ICON_SIZE.XXL} />,
      color: "green" as const,
    },
    {
      id: "analyze-trends",
      title: "Analyze Trends",
      description: "Research trend analysis",
      icon: <IconTrendingUp size={ICON_SIZE.XXL} />,
      color: "orange" as const,
    },
    {
      id: "export-data",
      title: "Export Data",
      description: "Download in various formats",
      icon: <IconDownload size={ICON_SIZE.XXL} />,
      color: "violet" as const,
    },
    {
      id: "compare-entities",
      title: "Compare Entities",
      description: "Side-by-side comparison",
      icon: <IconChartBar size={ICON_SIZE.XXL} />,
      color: "cyan" as const,
    },
    {
      id: "discover-papers",
      title: "Discover Papers",
      description: "AI-powered recommendations",
      icon: <IconBulb size={ICON_SIZE.XXL} />,
      color: "yellow" as const,
    },
  ];

  return (
    <Card padding="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Title order={4} mb="md">Quick Actions</Title>
      <SimpleGrid cols={3} spacing="md">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="light"
            color={action.color}
            onClick={() => { onAction(action.id); }}
            h="auto"
            p="md"
          >
            <Stack gap="xs" align="center">
              {action.icon}
              <Text size="xs" fw={500} ta="center">
                {action.title}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {action.description}
              </Text>
            </Stack>
          </Button>
        ))}
      </SimpleGrid>
    </Card>
  );
};

interface ResearchStatsProperties {
  stats: {
    totalSearches: number;
    savedItems: number;
    exportedLists: number;
    sharedItems: number;
  };
}

const ResearchStats = ({ stats }: ResearchStatsProperties) => {
  const statCards = [
    {
      label: "Total Searches",
      value: stats.totalSearches,
      icon: <IconSearch size={ICON_SIZE.XL} />,
      color: "blue" as const,
    },
    {
      label: "Saved Items",
      value: stats.savedItems,
      icon: <IconBook size={ICON_SIZE.XL} />,
      color: "green" as const,
    },
    {
      label: "Exported Lists",
      value: stats.exportedLists,
      icon: <IconDownload size={ICON_SIZE.XL} />,
      color: "violet" as const,
    },
    {
      label: "Shared Items",
      value: stats.sharedItems,
      icon: <IconShare size={ICON_SIZE.XL} />,
      color: "orange" as const,
    },
  ];

  return (
    <Card padding="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Title order={4} mb="md">Research Statistics</Title>
      <SimpleGrid cols={2} spacing="md">
        {statCards.map((stat) => (
          <div key={stat.label}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                {stat.label}
              </Text>
              <ThemeIcon color={stat.color} size="sm" radius="xl">
                {stat.icon}
              </ThemeIcon>
            </Group>
            <Text size="xl" fw={700}>
              {stat.value.toLocaleString()}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </Card>
  );
};

interface PopularTopicsProperties {
  topics: {
    name: string;
    count: number;
    trend: "up" | "down" | "stable";
  }[];
}

const PopularTopics = ({ topics }: PopularTopicsProperties) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <IconTrendingUp size={ICON_SIZE.SM} color="green" />;
      case "down":
        return <IconTrendingUp size={ICON_SIZE.SM} color="red" style={{ transform: "rotate(180deg)" }} />;
      default:
        return <IconTrendingUp size={ICON_SIZE.SM} color="gray" style={{ transform: "rotate(90deg)" }} />;
    }
  };

  return (
    <Card padding="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Title order={4} mb="md">Popular Research Topics</Title>
      <Stack gap="sm">
        {topics.map((topic, index) => (
          <Group key={topic.name} justify="space-between">
            <Group>
              <Badge variant="light" size="sm">
                {index + 1}
              </Badge>
              <Text size="sm">{topic.name}</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {topic.count.toLocaleString()}
              </Text>
              {getTrendIcon(topic.trend)}
            </Group>
          </Group>
        ))}
      </Stack>
    </Card>
  );
};

export const ResearchDashboard = () => {
  const navigate = useNavigate();
  const { lists } = useCatalogue();

  const [recentActivity] = useState(() => [
    {
      id: "1",
      type: "search",
      description: "Searched for 'machine learning in healthcare'",
      timestamp: new Date(Date.now() - MS_PER_MINUTE * RECENT_SEARCH_MINUTES_AGO),
    },
    {
      id: "2",
      type: "bookmark",
      description: "Added 3 papers to 'AI in Medicine' bibliography",
      timestamp: new Date(Date.now() - MS_PER_HOUR * RECENT_BOOKMARK_HOURS_AGO),
    },
    {
      id: "3",
      type: "export",
      description: "Exported 'Climate Change Research' list as BibTeX",
      timestamp: new Date(Date.now() - MS_PER_DAY),
    },
  ]);

  const [researchStats] = useState({
    totalSearches: 247,
    savedItems: 89,
    exportedLists: 12,
    sharedItems: 5,
  });

  const [popularTopics] = useState<{
    name: string;
    count: number;
    trend: "up" | "down" | "stable";
  }[]>([
    { name: "Machine Learning", count: 15_420, trend: "up" },
    { name: "Climate Change", count: 12_350, trend: "up" },
    { name: "COVID-19 Research", count: 9876, trend: "down" },
    { name: "Quantum Computing", count: 7234, trend: "up" },
    { name: "Renewable Energy", count: 6543, trend: "stable" },
  ]);

  const handleQuickSearch = (query: string, entityType: string) => {
    void navigate({
      to: "/search",
      search: { q: query, filter: entityType, search: undefined },
    });
  };

  const handleQuickAction = (action: string) => {
    logger.debug("dashboard", "Quick action triggered", { action });

    switch (action) {
      case "advanced-search":
        void navigate({ to: "/search", search: { q: "", filter: undefined, search: undefined } });
        break;
      case "create-list":
        // This would open a modal for creating a new list
        notifications.show({
          title: "Create List",
          message: "List creation modal would open here",
          color: "blue",
        });
        break;
      case "analyze-trends":
        notifications.show({
          title: "Feature Coming Soon",
          message: "Trends analysis is under development",
          color: "yellow",
        });
        break;
      case "export-data":
        notifications.show({
          title: "Export Data",
          message: "Export options would appear here",
          color: "blue",
        });
        break;
      case "compare-entities":
        notifications.show({
          title: "Feature Coming Soon",
          message: "Entity comparison is under development",
          color: "yellow",
        });
        break;
      case "discover-papers":
        notifications.show({
          title: "Feature Coming Soon",
          message: "Paper discovery is under development",
          color: "yellow",
        });
        break;
      default:
        notifications.show({
          title: "Feature Coming Soon",
          message: `${action} is under development`,
          color: "yellow",
        });
    }
  };

  useEffect(() => {
    logger.debug("dashboard", "Research dashboard mounted", { listCount: lists.length });
  }, [lists.length]);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Research Dashboard</Title>
            <Text c="dimmed">Your academic research command center</Text>
          </div>
          <Group>
            <ActionIcon variant="light" size="lg" aria-label="Refresh dashboard">
              <IconRefresh size={ICON_SIZE.LG} />
            </ActionIcon>
            <ActionIcon variant="light" size="lg" aria-label="Open in new window">
              <IconExternalLink size={ICON_SIZE.LG} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Alert */}
        <Alert icon={<IconNews size={ICON_SIZE.MD} />} color="blue" variant="light">
          <Text size="sm">
            <strong>New Feature:</strong> Research trends now available! Explore trending topics in your field.
          </Text>
        </Alert>

        {/* Quick Search */}
        <QuickSearch onSearch={handleQuickSearch} />

        {/* Main Grid */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              {/* Quick Actions */}
              <QuickActions onAction={handleQuickAction} />

              {/* Popular Topics */}
              <PopularTopics topics={popularTopics} />
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              {/* Research Stats */}
              <ResearchStats stats={researchStats} />

              {/* Recent Activity */}
              <RecentActivity activities={recentActivity} />

              {/* Quick Links */}
              <Card padding="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
                <Title order={4} mb="md">Quick Links</Title>
                <Stack gap="xs">
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconDatabase size={ICON_SIZE.SM} />}
                    onClick={() => { void navigate({ to: "/catalogue" }); }}
                  >
                    My Bibliographies ({lists.length})
                  </Button>
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconBook size={ICON_SIZE.SM} />}
                    onClick={() => { void navigate({ to: "/history" }); }}
                  >
                    Recent Searches
                  </Button>
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconUsers size={ICON_SIZE.SM} />}
                    onClick={() => { void navigate({ to: "/authors", params: {} }); }}
                  >
                    Top Authors
                  </Button>
                  <Button
                    variant="subtle"
                    fullWidth
                    leftSection={<IconBuilding size={ICON_SIZE.SM} />}
                    onClick={() => { void navigate({ to: "/institutions", params: {} }); }}
                  >
                    Leading Institutions
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};