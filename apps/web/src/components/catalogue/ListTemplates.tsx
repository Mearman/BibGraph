/**
 * List templates component for quick list creation
 * Provides pre-configured templates for common use cases
 */

import type { ListType } from "@bibgraph/utils";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBook,
  IconBulb,
  IconClock,
  IconCopy,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import React, { useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';

/**
 * List template definition
 */
export interface ListTemplate {
  id: string;
  name: string;
  description: string;
  type: ListType;
  tags: string[];
  icon: React.ReactNode;
  color: string;
  useCases: string[];
}

/**
 * Pre-configured templates
 */
const TEMPLATES: ListTemplate[] = [
  {
    id: 'literature-review',
    name: 'Literature Review',
    description: 'Comprehensive collection of works for academic literature reviews',
    type: 'bibliography',
    tags: ['academic', 'research', 'review'],
    icon: <IconBook size={ICON_SIZE.MD} />,
    color: 'blue',
    useCases: [
      'Thesis or dissertation research',
      'Systematic literature reviews',
      'State-of-the-art surveys',
      'Background research for papers'
    ]
  },
  {
    id: 'weekly-reading',
    name: 'Weekly Reading',
    description: 'Curated list of works to read this week',
    type: 'list',
    tags: ['reading', 'weekly', 'productivity'],
    icon: <IconClock size={ICON_SIZE.MD} />,
    color: 'green',
    useCases: [
      'Weekly reading goals',
      'Paper discussion groups',
      'Course reading lists',
      'Personal development'
    ]
  },
  {
    id: 'citation-network',
    name: 'Citation Network',
    description: 'Track citations between related works',
    type: 'list',
    tags: ['citations', 'network', 'analysis'],
    icon: <IconBulb size={ICON_SIZE.MD} />,
    color: 'orange',
    useCases: [
      'Citation analysis',
      'Impact factor tracking',
      'Research influence mapping',
      'Literature connectedness'
    ]
  }
];

interface ListTemplatesProps {
  onUseTemplate: (template: ListTemplate) => void;
  onClose: () => void;
}

export const ListTemplates = ({ onUseTemplate, onClose }: ListTemplatesProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ListTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleUseTemplate = (template: ListTemplate) => {
    onUseTemplate(template);
    onClose();
  };

  const handlePreviewTemplate = (template: ListTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Choose a Template</Title>
          <Text size="sm" c="dimmed">
            Start with a pre-configured list template for common use cases
          </Text>
        </div>
        <ActionIcon
          variant="subtle"
          onClick={onClose}
          aria-label="Close templates"
        >
          <IconX size={ICON_SIZE.MD} />
        </ActionIcon>
      </Group>

      {/* Templates Grid */}
      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="md"
      >
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            shadow="sm"
            padding="md"
            radius="md"
            withBorder
            style={{
              cursor: 'pointer',
              borderColor: template.color,
            }}
            onClick={() => handlePreviewTemplate(template)}
          >
            <Stack gap="sm">
              {/* Icon and Name */}
              <Group justify="space-between" align="flex-start">
                <Box c={template.color}>
                  {template.icon}
                </Box>
                <Badge color={template.color} variant="light">
                  {template.type}
                </Badge>
              </Group>

              {/* Name and Description */}
              <div>
                <Text fw={600} size="sm">{template.name}</Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {template.description}
                </Text>
              </div>

              {/* Tags */}
              <Group gap="xs">
                {template.tags.map((tag) => (
                  <Badge key={tag} size="xs" variant="outline">
                    {tag}
                  </Badge>
                ))}
              </Group>

              {/* Actions */}
              <Group gap="xs">
                <Button
                  size="xs"
                  fullWidth
                  leftSection={<IconCopy size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                >
                  Use Template
                </Button>
                <Tooltip label="Preview template">
                  <ActionIcon
                    size="sm"
                    variant="light"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewTemplate(template);
                    }}
                  >
                    <IconInfoCircle size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      {/* Custom List Option */}
      <Card
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        style={{ borderStyle: 'dashed' }}
      >
        <Group justify="space-between">
          <div>
            <Text fw={500}>Start from Scratch</Text>
            <Text size="xs" c="dimmed">
              Create a custom list without using a template
            </Text>
          </div>
          <Button
            variant="light"
            onClick={onClose}
          >
            Create Custom List
          </Button>
        </Group>
      </Card>

      {/* Template Preview Modal */}
      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title={selectedTemplate?.name}
        size="md"
      >
        {selectedTemplate && (
          <Stack gap="md">
            {/* Description */}
            <Text size="sm">{selectedTemplate.description}</Text>

            {/* Metadata */}
            <Group gap="xs">
              <Badge color={selectedTemplate.color} variant="light">
                {selectedTemplate.type}
              </Badge>
              {selectedTemplate.tags.map((tag) => (
                <Badge key={tag} size="sm" variant="outline">
                  {tag}
                </Badge>
              ))}
            </Group>

            {/* Use Cases */}
            <Box>
              <Text fw={500} size="sm" mb="xs">Best For:</Text>
              <Stack gap="xs">
                {selectedTemplate.useCases.map((useCase, index) => (
                  <Group key={index} gap="xs">
                    <Box c="dimmed">•</Box>
                    <Text size="sm">{useCase}</Text>
                  </Group>
                ))}
              </Stack>
            </Box>

            {/* Action */}
            <Button
              fullWidth
              leftSection={<IconCopy size={16} />}
              onClick={() => {
                handleUseTemplate(selectedTemplate);
                setShowPreview(false);
              }}
            >
              Use This Template
            </Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
