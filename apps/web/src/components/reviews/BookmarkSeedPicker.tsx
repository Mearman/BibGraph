/**
 * Bookmark picker for the review form: bookmarked works listed by title with a checkbox each, so a reviewer chooses which to use as starting works. Works already among the starting works are shown ticked and locked rather than offered again. Presentational: the caller supplies the works and receives the chosen ids.
 */

import { Button, Checkbox, Stack, Text } from "@mantine/core";
import { useState } from "react";

import type { BookmarkedWork } from "./ReviewCreateForm";

export interface BookmarkSeedPickerProps {
	readonly works: readonly BookmarkedWork[];
	/**
	 * Ids already among the starting works.
	 */
	readonly alreadyAdded: ReadonlySet<string>;
	readonly disabled: boolean;
	readonly onAdd: (ids: readonly string[]) => void;
}

export const BookmarkSeedPicker = ({ works, alreadyAdded, disabled, onAdd }: BookmarkSeedPickerProps) => {
	const [selected, setSelected] = useState<readonly string[]>([]);
	const chosen = selected.filter((id) => !alreadyAdded.has(id));
	return (
		<Stack gap="xs">
			<Text size="sm" fw={500}>
				Your bookmarked works
			</Text>
			<Checkbox.Group value={[...selected]} onChange={setSelected}>
				<Stack gap={4}>
					{works.map((work) => (
						<Checkbox
							key={work.id}
							value={work.id}
							label={alreadyAdded.has(work.id) ? `${work.title} (already added)` : work.title}
							checked={alreadyAdded.has(work.id) || undefined}
							disabled={disabled || alreadyAdded.has(work.id)}
						/>
					))}
				</Stack>
			</Checkbox.Group>
			<Button
				variant="light"
				disabled={disabled || chosen.length === 0}
				onClick={() => {
					onAdd(chosen);
					setSelected([]);
				}}
			>
				{`Add ${String(chosen.length)} selected as starting works`}
			</Button>
		</Stack>
	);
};
