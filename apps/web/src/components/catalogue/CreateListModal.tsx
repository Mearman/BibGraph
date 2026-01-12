/**
 * Modal component for creating new catalogue lists
 */

import type { ListType } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  Radio,
  Stack,
  TagsInput,
  Text as MantineText,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import React, { useMemo, useState } from "react";


interface CreateListModalProps {
  onClose: () => void;
  onSubmit: (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }) => Promise<void>;
  initialTitle?: string;
  initialDescription?: string;
  initialType?: ListType;
  initialTags?: string[];
}

// Validation constants
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TAGS_COUNT = 10;

export const CreateListModal = ({
  onClose,
  onSubmit,
  initialTitle,
  initialDescription,
  initialType,
  initialTags
}: CreateListModalProps) => {
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [type, setType] = useState<ListType>(initialType || "list");
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  // Derived state computed via useMemo instead of repeated calculations
  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const trimmedDescription = useMemo(() => description.trim(), [description]);
  const filteredTags = useMemo(() =>
    tags.filter(tag => tag.trim().length > 0),
    [tags]
  );

  // Validation states
  const titleError = useMemo(() => {
    if (!titleTouched) return null;
    if (!trimmedTitle) return "Title is required";
    if (trimmedTitle.length < 3) return "Title must be at least 3 characters";
    if (trimmedTitle.length > MAX_TITLE_LENGTH) return `Title cannot exceed ${MAX_TITLE_LENGTH} characters`;
    return null;
  }, [trimmedTitle, titleTouched]);

  const descriptionError = useMemo(() => {
    if (!descriptionTouched) return null;
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      return `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
    }
    return null;
  }, [trimmedDescription, descriptionTouched]);

  const tagsError = useMemo(() => {
    if (filteredTags.length > MAX_TAGS_COUNT) {
      return `Cannot add more than ${MAX_TAGS_COUNT} tags`;
    }
    return null;
  }, [filteredTags]);

  const isFormValid = useMemo(() => {
    return trimmedTitle.length >= 3 &&
           trimmedTitle.length <= MAX_TITLE_LENGTH &&
           trimmedDescription.length <= MAX_DESCRIPTION_LENGTH &&
           filteredTags.length <= MAX_TAGS_COUNT &&
           !titleError &&
           !descriptionError &&
           !tagsError;
  }, [trimmedTitle, trimmedDescription, filteredTags, titleError, descriptionError, tagsError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched for validation
    setTitleTouched(true);
    setDescriptionTouched(true);

    // Clear previous errors
    setSubmitError(null);

    // Validate form
    if (!isFormValid) {
      logger.debug("catalogue-ui", "Form submission attempted with validation errors", {
        titleLength: trimmedTitle.length,
        descriptionLength: trimmedDescription.length,
        tagsCount: filteredTags.length,
        titleError,
        descriptionError,
        tagsError
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const listData = {
        title: trimmedTitle,
        description: trimmedDescription || undefined,
        type,
        tags: filteredTags,
        isPublic,
      };

      await onSubmit(listData);

      logger.info("catalogue-ui", "List creation form submitted successfully", {
        component: "CreateListModal",
        listType: type,
        hasDescription: !!trimmedDescription,
        tagsCount: filteredTags.length,
        isPublic,
        titleLength: trimmedTitle.length
      });

      // Close modal on success
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create list";
      setSubmitError(errorMessage);

      logger.error("catalogue-ui", "Failed to create list from form", {
        component: "CreateListModal",
        listType: type,
        title: trimmedTitle,
        error: errorMessage,
        errorDetails: error
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        {/* Error Alert */}
        {submitError && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Creation Failed"
            color="red"
            variant="light"
            role="alert"
            aria-live="polite"
          >
            {submitError}
          </Alert>
        )}

        {/* Title Input */}
        <TextInput
          id="list-title"
          label="Title"
          placeholder="Enter list name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTitleTouched(true)}
          required
          maxLength={MAX_TITLE_LENGTH}
          error={titleError}
          description={`Enter a descriptive title for your ${type}. Min 3 characters, max ${MAX_TITLE_LENGTH}.`}
          rightSection={
            title.length > 0 && (
              <Tooltip label={`${title.length}/${MAX_TITLE_LENGTH} characters`}>
                <MantineText
                  size="xs"
                  c={title.length > MAX_TITLE_LENGTH ? "red" : "dimmed"}
                  fw={500}
                >
                  {title.length}
                </MantineText>
              </Tooltip>
            )
          }
          aria-describedby={titleError ? "title-error" : "title-description"}
          aria-invalid={!!titleError}
        />

        {/* Description Textarea */}
        <Textarea
          id="list-description"
          label="Description"
          placeholder="Optional description of your list"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setDescriptionTouched(true)}
          minRows={3}
          maxLength={MAX_DESCRIPTION_LENGTH}
          error={descriptionError}
          description={`Optional description to help others understand the purpose of this list. Max ${MAX_DESCRIPTION_LENGTH} characters.`}
          rightSection={
            description.length > 0 && (
              <Tooltip label={`${description.length}/${MAX_DESCRIPTION_LENGTH} characters`}>
                <MantineText
                  size="xs"
                  c={description.length > MAX_DESCRIPTION_LENGTH ? "red" : "dimmed"}
                  fw={500}
                >
                  {description.length}
                </MantineText>
              </Tooltip>
            )
          }
          aria-describedby={descriptionError ? "description-error" : "description-description"}
          aria-invalid={!!descriptionError}
        />

        {/* Type Selection */}
        <Radio.Group
          label="Type"
          value={type}
          onChange={(value) => setType(value as ListType)}
          required
          aria-describedby="list-type-description"
        >
          <Group mt="xs">
            <Radio
              value="list"
              label="List"
              description="Can contain any type of entity (works, authors, institutions, etc.)"
              aria-label="General list - can contain any entity type"
            />
            <Radio
              value="bibliography"
              label="Bibliography"
              description="Can only contain works - perfect for reference lists"
              aria-label="Bibliography - works only"
            />
          </Group>
          <Group gap="xs" mt="xs" align="center">
            <IconInfoCircle size={12} color="var(--mantine-color-dimmed)" />
            <MantineText id="list-type-description" size="xs" c="dimmed">
              Choose the type of list you want to create. This cannot be changed later.
            </MantineText>
          </Group>
        </Radio.Group>

        {/* Tags Input */}
        <TagsInput
          id="list-tags"
          label="Tags"
          placeholder="Add tags to organize your lists..."
          data={[]}
          value={tags}
          onChange={setTags}
          error={tagsError}
          description={`Add up to ${MAX_TAGS_COUNT} tags to help organize and find your lists.`}
          maxTags={MAX_TAGS_COUNT}
          aria-describedby={tagsError ? "tags-error" : "tags-description"}
          aria-invalid={!!tagsError}
        />

        {/* Public Sharing Checkbox */}
        <Checkbox
          id="is-public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          label="Make this list publicly shareable"
          aria-describedby="public-description"
        />
        <Group gap="xs" mt="xs" align="center">
          <IconInfoCircle size={12} color="var(--mantine-color-dimmed)" />
          <MantineText id="public-description" size="xs" c="dimmed">
            When enabled, others can import and view this list using a share URL.
          </MantineText>
        </Group>

        {/* Action Buttons */}
        <Group justify="flex-end" gap="xs">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cancel list creation"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!isFormValid || isSubmitting}
            aria-label={`Create ${type === "bibliography" ? "bibliography" : "list"}${!isFormValid ? " - form has errors" : ""}`}
            leftSection={!isSubmitting && isFormValid && <IconCheck size={16} />}
          >
            Create {type === "bibliography" ? "Bibliography" : "List"}
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};