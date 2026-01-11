/**
 * NavigationTrail - Breadcrumbs and back navigation for entity detail pages
 * @module NavigationTrail
 */

import { Anchor, Breadcrumbs, Button, Group, Text } from '@mantine/core';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type NavigationTrailProps = {
  /** Current entity type (e.g., 'authors', 'works') */
  entityType: string;
  /** Current entity display name */
  entityName: string;
  /** Show "back to search" button if user came from search */
  showBackToSearch?: boolean;
  /** Custom breadcrumbs to prepend before entity trail */
  customBreadcrumbs?: BreadcrumbItem[];
};

/**
 * NavigationTrail provides breadcrumbs and optional back-to-search functionality
 * for entity detail pages, improving navigation context and UX.
 */
export const NavigationTrail = ({
  entityType,
  entityName,
  showBackToSearch = false,
  customBreadcrumbs = [],
}: NavigationTrailProps) => {
  const navigate = useNavigate();

  // Check if user came from search page by examining session storage
  const [cameFromSearch, setCameFromSearch] = useState(false);

  useEffect(() => {
    // Check if we have search context in session storage
    try {
      const searchContext = sessionStorage.getItem('lastSearchQuery');
      setCameFromSearch(!!(showBackToSearch && searchContext));
    } catch {
      // Session storage might not be available in all contexts
    }
  }, [showBackToSearch]);

  // Build breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    ...customBreadcrumbs,
    { label: 'Home', href: '/' },
    {
      label: entityType.charAt(0).toUpperCase() + entityType.slice(1),
      href: `/${entityType}`,
    },
    { label: entityName }, // Current page (not clickable)
  ];

  const handleBackToSearch = () => {
    try {
      const searchQuery = sessionStorage.getItem('lastSearchQuery');
      navigate({
        to: '/search',
        search: { q: searchQuery || '', filter: undefined, search: undefined },
      });
    } catch {
      navigate({
        to: '/search',
        search: { q: '', filter: undefined, search: undefined },
      });
    }
  };

  return (
    <Group justify="space-between" align="center" mb="sm" wrap="wrap">
      {/* Breadcrumbs */}
      <Breadcrumbs
        style={{ flex: 1, minWidth: 0 }}
        styles={{
          root: {
            overflow: 'hidden',
          },
          breadcrumb: {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        }}
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          if (isLast || !item.href) {
            // Current page or non-clickable item
            return (
              <Text
                key={index}
                size="sm"
                fw={500}
                c="dimmed"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.label}
              </Text>
            );
          }

          // Clickable breadcrumb
          return (
            <Anchor
              key={index}
              component={Link}
              to={item.href}
              size="sm"
              fw={500}
              lineClamp={1}
            >
              {item.label}
            </Anchor>
          );
        })}
      </Breadcrumbs>

      {/* Back to Search Button */}
      {cameFromSearch && (
        <Button
          variant="light"
          size="xs"
          onClick={handleBackToSearch}
          leftSection={<span style={{ fontSize: ICON_SIZE.SM }}>←</span>}
        >
          Back to Search
        </Button>
      )}
    </Group>
  );
};
