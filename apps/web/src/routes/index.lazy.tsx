import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBrandReact,
  IconDatabase,
  IconGraph,
  IconSearch,
} from "@tabler/icons-react";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useThemeColors } from "@/hooks/use-theme-colors";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  // Set home page title
  useDocumentTitle(null); // This will use the default base title "BibGraph"

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Navigate to search page with search query
    navigate({
      to: "/search",
      search: { q: searchQuery.trim(), filter: undefined, search: undefined },
    });
  };

  const handleExampleSearch = (query: string) => {
    // Navigate to search page with example query
    navigate({
      to: "/search",
      search: { q: query, filter: undefined, search: undefined },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        padding: "clamp(0.5rem, 2vw, 2rem)",
        boxSizing: "border-box",
      }}
    >
      <Card
        shadow="xl"
        padding="xl"
        radius="lg"
        style={{
          backgroundColor: colors.background.blur,
          backdropFilter: "blur(10px)",
          maxWidth: "min(600px, 100%)",
          width: "100%",
        }}
      >
        <Stack gap="xl" align="center">
        <Group gap="md">
          <IconGraph size={ICON_SIZE.HERO} color={colors.primary} />
          <Title order={1} ta="center">
            BibGraph
          </Title>
        </Group>

        <Text ta="center" size="lg" c="dimmed" style={{ lineHeight: 1.6, maxWidth: "100%" }}>
          Explore academic literature through interactive knowledge graphs.
          Search for papers, authors, journals, and institutions to see their
          connections.
        </Text>

        {/* Quick Search */}
        <form
          onSubmit={handleSearch}
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          <Stack gap="sm">
            <TextInput
              size="lg"
              placeholder="Search papers, authors, DOIs, ORCIDs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              leftSection={<IconSearch size={ICON_SIZE.XL} />}
              aria-label="Search academic literature"
              styles={{
                input: {
                  minHeight: "44px",
                },
              }}
            />
            <Button
              type="submit"
              size="lg"
              disabled={!searchQuery.trim()}
              fullWidth
              style={{
                minHeight: "44px",
              }}
            >
              Search & Visualize
            </Button>
          </Stack>
        </form>

        {/* Example Searches */}
        <Card padding="md" radius="md" style={{ width: "100%", marginTop: "0.5rem" }}>
          <Text size="sm" fw={500} mb="sm">
            Try these examples:
          </Text>
          <Stack gap="xs">
            <Group gap="sm" wrap="wrap">
              <UnstyledButton
                onClick={() => handleExampleSearch("machine learning")}
                aria-label="Search for machine learning papers"
                style={{
                  fontSize: "var(--mantine-font-size-sm)",
                  color: "var(--mantine-color-anchor)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                machine learning
              </UnstyledButton>
              <Text size="sm" c="dimmed" aria-hidden="true">
                •
              </Text>
              <UnstyledButton
                onClick={() => handleExampleSearch("climate change")}
                aria-label="Search for climate change papers"
                style={{
                  fontSize: "var(--mantine-font-size-sm)",
                  color: "var(--mantine-color-anchor)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                climate change
              </UnstyledButton>
              <Text size="sm" c="dimmed" aria-hidden="true">
                •
              </Text>
              <UnstyledButton
                onClick={() => handleExampleSearch("0000-0003-1613-5981")}
                aria-label="Search for author by ORCID example"
                style={{
                  fontSize: "var(--mantine-font-size-sm)",
                  color: "var(--mantine-color-anchor)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                ORCID example
              </UnstyledButton>
            </Group>
          </Stack>
        </Card>

        {/* Features */}
        <Stack gap="md" align="center" style={{ width: "100%" }} mt="lg">
          <Group gap="lg" justify="center" wrap="wrap">
            <Group gap="xs">
              <IconBrandReact size={ICON_SIZE.MD} color={colors.primary} />
              <Text size="xs" c="dimmed">
                React 19
              </Text>
            </Group>
            <Group gap="xs">
              <IconDatabase size={ICON_SIZE.MD} color={colors.success} />
              <Text size="xs" c="dimmed">
                OpenAlex API
              </Text>
            </Group>
            <Group gap="xs">
              <IconGraph size={ICON_SIZE.MD} color={colors.entity.source} />
              <Text size="xs" c="dimmed">
                XYFlow
              </Text>
            </Group>
          </Group>

          <Text size="xs" ta="center" c="dimmed" style={{ lineHeight: 1.7, maxWidth: "90%" }}>
            Use the sidebar to search and filter • Click nodes to navigate •
            Double-click to expand relationships
          </Text>
        </Stack>
      </Stack>
    </Card>
    </div>
  );
};

export const Route = createLazyFileRoute("/")({
  component: HomePage,
});

export default HomePage;
