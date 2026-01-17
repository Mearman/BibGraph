/**
 * Search page header component
 */
import { Text, Title } from "@mantine/core";

import { pageDescription, pageTitle } from "@/styles/layout.css";

export const SearchPageHeader = () => (
  <div>
    <Title order={1} className={pageTitle}>
      Universal Search
    </Title>
    <Text className={pageDescription}>
      Search across all OpenAlex entities - works, authors, sources,
      institutions, and topics. Results are sorted by relevance and cached for
      improved performance.
    </Text>
  </div>
);
