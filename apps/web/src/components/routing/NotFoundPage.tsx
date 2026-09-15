import { Alert, Button,Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconHome, IconSearch } from "@tabler/icons-react";
import { useLocation } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { ICON_SIZE } from "@/config/style-constants";

// Lazy load HomePage for when we need to render it as the fallback for the root path This works around a TanStack Router bug where the index route isn't matched (https://github.com/TanStack/router/issues/5528)
const HomePage = lazy(async () => import("../../routes/index.lazy"));

/**
 * Root not-found component: renders a 404 page for unmatched paths, and the HomePage for the root path itself, which the index-route workaround below covers.
 */
const NotFoundPage = () => {
  const location = useLocation();

  // Workaround for TanStack Router bug: index route not matching root path
  if (location.pathname === "/") {
    console.log("[NOT FOUND ROUTE] Root path detected, rendering HomePage as workaround");
    return (
      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>}>
        <HomePage />
      </Suspense>
    );
  }

  console.log("[NOT FOUND ROUTE] Rendering 404 component");
  return (
    <Container size="md" py="xl">
      <Stack gap="md" align="center">
        <Alert
          title="404 - Page Not Found"
          color="orange"
          variant="light"
          ta="center"
        >
          <Text size="sm">
            The page you are looking for does not exist or has been moved.
          </Text>
        </Alert>

        <Title order={2} c="dimmed">
          404 Error
        </Title>

        <Text c="dimmed" size="sm" ta="center">
          The requested page could not be found.
          <br />
          This resource does not exist or may be invalid.
        </Text>

        <Group>
          <Button
            leftSection={<IconHome size={ICON_SIZE.MD} />}
            component="a"
            href="#/"
            variant="filled"
          >
            Go Home
          </Button>
          <Button
            leftSection={<IconSearch size={ICON_SIZE.MD} />}
            component="a"
            href="#/search"
            variant="light"
          >
            Search
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};

export default NotFoundPage;
