import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPlus, IconSearch,IconTrash } from "@tabler/icons-react";
import React, { useCallback,useState } from "react";

import { BORDER_STYLE_GRAY_3 } from '@/config/style-constants';

const RANDOM_ID_RADIX = 36;
const RANDOM_ID_SLICE_END = 11;

// Simple ID generator for query terms
const generateId = () =>
  `query-${String(Date.now())}-${Math.random().toString(RANDOM_ID_RADIX).slice(2, RANDOM_ID_SLICE_END)}`;

// TypeScript interfaces for query structure
export interface QueryTerm {
  id: string;
  text: string;
  operator?: "AND" | "OR"; // Optional for first term
}

export interface QueryStructure {
  terms: QueryTerm[];
}

export interface AdvancedQueryBuilderProps {
  onQueryChange?: (query: QueryStructure) => void;
  onSearch?: (query: QueryStructure) => void;
  initialQuery?: QueryStructure;
  placeholder?: string;
  maxTerms?: number;
}

const OPERATOR_OPTIONS = [
  { value: "AND", label: "AND" },
  { value: "OR", label: "OR" },
] as const;

export const AdvancedQueryBuilder: React.FC<AdvancedQueryBuilderProps> = ({
  onQueryChange,
  onSearch,
  initialQuery,
  placeholder = "Enter search term...",
  maxTerms = 10,
}) => {
  const [query, setQuery] = useState<QueryStructure>(() => {
    if (initialQuery && initialQuery.terms.length > 0) {
      return initialQuery;
    }
    return {
      terms: [{ id: generateId(), text: "" }],
    };
  });

  // Update query and notify parent
  const updateQuery = useCallback(
    (newQuery: QueryStructure) => {
      setQuery(newQuery);
      onQueryChange?.(newQuery);
    },
    [onQueryChange],
  );

  // Add a new term
  const addTerm = useCallback(() => {
    if (query.terms.length >= maxTerms) return;

    const newTerm: QueryTerm = {
      id: generateId(),
      text: "",
      operator: "AND", // Default operator for new terms
    };

    const newQuery: QueryStructure = {
      terms: [...query.terms, newTerm],
    };

    updateQuery(newQuery);
  }, [query.terms, maxTerms, updateQuery]);

  // Remove a term by ID
  const removeTerm = useCallback(
    (termId: string) => {
      if (query.terms.length <= 1) return; // Keep at least one term

      const newTerms = query.terms.filter((term) => term.id !== termId);

      // If we removed the first term, remove operator from new first term
      if (newTerms.length > 0 && query.terms[0].id === termId) {
        newTerms[0] = { ...newTerms[0], operator: undefined };
      }

      const newQuery: QueryStructure = { terms: newTerms };
      updateQuery(newQuery);
    },
    [query.terms, updateQuery],
  );

  // Update term text
  const updateTermText = useCallback(
    ({ termId, text }: { termId: string; text: string }) => {
      const newTerms = query.terms.map((term) =>
        term.id === termId ? { ...term, text } : term,
      );
      const newQuery: QueryStructure = { terms: newTerms };
      updateQuery(newQuery);
    },
    [query.terms, updateQuery],
  );

  // Update term operator
  const updateTermOperator = useCallback(
    ({ termId, operator }: { termId: string; operator: QueryTerm["operator"] }) => {
      const newTerms = query.terms.map((term) =>
        term.id === termId ? { ...term, operator } : term,
      );
      const newQuery: QueryStructure = { terms: newTerms };
      updateQuery(newQuery);
    },
    [query.terms, updateQuery],
  );

  // Handle search action
  const handleSearch = useCallback(() => {
    // Filter out empty terms before searching
    const validTerms = query.terms.filter(
      (term) => term.text.trim().length > 0,
    );
    if (validTerms.length === 0) return;

    const searchQuery: QueryStructure = { terms: validTerms };
    onSearch?.(searchQuery);
  }, [query, onSearch]);

  // Check if search is possible
  const canSearch = query.terms.some((term) => term.text.trim().length > 0);

  return (
    <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={500} size="sm">
            Advanced Query Builder
          </Text>
          <Text size="xs" c="dimmed">
            {query.terms.length} / {maxTerms} terms
          </Text>
        </Group>

        <Divider />

        <Stack gap="sm">
          {query.terms.map((term, index) => (
            <Group key={term.id} align="flex-end" wrap="nowrap">
              {/* Operator selector (skip for first term) */}
              {index > 0 && (
                <Select
                  data={OPERATOR_OPTIONS}
                  value={term.operator ?? "AND"}
                  onChange={(value) => {
                    if (value === "AND" || value === "OR") {
                      updateTermOperator({ termId: term.id, operator: value });
                    }
                  }}
                  w={80}
                  size="sm"
                  aria-label={`Operator for term ${String(index + 1)}`}
                />
              )}

              {/* Search term input */}
              <TextInput
                value={term.text}
                onChange={(event) => {
                  updateTermText({
                    termId: term.id,
                    text: event.currentTarget.value,
                  });
                }}
                placeholder={placeholder}
                flex={1}
                size="sm"
                aria-label={`Search term ${String(index + 1)}`}
              />

              {/* Remove button (only show if more than one term) */}
              {query.terms.length > 1 && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => {
                    removeTerm(term.id);
                  }}
                  size="sm"
                  aria-label={`Remove term ${String(index + 1)}`}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}
        </Stack>

        <Group justify="space-between">
          <Button
            variant="subtle"
            leftSection={<IconPlus size={16} />}
            onClick={addTerm}
            disabled={query.terms.length >= maxTerms}
            size="sm"
          >
            Add Term
          </Button>

          <Button
            leftSection={<IconSearch size={16} />}
            onClick={handleSearch}
            disabled={!canSearch}
            size="sm"
          >
            Search
          </Button>
        </Group>

        {/* Query preview */}
        {canSearch && (
          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              Query Preview:
            </Text>
            <Text size="sm" c="blue" ff="monospace">
              {query.terms
                .filter((term) => term.text.trim().length > 0)
                .map((term, index) => {
                  const prefix = index > 0 ? ` ${term.operator ?? "AND"} ` : "";
                  return `${prefix}"${term.text.trim()}"`;
                })
                .join("")}
            </Text>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

