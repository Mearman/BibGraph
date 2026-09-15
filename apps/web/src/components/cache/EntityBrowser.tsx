import { Badge, Card, Container, Group, SimpleGrid, Text,Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";

/**
 * Entity types for browsing OpenAlex data
 * Each entity type maps to an index route in the application
 */
const ENTITY_TYPES = [
  { key: "works", name: "Works", description: "Research papers, articles, books, and other scholarly outputs", count: "250M+" },
  { key: "authors", name: "Authors", description: "Researchers and scholars who contribute to academic literature", count: "15M+" },
  { key: "institutions", name: "Institutions", description: "Universities, research centers, and academic organizations", count: "200K+" },
  { key: "sources", name: "Sources", description: "Journals, conferences, and other publication venues", count: "250K+" },
  { key: "topics", name: "Topics", description: "Research topics and subject areas", count: "650K+" },
  { key: "concepts", name: "Concepts", description: "Academic concepts and keywords", count: "65K+" },
  { key: "domains", name: "Domains", description: "Broad academic domains and fields", count: "19" },
  { key: "subfields", name: "Subfields", description: "Specialized academic subfields", count: "294" },
  { key: "publishers", name: "Publishers", description: "Academic publishing organizations", count: "45K+" },
  { key: "funders", name: "Funders", description: "Research funding organizations", count: "180K+" },
  { key: "keywords", name: "Keywords", description: "Research keywords and phrases", count: "2M+" },
  { key: "venues", name: "Venues", description: "Conference and workshop venues", count: "150K+" }
] as const;

/**
 * EntityBrowser component
 * Displays a grid of entity type cards for browsing OpenAlex data
 * Each card is clickable and navigates to the corresponding entity index page
 */
export const EntityBrowser = () => {
  const navigate = useNavigate();

  const handleEntityClick = (entityType: string) => {
    // Navigate to the entity index page
    void navigate({ to: `/${entityType}` });
  };

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Entity Browser</Title>

      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
        spacing="md"
        data-testid="browse-grid"
      >
        {ENTITY_TYPES.map((entity) => (
          <Card
            key={entity.key}
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            h="100%"
            component="button"
            onClick={() => { handleEntityClick(entity.key); }}
            style={{ cursor: 'pointer', textAlign: 'left' }}
            data-testid="entity-type-card"
            data-entity-type={entity.key}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="lg">{entity.name}</Text>
              <Badge variant="filled" color="blue">
                {entity.count}
              </Badge>
            </Group>
            <Text size="sm" c="gray.7" lineClamp={3}>
              {entity.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
};