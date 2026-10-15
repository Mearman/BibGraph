/**
 * Add-a-work-by-id: the one-line affordance for adding a work the reviewer already knows is relevant, by OpenAlex id or link. Presentational: the raw token is handed to the caller, who validates it, adds it and reports the outcome.
 */

import { Button, Group, TextInput } from "@mantine/core";
import { type ReactElement,type SyntheticEvent,useState } from "react";

export interface AddWorkByIdProps {
	readonly onAdd: (token: string) => void;
	readonly busy: boolean;
	/**
	 * The input's accessible name; the placeholder alone is not a label.
	 */
	readonly inputLabel: string;
}

export const AddWorkById = ({ onAdd, busy, inputLabel }: AddWorkByIdProps): ReactElement => {
	const [token, setToken] = useState("");
	const submit = (event: SyntheticEvent) => {
		event.preventDefault();
		const trimmed = token.trim();
		if (trimmed === "") return;
		onAdd(trimmed);
		setToken("");
	};
	return (
		<form onSubmit={submit}>
			<Group gap="xs" wrap="nowrap">
				<TextInput
					aria-label={inputLabel}
					placeholder="Add a work by OpenAlex id or link, e.g. W2741809807"
					disabled={busy}
					value={token}
					onChange={(event) => {
						setToken(event.currentTarget.value);
					}}
				/>
				<Button variant="light" type="submit" disabled={busy}>
					Add
				</Button>
			</Group>
		</form>
	);
};
