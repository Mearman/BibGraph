/**
 * Review create form: starts a literature review from a Boolean query, from seed works, or both. A query alone is the zero-seeds start, where the app picks the seeds from the query's results. Seeds can be pasted (OpenAlex ids or URLs) or taken from bookmarked works. Presentational: validation of the form's own input lives here, everything that touches OpenAlex or storage is the caller's.
 */

import { normalizeOpenAlexId } from "@bibgraph/utils";
import { Alert, Button, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";

const SEED_SEPARATORS = /[\s,;]+/;
const WORK_ID_PATTERN = /^W\d+$/;
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
}

const parseSeeds = (raw: string): readonly string[] =>
	raw
		.split(SEED_SEPARATORS)
		.filter((token) => token !== "")
		.map(normalizeOpenAlexId);

export const ReviewCreateForm = ({ onSubmit, submitting, bookmarkedWorks }: ReviewCreateFormProps) => {
	const [name, setName] = useState("");
	const [query, setQuery] = useState("");
	const [seedText, setSeedText] = useState("");
	const [error, setError] = useState<string | null>(null);

	const addBookmarks = () => {
		const existing = parseSeeds(seedText);
		const merged = [...existing, ...bookmarkedWorks.map((work) => work.id).filter((id) => !existing.includes(id))];
		setSeedText(merged.join("\n"));
	};

	const submit = () => {
		const seeds = parseSeeds(seedText);
		const invalid = seeds.filter((seed) => !WORK_ID_PATTERN.test(seed));
		if (name.trim() === "") {
			setError("Give the review a name.");
		} else if (query.trim() === "" && seeds.length === 0) {
			setError("Enter a Boolean query, some seed works, or both.");
		} else if (invalid.length > 0) {
			setError(`Not OpenAlex work ids: ${invalid.join(", ")}`);
		} else {
			setError(null);
			onSubmit({ name: name.trim(), query: query.trim(), seeds });
		}
	};

	return (
		<Stack gap="md">
			<TextInput
				label="Review name"
				value={name}
				onChange={(event) => {
					setName(event.currentTarget.value);
				}}
			/>
			<Textarea
				label="Boolean query"
				description="Matched against OpenAlex works, for example: malaria AND (gut OR intestinal)"
				minRows={QUERY_MIN_ROWS}
				value={query}
				onChange={(event) => {
					setQuery(event.currentTarget.value);
				}}
			/>
			<Textarea
				label="Seed works"
				description="Known relevant works: OpenAlex ids or URLs, one per line or comma separated."
				minRows={SEEDS_MIN_ROWS}
				value={seedText}
				onChange={(event) => {
					setSeedText(event.currentTarget.value);
				}}
			/>
			{bookmarkedWorks.length > 0 && (
				<Button variant="light" onClick={addBookmarks}>
					{`Add ${String(bookmarkedWorks.length)} bookmarked works as seeds`}
				</Button>
			)}
			{parseSeeds(seedText).length === 0 && query.trim() !== "" && (
				<Text size="sm" c="dimmed">
					No seeds yet: the app will pick the seeds for you from the query's results.
				</Text>
			)}
			{error !== null && <Alert color="red">{error}</Alert>}
			<Button loading={submitting} onClick={submit}>
				Start review
			</Button>
		</Stack>
	);
};
