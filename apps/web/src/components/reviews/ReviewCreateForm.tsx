/**
 * Review create form: starts a literature review from search terms, from starting works, or both. Search terms alone is the "we pick starting works" start. Starting works can be pasted (OpenAlex ids or links) or ticked from bookmarked works. A real form, so Enter in the name field submits; each field shows its own error and the first invalid field takes focus. While a start runs the fields lock, the current stage shows and the start can be cancelled. Presentational: validation of the form's own input lives here, everything that touches OpenAlex or storage is the caller's.
 */

import {
  Alert,
  Button,
  Group,
  Pill,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { type RefObject, type SyntheticEvent, useRef, useState } from "react";

import { parseSeedTokens } from "@/lib/reviews/seed-input";

import { BookmarkSeedPicker } from "./BookmarkSeedPicker";

const QUERY_MIN_ROWS = 3;
const SEEDS_MIN_ROWS = 3;

export interface ReviewCreateValues {
  readonly name: string;
  readonly query: string;
  readonly seeds: readonly string[];
}

export interface BookmarkedWork {
  readonly id: string;
  readonly title: string;
}

export interface ReviewCreateFormProps {
  readonly onSubmit: (values: ReviewCreateValues) => void;
  readonly submitting: boolean;
  readonly bookmarkedWorks: readonly BookmarkedWork[];
  /**
   * What the running start is doing, for example "Searching OpenAlex..."; shown while submitting.
   */
  readonly progressLabel?: string | null;
  /**
   * Stops a running start; the cancel button shows only when this is given.
   */
  readonly onCancel?: () => void;
}

interface FieldErrors {
  readonly name?: string;
  readonly query?: string;
  readonly seeds?: string;
}

const validate = (
  name: string,
  query: string,
  seedText: string,
): FieldErrors => {
  const parsed = parseSeedTokens(seedText);
  return {
    ...(name.trim() === "" && { name: "Give the review a name." }),
    ...(query.trim() === "" &&
      parsed.valid.length === 0 &&
      parsed.invalid.length === 0 && {
        query: "Enter search terms, some starting works, or both.",
      }),
    ...(parsed.invalid.length > 0 && {
      seeds: `Not OpenAlex work ids: ${parsed.invalid.join(", ")}. Use ids such as W2741809807 or links such as https://openalex.org/W2741809807.`,
    }),
  };
};

const focusFirstInvalid = (
  errors: FieldErrors,
  refs: Readonly<{
    name: RefObject<HTMLInputElement | null>;
    query: RefObject<HTMLTextAreaElement | null>;
    seeds: RefObject<HTMLTextAreaElement | null>;
  }>,
) => {
  if (errors.name !== undefined) refs.name.current?.focus();
  else if (errors.query !== undefined) refs.query.current?.focus();
  else if (errors.seeds !== undefined) refs.seeds.current?.focus();
};

export const ReviewCreateForm = ({
  onSubmit,
  submitting,
  bookmarkedWorks,
  progressLabel = null,
  onCancel,
}: ReviewCreateFormProps) => {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [seedText, setSeedText] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const seedsRef = useRef<HTMLTextAreaElement>(null);

  const parsed = parseSeedTokens(seedText);
  const titleOf = (id: string): string =>
    bookmarkedWorks.find((work) => work.id === id)?.title ?? id;

  const setSeeds = (ids: readonly string[], invalid: readonly string[]) => {
    setSeedText([...ids, ...invalid].join("\n"));
    setErrors((current) => ({
      ...current,
      seeds: undefined,
      query: undefined,
    }));
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (submitting) return;
    const found = validate(name, query, seedText);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(found, {
        name: nameRef,
        query: queryRef,
        seeds: seedsRef,
      });
      return;
    }
    onSubmit({ name: name.trim(), query: query.trim(), seeds: parsed.valid });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <TextInput
          ref={nameRef}
          label="Review name"
          withAsterisk
          placeholder="Gut microbiome and malaria"
          disabled={submitting}
          error={errors.name}
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
        />
        <Text size="sm" c="dimmed">
          Start from search terms, from works you already know are relevant, or
          both. Fill in at least one of the next two boxes.
        </Text>
        <Stack gap={2}>
          <Text size="sm">
            Search only: we pick starting works from the results.
          </Text>
          <Text size="sm">Starting works only: we explore around them.</Text>
          <Text size="sm">
            Both: the search defines the set of works to screen.
          </Text>
        </Stack>
        <Textarea
          ref={queryRef}
          label="Search terms"
          description='Searches titles, abstracts and full text on OpenAlex. Combine terms with the capital words AND, OR and NOT, put an exact phrase in "double quotes" and group with brackets, for example: malaria AND (gut OR intestinal). The characters * ? and ~ are ignored.'
          minRows={QUERY_MIN_ROWS}
          disabled={submitting}
          error={errors.query}
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setErrors((current) => ({ ...current, query: undefined }));
          }}
        />
        <Textarea
          ref={seedsRef}
          label="Starting works"
          description="Works you know are relevant: OpenAlex ids or links, one per line or separated by commas."
          minRows={SEEDS_MIN_ROWS}
          disabled={submitting}
          error={errors.seeds}
          value={seedText}
          onChange={(event) => {
            setSeedText(event.currentTarget.value);
            setErrors((current) => ({
              ...current,
              seeds: undefined,
              query: undefined,
            }));
          }}
        />
        {(parsed.valid.length > 0 || parsed.invalid.length > 0) && (
          <Stack gap={4}>
            <Text
              size="sm"
              fw={500}
            >{`${String(parsed.valid.length)} starting ${parsed.valid.length === 1 ? "work" : "works"}`}</Text>
            {parsed.valid.map((id) => (
              <Group key={id} justify="space-between" wrap="nowrap" gap="xs">
                <Pill size="sm">{titleOf(id)}</Pill>
                <Button
                  variant="subtle"
                  size="compact-xs"
                  color="red"
                  disabled={submitting}
                  aria-label={`Remove ${titleOf(id)}`}
                  onClick={() => {
                    setSeeds(
                      parsed.valid.filter((seed) => seed !== id),
                      parsed.invalid,
                    );
                  }}
                >
                  Remove
                </Button>
              </Group>
            ))}
            {parsed.invalid.map((token) => (
              <Pill
                key={token}
                size="sm"
                c="red"
              >{`${token} (not a work id)`}</Pill>
            ))}
          </Stack>
        )}
        {bookmarkedWorks.length > 0 && (
          <BookmarkSeedPicker
            works={bookmarkedWorks}
            alreadyAdded={new Set(parsed.valid)}
            disabled={submitting}
            onAdd={(ids) => {
              setSeeds(
                [
                  ...parsed.valid,
                  ...ids.filter((id) => !parsed.valid.includes(id)),
                ],
                parsed.invalid,
              );
            }}
          />
        )}
        {parsed.valid.length === 0 && query.trim() !== "" && (
          <Text size="sm" c="dimmed">
            No starting works yet: we will pick them for you from the search
            results, and you can change them before screening.
          </Text>
        )}
        {submitting && progressLabel !== null && (
          <Alert color="blue" role="status">
            {progressLabel}
          </Alert>
        )}
        <Group>
          <Button type="submit" loading={submitting}>
            Start review
          </Button>
          {submitting && onCancel !== undefined && (
            <Button variant="default" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Group>
      </Stack>
    </form>
  );
};
