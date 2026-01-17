import { getEntityIcon,NormalizedEntityViewOptions } from './entity-view-types'

export const generateHeaderComponent = (options: NormalizedEntityViewOptions): string => {
  const icon = getEntityIcon(options.entityName)
  return `import { Card, Group, Stack, Text, Badge } from '@mantine/core'
import type { ${options.entityNameCapitalized} } from '@bibgraph/client'

interface ${options.entityNameCapitalized}HeaderProps {
  entity: ${options.entityNameCapitalized}
  loading?: boolean
}

export function ${options.entityNameCapitalized}Header({ entity, loading }: ${options.entityNameCapitalized}HeaderProps) {
  if (loading) {
    return (
      <Card p="md" withBorder>
        <Stack>
          <Text size="lg" fw={500}>Loading...</Text>
        </Stack>
      </Card>
    )
  }

  return (
    <Card p="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="lg" fw={500}>
            {entity.display_name}
          </Text>
          <Badge variant="light">
            ${icon} ${options.entityNameCapitalized}
          </Badge>
        </Group>

        {/* TODO: Add entity-specific header information */}
        <Text size="sm" c="dimmed">
          ID: {entity.id}
        </Text>
      </Stack>
    </Card>
  )
}
`
};

export const generateContentComponent = (options: NormalizedEntityViewOptions): string => `import { Tabs, Tab, Card, Stack, Text } from '@mantine/core'
import { IconChartBar, IconInfoCircle } from '@tabler/icons-react'
import { ${options.entityNameCapitalized}Header } from './${options.fileName}-header'
import type { ${options.entityNameCapitalized} } from '@bibgraph/client'

interface ${options.entityNameCapitalized}ContentProps {
  entity: ${options.entityNameCapitalized}
  loading?: boolean
}

export function ${options.entityNameCapitalized}Content({ entity, loading }: ${options.entityNameCapitalized}ContentProps) {
  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Stack gap="md">
      <${options.entityNameCapitalized}Header entity={entity} />

      <Tabs defaultValue="overview">
        <Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
          Overview
        </Tab>
        <Tab value="analytics" leftSection={<IconChartBar size={16} />}>
          Analytics
        </Tab>

        <Tabs.Panel value="overview">
          <Card p="md" withBorder>
            <Stack gap="sm">
              <Text size="lg" fw={500}>Overview</Text>
              <Text>
                {/* TODO: Add overview content for ${options.entityName} */}
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="analytics">
          <Card p="md" withBorder>
            <Stack gap="sm">
              <Text size="lg" fw={500}>Analytics</Text>
              <Text>
                {/* TODO: Add analytics content for ${options.entityName} */}
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
`;

export const generateLoadingSkeletonComponent = (options: NormalizedEntityViewOptions): string => `import { Stack, Skeleton, Card } from '@mantine/core'

export function ${options.entityNameCapitalized}LoadingSkeleton() {
  return (
    <Stack gap="md">
      <Card p="md" withBorder>
        <Stack gap="sm">
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={16} width="80%" />
        </Stack>
      </Card>

      <Card p="md" withBorder>
        <Stack gap="sm">
          <Skeleton height={20} width="50%" />
          <Skeleton height={100} />
        </Stack>
      </Card>
    </Stack>
  )
}
`;

export const generateErrorComponent = (options: NormalizedEntityViewOptions): string => `import { Alert, Button, Stack } from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'

interface ${options.entityNameCapitalized}ErrorProps {
  error: Error
  onRetry?: () => void
}

export function ${options.entityNameCapitalized}Error({ error, onRetry }: ${options.entityNameCapitalized}ErrorProps) {
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Error Loading ${options.entityNameCapitalized}"
      color="red"
      variant="light"
    >
      <Stack gap="md">
        <div>
          <strong>Error:</strong> {error.message}
        </div>

        {onRetry && (
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={onRetry}
            variant="light"
            color="red"
          >
            Retry
          </Button>
        )}
      </Stack>
    </Alert>
  )
}
`;

export const generateListViewComponent = (options: NormalizedEntityViewOptions): string => {
  const icon = getEntityIcon(options.entityName)
  return `import { Card, Stack, Text, Group, Badge, Button } from '@mantine/core'
import { IconExternalLink } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import type { ${options.entityNameCapitalized} } from '@bibgraph/client'

interface ${options.entityNameCapitalized}ListViewProps {
  entities: ${options.entityNameCapitalized}[]
  loading?: boolean
}

export function ${options.entityNameCapitalized}ListView({ entities, loading }: ${options.entityNameCapitalized}ListViewProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} p="md" withBorder>
            <Stack gap="sm">
              <div>Loading...</div>
            </Stack>
          </Card>
        ))}
      </Stack>
    )
  }

  return (
    <Stack gap="sm">
      {entities.map((entity) => (
        <Card
          key={entity.id}
          p="md"
          withBorder
          style={{ cursor: 'pointer' }}
          onClick={() => navigate({ to: '/entity-views/${options.entityPlural}/$entityId', params: { entityId: entity.id } })}
        >
          <Group justify="space-between">
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {entity.display_name}
              </Text>
              <Text size="xs" c="dimmed">
                {entity.id}
              </Text>
            </Stack>

            <Group gap="xs">
              <Badge variant="light" size="sm">
                ${icon}
              </Badge>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconExternalLink size={12} />}
              >
                View
              </Button>
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  )
}
`
};

export const generateDataHook = (options: NormalizedEntityViewOptions): string => `import { useState, useEffect } from 'react'
import { useOpenAlexClient } from '@bibgraph/client'
import type { ${options.entityNameCapitalized} } from '@bibgraph/client'

interface Use${options.entityNameCapitalized}Options {
  id: string
  enabled?: boolean
}

export function use${options.entityNameCapitalized}({ id, enabled = true }: Use${options.entityNameCapitalized}Options) {
  const [data, setData] = useState<${options.entityNameCapitalized} | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useOpenAlexClient()

  useEffect(() => {
    if (!enabled || !id) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await client.${options.entityPlural}.get({ id })
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, enabled, client])

  return {
    data,
    loading,
    error,
    refetch: () => {
      if (id) {
        const fetchData = async () => {
          try {
            setLoading(true)
            setError(null)

            const result = await client.${options.entityPlural}.get({ id })
            setData(result)
          } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'))
          } finally {
            setLoading(false)
          }
        }
        fetchData()
      }
    },
  }
}
`;

export const generateMockData = (options: NormalizedEntityViewOptions): string => `import type { ${options.entityNameCapitalized} } from '@bibgraph/client'

export const mock${options.entityNameCapitalized}: ${options.entityNameCapitalized} = {
  id: 'W1234567890',
  display_name: 'Sample ${options.entityNameCapitalized}',
  // TODO: Add mock properties specific to ${options.entityName}
} as ${options.entityNameCapitalized}

export const mock${options.entityPluralCapitalized}: ${options.entityNameCapitalized}[] = [
  mock${options.entityNameCapitalized},
  // TODO: Add more mock ${options.entityPlural}
]
`;
