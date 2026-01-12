/**
 * Featured Collections Component
 *
 * Displays curated collections of academic topics for exploration.
 * Each collection links to a pre-configured search query.
 */

import { Button, Card, Container, SimpleGrid, Stack, Text, Title, useMantineTheme } from '@mantine/core';
import { IconBook, IconBrain, IconBuilding, IconDatabase, IconDeviceDesktop, IconFlask, IconGlobe, IconHistory } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';

interface FeaturedCollection {
  id: string;
  title: string;
  description: string;
  query: string;
  icon: React.ReactNode;
  color: string;
}

const FEATURED_COLLECTIONS: FeaturedCollection[] = [
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    description: 'Explore research on neural networks, deep learning, and AI systems',
    query: 'machine learning',
    icon: <IconBrain size={32} />,
    color: 'blue',
  },
  {
    id: 'cultural-heritage',
    title: 'Cultural Heritage',
    description: 'Digital preservation, citizen science, and heritage engagement',
    query: 'cultural heritage preservation',
    icon: <IconHistory size={32} />,
    color: 'orange',
  },
  {
    id: 'climate-science',
    title: 'Climate Science',
    description: 'Climate change, environmental science, and sustainability research',
    query: 'climate change',
    icon: <IconGlobe size={32} />,
    color: 'green',
  },
  {
    id: 'bioinformatics',
    title: 'Bioinformatics',
    description: 'Computational biology, genomics, and biomedical research',
    query: 'bioinformatics',
    icon: <IconFlask size={32} />,
    color: 'grape',
  },
  {
    id: 'software-engineering',
    title: 'Software Engineering',
    description: 'Software development, programming languages, and systems',
    query: 'software engineering',
    icon: <IconDeviceDesktop size={32} />,
    color: 'cyan',
  },
  {
    id: 'data-science',
    title: 'Data Science',
    description: 'Big data, analytics, visualization, and statistical methods',
    query: 'data science',
    icon: <IconDatabase size={32} />,
    color: 'indigo',
  },
  {
    id: 'academic-institutions',
    title: 'Academic Institutions',
    description: 'Universities, research centers, and academic collaboration',
    query: 'university research',
    icon: <IconBuilding size={32} />,
    color: 'gray',
  },
  {
    id: 'open-science',
    title: 'Open Science',
    description: 'Open access, open data, and reproducible research practices',
    query: 'open science',
    icon: <IconBook size={32} />,
    color: 'teal',
  },
];

export const FeaturedCollections: React.FC = () => {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const handleExploreCollection = (query: string) => {
    navigate({
      to: '/search',
      search: { q: query, filter: undefined, search: undefined },
    });
  };

  return (
    <Container size="xl">
      <Stack gap="lg">
        <div>
          <Title order={3}>Featured Collections</Title>
          <Text c="dimmed">Curated topics to kickstart your exploration</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {FEATURED_COLLECTIONS.map((collection) => (
            <Card
              key={collection.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ borderColor: theme.colors[collection.color][4] }}
              h="100%"
            >
              <Stack gap="md" h="100%">
                <div style={{ color: theme.colors[collection.color][6] }}>
                  {collection.icon}
                </div>

                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text fw={500} size="lg">
                    {collection.title}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {collection.description}
                  </Text>
                </Stack>

                <Button
                  variant="light"
                  color={collection.color}
                  onClick={() => handleExploreCollection(collection.query)}
                  fullWidth
                >
                  Explore
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

