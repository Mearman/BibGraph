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

const textTopicsSearchSchema = z.object({
  title: z.string().optional().catch(undefined),
  abstract: z.string().optional().catch(undefined),
});


const TextTopicsRoute = () => {
  const urlSearch = useSearch({ from: "/text/topics/" });
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
    data: topics = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["text", "topics", title],
    queryFn: async () => {
      if (!title.trim()) return [];

      logger.debug("text", "Extracting topics from title", { title });

      const extractedtopics = await cachedOpenAlex.client.textAnalysis.getTopics({
        title,
      });

      logger.debug("text", "Topics extracted", {
        count: extractedtopics.length,
      });

      return extractedtopics;
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
      ? `#/text/topics?${parameters.toString()}`
      : "#/text/topics";
    window.history.replaceState(null, "", newHash);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Text Analysis - Topics</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Extract topics from academic text using OpenAlex text analysis
          </Text>
        </div>

        <Textarea
          label="Title or Text"
          placeholder="Enter a research title or abstract to extract topics..."
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
                Paste a research title or abstract to extract topics
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

        {!isLoading && topics.length === 0 && title.trim() && (
          <Alert
            icon={<IconInfoCircle />}
            title="No topics found"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No topics could be extracted from the provided text. Try a longer
              or more specific text.
            </Text>
          </Alert>
        )}

        {topics.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Found {topics.length} topic{topics.length === 1 ? "" : "s"}
            </Text>
            {topics.map((topic) => (
              <Card key={topic.id} style={{ border: BORDER_STYLE_GRAY_3 }} padding="md" shadow="sm">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      href={`#/topics/${topic.id.replace("https://openalex.org/", "")}`}
                      fw={500}
                      size="md"
                    >
                      {topic.display_name}
                    </Anchor>
                    <Badge size="sm" variant="light" color="violet">
                      Score: {topic.score.toFixed(2)}
                    </Badge>
                  </Group>

                  {(topic.subfield !== undefined || topic.field !== undefined) && (
                    <Group gap="md">
                      {topic.subfield !== undefined && (
                        <Text size="xs" c="dimmed">
                          Subfield: {topic.subfield.display_name}
                        </Text>
                      )}
                      {topic.field !== undefined && (
                        <Text size="xs" c="dimmed">
                          Field: {topic.field.display_name}
                        </Text>
                      )}
                    </Group>
                  )}

                  <Text
                    size="xs"
                    c="dimmed"
                    style={{ fontFamily: "monospace" }}
                  >
                    {topic.id}
                  </Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
};

export const Route = createFileRoute("/text/topics/")({
  component: TextTopicsRoute,
  validateSearch: textTopicsSearchSchema,
});
