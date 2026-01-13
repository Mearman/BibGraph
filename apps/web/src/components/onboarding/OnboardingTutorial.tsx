/**
 * User Onboarding Tutorial Component
 *
 * Provides first-time user experience with step-by-step tour of BibGraph features
 * - Search functionality
 * - Catalogue/bookmarks
 * - Graph visualization
 * - Entity detail pages
 *
 * @module components/onboarding/OnboardingTutorial
 */

import { Button, Group, Modal, Paper, Progress, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconCircleCheck, IconCircleX, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  action?: string; // Suggested action text
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BibGraph!',
    description: 'Your gateway to exploring academic literature through the OpenAlex database. Let\'s take a quick tour of the key features.',
  },
  {
    id: 'search',
    title: 'Global Search',
    description: 'Use the search bar in the header (Ctrl+K) to search for works, authors, institutions, and more. Get real-time suggestions as you type.',
    target: 'input[aria-label*="search" i]',
    action: 'Try pressing Ctrl+K now',
  },
  {
    id: 'explore',
    title: 'Explore Page',
    description: 'Discover featured collections, trending topics, and take a serendipitous journey through academic literature.',
    target: 'a[href="/explore"]',
    action: 'Browse curated collections',
  },
  {
    id: 'catalogue',
    title: 'Your Catalogue',
    description: 'Organize your research into custom lists. Bookmark entities, track history, and create bibliographies for export.',
    target: 'a[href="/catalogue"]',
    action: 'Manage your lists',
  },
  {
    id: 'graph',
    title: 'Graph Visualization',
    description: 'Visualize relationships between entities as an interactive force-directed graph. Explore citation networks and collaboration patterns.',
    target: 'a[href="/graph"]',
    action: 'Explore connections',
  },
  {
    id: 'entity-details',
    title: 'Entity Detail Pages',
    description: 'View comprehensive information about works, authors, and institutions. Explore relationships, view PDFs, and track citation contexts.',
    action: 'Click any entity to learn more',
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Boost your productivity with keyboard shortcuts. Press Ctrl+/ to see all available shortcuts.',
    action: 'Press Ctrl+/ to view shortcuts',
  },
  {
    id: 'completed',
    title: 'You\'re All Set!',
    description: 'You\'ve learned the basics of BibGraph. Start exploring the academic graph and build your research library.',
  },
];

const ONBOARDING_STORAGE_KEY = 'bibgraph-onboarding-completed';

interface OnboardingTutorialProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Check if onboarding has been completed
 */
export const hasCompletedOnboarding = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
};

/**
 * Mark onboarding as completed
 */
export const markOnboardingCompleted = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
};

/**
 * Reset onboarding (for testing or "show again" functionality)
 */
export const resetOnboarding = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
};

/**
 * Onboarding Tutorial Component
 *
 * @param props
 * @param props.opened
 * @param props.onClose
 */
export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ opened, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    markOnboardingCompleted();
    onClose();
  };

  const handleShowAgain = () => {
    resetOnboarding();
    setCurrentStepIndex(0);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        size="lg"
        centered
        closeOnClickOutside={false}
        withCloseButton={false}
        title={
          <Group gap="xs" align="center">
            <IconInfoCircle size={ICON_SIZE.MD} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Welcome to BibGraph</Title>
          </Group>
        }
      >
        <Stack gap="lg">
          {/* Progress Bar */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
              </Text>
              <Text size="sm" c="dimmed">
                {Math.round(progress)}% complete
              </Text>
            </Group>
            <Progress value={progress} color="blue" size="md" radius="md" />
          </Stack>

          {/* Step Content */}
          <Paper p="xl" radius="md" withBorder style={{ minHeight: 200 }}>
            <Stack gap="md" align="center">
              <Title order={2} ta="center">
                {currentStep.title}
              </Title>
              <Text size="lg" ta="center" c="dimmed">
                {currentStep.description}
              </Text>
              {currentStep.action && (
                <Text size="sm" fw={500} c="blue" ta="center">
                  💡 {currentStep.action}
                </Text>
              )}
            </Stack>
          </Paper>

          {/* Navigation Buttons */}
          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              leftSection={<IconCircleX size={ICON_SIZE.SM} />}
            >
              Previous
            </Button>

            <Group gap="xs">
              {currentStepIndex < ONBOARDING_STEPS.length - 1 && (
                <Button
                  variant="light"
                  color="gray"
                  onClick={handleSkip}
                >
                  Skip Tour
                </Button>
              )}
              <Button
                onClick={handleNext}
                rightSection={<IconCircleCheck size={ICON_SIZE.SM} />}
              >
                {currentStepIndex === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </Group>
          </Group>

          {/* Step Indicators */}
          <Group gap={4} justify="center">
            {ONBOARDING_STEPS.map((_, index) => (
              <UnstyledButton
                key={index}
                onClick={() => setCurrentStepIndex(index)}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: index === currentStepIndex
                    ? 'var(--mantine-color-blue-6)'
                    : index < currentStepIndex
                      ? 'var(--mantine-color-blue-3)'
                      : 'var(--mantine-color-gray-3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </Group>
        </Stack>
      </Modal>

      {/* Show Again Button (when onboarding is closed) */}
      {!opened && hasCompletedOnboarding() && (
        <Group justify="center" py="md">
          <Button
            variant="light"
            size="sm"
            onClick={handleShowAgain}
            leftSection={<IconInfoCircle size={ICON_SIZE.SM} />}
          >
            Show Tutorial Again
          </Button>
        </Group>
      )}
    </>
  );
};
