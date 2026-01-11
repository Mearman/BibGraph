import { Alert, Button,Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconHome, IconSearch } from "@tabler/icons-react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { ICON_SIZE } from "@/config/style-constants";

// Lazy load HomePage for when we need to render it as fallback for root path
// This works around a TanStack Router bug where the index route isn't matched
const HomePage = lazy(() => import("./index.lazy"));

const NotFoundRoute = () => {
  const location = useLocation();

  // Workaround for TanStack Router bug: index route not matching root path
  // See: https://github.com/TanStack/router/issues/5528
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

export const Route = createFileRoute("/_not-found")({
  component: NotFoundRoute,
});