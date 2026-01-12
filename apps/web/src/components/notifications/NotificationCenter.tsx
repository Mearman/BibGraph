/**
 * Notification Center Component
 *
 * Displays persistent notification center with notification history.
 * Shows toast-style notifications with mark as read and dismiss functionality.
 */

import {
  ActionIcon,
  Box,
  Button,
  Center,
  Container,
  Group,
  Menu,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBell,
  IconBellOff,
  IconBellRinging,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { memo } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationBellProps {
  onClick: () => void;
  unreadCount: number;
}

const NotificationBell = memo(({ onClick, unreadCount }: NotificationBellProps) => {
  const theme = useMantineTheme();

  return (
    <UnstyledButton onClick={onClick} aria-label={`Open notifications (${unreadCount} unread)`}>
      <Box pos="relative">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
        >
          {unreadCount > 0 ? <IconBellRinging size={ICON_SIZE.MD} /> : <IconBell size={ICON_SIZE.MD} />}
        </ActionIcon>
        {unreadCount > 0 && (
          <Box
            pos="absolute"
            top={-4}
            right={-4}
            bg="red"
            c="white"
            style={{
              borderRadius: '9999px',
              minWidth: 18,
              height: 18,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${theme.colors.gray[0]}`,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Box>
        )}
      </Box>
    </UnstyledButton>
  );
});

NotificationBell.displayName = 'NotificationBell';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    category: string;
    timestamp: Date;
    read: boolean;
  };
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const NotificationItem = memo(({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) => {
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const categoryColors: Record<string, string> = {
    success: 'teal',
    error: 'red',
    warning: 'orange',
    info: 'blue',
  };

  return (
    <UnstyledButton
      p="sm"
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        backgroundColor: notification.read ? 'transparent' : 'var(--mantine-color-blue-0)',
      }}
      onClick={() => onMarkAsRead(notification.id)}
    >
      <Group gap="sm" wrap="nowrap">
        <Box
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: `var(--mantine-color-${categoryColors[notification.category]}-6)`,
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {notification.title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {notification.message}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {formatTime(notification.timestamp)}
          </Text>
        </Box>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          aria-label={`Dismiss notification: ${notification.title}`}
        >
          <IconX size={ICON_SIZE.XS} />
        </ActionIcon>
      </Group>
    </UnstyledButton>
  );
});

NotificationItem.displayName = 'NotificationItem';

export const NotificationCenter = memo(() => {
  const { notifications: allNotifications, unreadCount, markAsRead, markAllAsRead, dismissNotification, clearAll } = useNotifications();
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <Menu
      opened={opened}
      onChange={toggle}
      position="bottom-end"
      offset={12}
      width={350}
      shadow="md"
    >
      <Menu.Target>
        <NotificationBell onClick={toggle} unreadCount={unreadCount} />
      </Menu.Target>

      <Menu.Dropdown p={0}>
        <Container py="xs" px="sm">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Title order={6}>Notifications</Title>
              {unreadCount > 0 && (
                <Text size="xs" c="blue" fw={500}>
                  {unreadCount} new
                </Text>
              )}
            </Group>
            {allNotifications.length > 0 && (
              <Group gap="xs">
                {unreadCount > 0 && (
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconCheck size={ICON_SIZE.XS} />}
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  leftSection={<IconBellOff size={ICON_SIZE.XS} />}
                  onClick={clearAll}
                >
                  Clear all
                </Button>
              </Group>
            )}
          </Group>
        </Container>

        {allNotifications.length === 0 ? (
          <Center p="xl">
            <Stack align="center" gap="sm">
              <Box c="dimmed">
                <IconBell size={ICON_SIZE.EMPTY_STATE_SM} />
              </Box>
              <Text size="sm" c="dimmed">
                No notifications yet
              </Text>
            </Stack>
          </Center>
        ) : (
          <Box style={{ maxHeight: 400, overflowY: 'auto' }}>
            {allNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDismiss={dismissNotification}
              />
            ))}
          </Box>
        )}
      </Menu.Dropdown>
    </Menu>
  );
});

NotificationCenter.displayName = 'NotificationCenter';
