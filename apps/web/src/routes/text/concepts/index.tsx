import { cachedOpenAlex } from "@bibgraph/client";
import { logger } from "@bibgraph/utils";
import {
  Alert,
  Anchor,
  Badge,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";

const textConceptsSearchSchema = z.object({
  title: z.string().optional().catch(undefined),
  abstract: z.string().optional().catch(undefined),
});


const TextConceptsRoute = () => {
  const urlSearch = useSearch({ from: "/text/concepts/" });
  const initialTitle = useMemo(() => urlSearch.title ?? "", [urlSearch.title]);
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (typeof window === "undefined") {
    	return;
    }

    const currentHash = window.location.hash;
    const decodedHash = decodeURIComponent(currentHash);
    if (currentHash !== decodedHash) {
      window.history.replaceState(null, "", decodedHash);
    }
  }, []);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const {
    data: concepts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["text", "concepts", title],
    queryFn: async () => {
      if (!title.trim()) return [];

      logger.debug("text", "Extracting concepts from title", { title });

      const extractedconcepts = await cachedOpenAlex.client.textAnalysis.getConcepts({
        title,
      });

      logger.debug("text", "Concepts extracted", {
        count: extractedconcepts.length,
      });

      return extractedconcepts;
    },
    enabled: title.trim().length > 0,
    staleTime: 60_000,
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const parameters = new URLSearchParams();
    if (value) {
      parameters.set("title", value);
    }
    const newHash = parameters.toString()
      ? `#/text/concepts?${parameters.toString()}`
      : "#/text/concepts";
    window.history.replaceState(null, "", newHash);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Text Analysis - Concepts</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Extract concepts from academic text using OpenAlex text analysis
          </Text>
        </div>

        <Textarea
          label="Title or Text"
          placeholder="Enter a research title or abstract to extract concepts..."
          value={title}
          onChange={(event) => { handleTitleChange(event.currentTarget.value); }}
          minRows={3}
          autosize
        />

        {!title.trim() && (
          <Card style={{ border: BORDER_STYLE_GRAY_3 }}>
            <Stack align="center" py="xl">
              <Text size="lg" fw={500}>
                Enter text to analyze
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Paste a research title or abstract to extract related concepts
              </Text>
            </Stack>
          </Card>
        )}

        {isLoading && title.trim() && (
          <Text ta="center" py="xl">
            Analyzing text...
          </Text>
        )}

        {error && (
          <Alert
            icon={<IconInfoCircle />}
            title="Analysis Error"
            color="red"
            variant="light"
          >
            <Text size="sm">
              {error instanceof Error ? error.message : String(error)}
            </Text>
          </Alert>
        )}

        {!isLoading && concepts.length === 0 && title.trim() && (
          <Alert
            icon={<IconInfoCircle />}
            title="No concepts found"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No concepts could be extracted from the provided text. Try a
              longer or more specific text.
            </Text>
          </Alert>
        )}

        {concepts.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Found {concepts.length} concept{concepts.length === 1 ? "" : "s"}
            </Text>
            {concepts.map((concept) => (
              <Card key={concept.id} style={{ border: BORDER_STYLE_GRAY_3 }} padding="md" shadow="sm">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      href={`#/concepts/${concept.id.replace("https://openalex.org/", "")}`}
                      fw={500}
                      size="md"
                    >
                      {concept.display_name}
                    </Anchor>
                    <Group gap="xs">
                      <Badge size="sm" variant="light" color="blue">
                        Concept
                      </Badge>
                      <Badge size="sm" variant="light" color="gray">
                        Score: {concept.score.toFixed(2)}
                      </Badge>
                    </Group>
                  </Group>

                  <Group gap="md">
                    <Text size="xs" c="dimmed">
                      Level: {concept.level}
                    </Text>
                    {concept.wikidata !== undefined && (
                      <Text size="xs" c="dimmed">
                        Wikidata: {concept.wikidata}
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
};

export const Route = createFileRoute("/text/concepts/")({
  component: TextConceptsRoute,
  validateSearch: textConceptsSearchSchema,
});
