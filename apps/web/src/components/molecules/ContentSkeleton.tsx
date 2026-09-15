import { Stack } from "@mantine/core";

import { CardSkeleton, ListSkeleton,Skeleton, TextSkeleton } from "../ui/LoadingSkeleton";

interface ContentSkeletonProperties {
  variant?: "text" | "card" | "list" | "detail";
  count?: number;
}

/**
 * Flexible skeleton loading component for various content types
 * Improves perceived performance during data loading
 */
export const ContentSkeleton = ({
  variant = "text",
  count = 3,
}: ContentSkeletonProperties) => {
  // Use centralized skeleton components for consistency and better accessibility
  switch (variant) {
    case "text":
      return <TextSkeleton lines={count} />;
    case "card":
      return (
        <Stack gap="md">
          {Array.from({ length: count }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </Stack>
      );
    case "list":
      return <ListSkeleton items={count} />;
    case "detail":
      return (
        <Stack gap="lg">
          <Skeleton height={32} width="40%" variant="text" />
          <CardSkeleton />
          <TextSkeleton lines={3} />
        </Stack>
      );
    default:
      return <TextSkeleton lines={count} />;
  }
};
