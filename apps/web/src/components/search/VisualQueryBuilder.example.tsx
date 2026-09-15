/**
 * Example usage of the VisualQueryBuilder component
 * This demonstrates how to integrate the visual query builder into your application
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { Button, Code,Container, Group, Space, Title } from "@mantine/core";
import React, { useState } from "react";

import { type VisualQuery,VisualQueryBuilder } from "./VisualQueryBuilder";


export const VisualQueryBuilderExample = () => {
  const [entityType, setEntityType] = useState<EntityType>("works");
  const [currentQuery, setCurrentQuery] = useState<VisualQuery | null>(null);
  const [appliedQuery, setAppliedQuery] = useState<VisualQuery | null>(null);

  const handleQueryChange = (query: VisualQuery) => {
    setCurrentQuery(query);
  };

  const handleQueryApply = (query: VisualQuery) => {
    setAppliedQuery(query);
    // Here you would typically execute the query against the OpenAlex API
    logger.debug("visual-query-builder", "Applied query", { query });
  };

  const switchEntityType = (newType: EntityType) => {
    setEntityType(newType);
    setCurrentQuery(null);
    setAppliedQuery(null);
  };

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="lg">
        Visual Query Builder Demo
      </Title>

      <Group mb="lg">
        <Button
          variant={entityType === "works" ? "filled" : "outline"}
          onClick={() => { switchEntityType("works"); }}
        >
          Works
        </Button>
        <Button
          variant={entityType === "authors" ? "filled" : "outline"}
          onClick={() => { switchEntityType("authors"); }}
        >
          Authors
        </Button>
        <Button
          variant={entityType === "sources" ? "filled" : "outline"}
          onClick={() => { switchEntityType("sources"); }}
        >
          Sources
        </Button>
        <Button
          variant={entityType === "institutions" ? "filled" : "outline"}
          onClick={() => { switchEntityType("institutions"); }}
        >
          Institutions
        </Button>
      </Group>

      <VisualQueryBuilder
        entityType={entityType}
        onQueryChange={handleQueryChange}
        onApply={handleQueryApply}
      />

      <Space h="xl" />

      {currentQuery && (
        <div>
          <Title order={3} mb="md">
            Current Query Structure
          </Title>
          <Code block>{JSON.stringify(currentQuery, null, 2)}</Code>
        </div>
      )}

      <Space h="lg" />

      {appliedQuery && (
        <div>
          <Title order={3} mb="md">
            Applied Query (Ready for API Execution)
          </Title>
          <Code block>{JSON.stringify(appliedQuery, null, 2)}</Code>
        </div>
      )}
    </Container>
  );
};

// Usage example:
/*
import { VisualQueryBuilderExample } from "./components/search/VisualQueryBuilder.example";

function App() {
  return (
    <MantineProvider>
      <VisualQueryBuilderExample />
    </MantineProvider>
  );
}
*/
