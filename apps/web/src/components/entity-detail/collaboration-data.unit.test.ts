/**
 * Unit tests for co-author extraction from an author's works: collaboration counts aggregate per co-author across the loaded works, the author themself is excluded, and results are ordered by collaboration count.
 */

import type { Work } from "@bibgraph/types";
import { describe, expect, it } from "vitest";

import { extractCoAuthors, toShortOpenAlexId } from "./collaboration-data";

const makeWork = (id: string, authorIdsWithNames: readonly [string, string][]): Work =>
  ({
    id,
    display_name: `Work ${id}`,
    authorships: authorIdsWithNames.map(([authorId, displayName]) => ({
      author_position: "first",
      author: { id: authorId, display_name: displayName },
    })),
  }) as Work;

describe("extractCoAuthors", () => {
  it("counts one collaboration per shared work per co-author", () => {
    const works = [
      makeWork("https://openalex.org/W1", [
        ["https://openalex.org/A1", "Self Author"],
        ["https://openalex.org/A2", "Colleague One"],
      ]),
      makeWork("https://openalex.org/W2", [
        ["https://openalex.org/A1", "Self Author"],
        ["https://openalex.org/A2", "Colleague One"],
        ["https://openalex.org/A3", "Colleague Two"],
      ]),
    ];

    const coAuthors = extractCoAuthors(works, "A1");

    expect(coAuthors).toHaveLength(2);
    expect(coAuthors[0]).toEqual({
      id: "A2",
      displayName: "Colleague One",
      collaborationCount: 2,
    });
    expect(coAuthors[1]).toEqual({
      id: "A3",
      displayName: "Colleague Two",
      collaborationCount: 1,
    });
  });

  it("excludes the author themself however their id is spelled", () => {
    const works = [
      makeWork("https://openalex.org/W1", [
        ["https://openalex.org/A1", "Self Author"],
        ["https://openalex.org/A2", "Colleague One"],
      ]),
    ];

    const coAuthors = extractCoAuthors(works, "https://openalex.org/A1");

    expect(coAuthors.map((coAuthor) => coAuthor.id)).toEqual(["A2"]);
  });

  it("skips authorships without an author id", () => {
    const works = [
      {
        ...makeWork("https://openalex.org/W1", []),
        authorships: [
          { author_position: "first", author: { id: null, display_name: "Unlinked" } },
        ],
      } as unknown as Work,
    ];

    expect(extractCoAuthors(works, "A1")).toEqual([]);
  });

  it("breaks collaboration-count ties by display name for a stable order", () => {
    const works = [
      makeWork("https://openalex.org/W1", [
        ["https://openalex.org/A1", "Self Author"],
        ["https://openalex.org/A9", "Zoe Nine"],
        ["https://openalex.org/A2", "Anna Two"],
      ]),
    ];

    const coAuthors = extractCoAuthors(works, "A1");

    expect(coAuthors.map((coAuthor) => coAuthor.displayName)).toEqual(["Anna Two", "Zoe Nine"]);
  });
});

describe("toShortOpenAlexId", () => {
  it("reduces a full OpenAlex URL to its short id", () => {
    expect(toShortOpenAlexId("https://openalex.org/A5017898742")).toBe("A5017898742");
  });

  it("passes an already-short id through unchanged", () => {
    expect(toShortOpenAlexId("A5017898742")).toBe("A5017898742");
  });
});
