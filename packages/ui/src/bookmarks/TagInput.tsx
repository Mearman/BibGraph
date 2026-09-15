/**
 * Tag Input Component
 *
 * Input component for adding tags to bookmarks with autocomplete support
 *
 * Related:
 * - T036: Create tag input component
 * - User Story 3: Organize and Search Bookmarks
 */

import { Combobox, Pill, PillsInput, useCombobox } from "@mantine/core";
import { useState } from "react";

// Stable default values to prevent infinite render loops
const EMPTY_SUGGESTIONS: string[] = [];

export interface TagInputProps {
	/**
	 * Current tags
	 */
	value: string[];

	/**
	 * Callback when tags change
	 */
	onChange: (tags: readonly string[]) => void;

	/**
	 * Placeholder text
	 */
	placeholder?: string;

	/**
	 * Maximum number of tags allowed
	 */
	maxTags?: number;

	/**
	 * Suggested tags for autocomplete
	 */
	suggestions?: string[];

	/**
	 * Whether the input is disabled
	 */
	disabled?: boolean;

	/**
	 * Error message
	 */
	error?: string;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Tag Input Component
 *
 * Features:
 * - Add tags by typing and pressing Enter
 * - Remove tags by clicking the X button
 * - Autocomplete from suggested tags
 * - Prevent duplicate tags
 * - Case-insensitive tag matching
 * - Maximum tag limit
 * - Empty tag validation
 * @example
 * ```tsx
 * <TagInput
 *   value={tags}
 *   onChange={setTags}
 *   placeholder="Add tags..."
 *   suggestions={["ai", "ml", "research", "nlp"]}
 *   maxTags={10}
 * />
 * ```
 */
export const TagInput = ({
	value,
	onChange,
	placeholder = "Add tags...",
	maxTags,
	suggestions = EMPTY_SUGGESTIONS,
	disabled = false,
	error,
	"data-testid": dataTestId = "tag-input",
}: TagInputProps) => {
	const combobox = useCombobox({
		onDropdownClose: () => { combobox.resetSelectedOption(); },
		onDropdownOpen: () => { combobox.updateSelectedOptionIndex("active"); },
	});

	const [search, setSearch] = useState("");

	// Filter suggestions based on search and exclude already selected tags
	const filteredSuggestions = suggestions.filter(
		(suggestion) =>
			suggestion.toLowerCase().includes(search.toLowerCase().trim()) &&
			value.every((tag) => tag.toLowerCase() !== suggestion.toLowerCase())
	);

	/**
	 * Handle tag addition
	 */
	const handleAddTag = (tag: string) => {
		const trimmedTag = tag.trim();

		// Ignore empty tags
		if (!trimmedTag) {
			return;
		}

		// Check max tags limit
		if (maxTags !== undefined && value.length >= maxTags) {
			return;
		}

		// Check for duplicate tags (case-insensitive)
		if (value.some((existingTag) => existingTag.toLowerCase() === trimmedTag.toLowerCase())) {
			setSearch("");
			return;
		}

		// Add the tag
		onChange([...value, trimmedTag]);
		setSearch("");
	};

	/**
	 * Handle tag removal
	 */
	const handleRemoveTag = (tagToRemove: string) => {
		onChange(value.filter((tag) => tag !== tagToRemove));
	};

	/**
	 * Handle key down events
	 */
	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" && search.trim()) {
			event.preventDefault();
			handleAddTag(search);
		} else if (event.key === "Backspace" && !search && value.length > 0) {
			// Remove last tag on backspace if input is empty
			const lastTag = value[value.length - 1];
			handleRemoveTag(lastTag);
		}
	};

	/**
	 * Handle suggestion selection
	 */
	const handleSuggestionSelect = (suggestion: string) => {
		handleAddTag(suggestion);
		combobox.closeDropdown();
	};

	// Render tag pills
	const pills = value.map((tag) => (
		<Pill key={tag} withRemoveButton onRemove={() => { handleRemoveTag(tag); }} data-testid={`tag-pill-${tag}`}>
			{tag}
		</Pill>
	));

	// Render suggestion options
	const options = filteredSuggestions.map((suggestion) => (
		<Combobox.Option value={suggestion} key={suggestion} data-testid={`tag-suggestion-${suggestion}`}>
			{suggestion}
		</Combobox.Option>
	));

	return (
		<Combobox
			store={combobox}
			onOptionSubmit={handleSuggestionSelect}
			withinPortal={false}
			disabled={disabled}
		>
			<Combobox.DropdownTarget>
				<PillsInput
					onClick={() => { combobox.openDropdown(); }}
					data-testid={dataTestId}
					disabled={disabled}
					error={error}
				>
					<Pill.Group>
						{pills}

						<Combobox.EventsTarget>
							<PillsInput.Field
								placeholder={value.length === 0 ? placeholder : undefined}
								value={search}
								onChange={(event) => {
									setSearch(event.currentTarget.value);
									combobox.updateSelectedOptionIndex();
									combobox.openDropdown();
								}}
								onKeyDown={handleKeyDown}
								onFocus={() => { combobox.openDropdown(); }}
								onBlur={() => { combobox.closeDropdown(); }}
								disabled={disabled || (maxTags !== undefined && value.length >= maxTags)}
								data-testid={`${dataTestId}-field`}
							/>
						</Combobox.EventsTarget>
					</Pill.Group>
				</PillsInput>
			</Combobox.DropdownTarget>

			{filteredSuggestions.length > 0 && (
				<Combobox.Dropdown>
					<Combobox.Options data-testid={`${dataTestId}-suggestions`}>{options}</Combobox.Options>
				</Combobox.Dropdown>
			)}
		</Combobox>
	);
};
