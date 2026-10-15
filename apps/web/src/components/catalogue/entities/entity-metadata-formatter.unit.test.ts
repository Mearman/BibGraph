/**
 * Unit tests for catalogue entity metadata formatting: graph-list entries carry their display name inside the serialized notes field, so the row extracts it rather than showing a bare entity id.
 */

import { describe, expect, it } from "vitest";

import {
  extractGraphListLabel,
  formatNotesForDisplay,
} from "./entity-metadata-formatter";

describe("extractGraphListLabel", () => {
  it("reads the display name out of a graph-list notes string", () => {
    expect(extractGraphListLabel("provenance:user|label:Joseph Mearman")).toBe("Joseph Mearman");
  });

  it("reads the display name from any provenance kind", () => {
    expect(extractGraphListLabel("provenance:expansion|label:A study of OA")).toBe("A study of OA");
  });

  it("returns undefined for free-form notes", () => {
    expect(extractGraphListLabel("Read before the supervision meeting")).toBeUndefined();
  });

  it("returns undefined when notes are absent", () => {
    expect(extractGraphListLabel(undefined)).toBeUndefined();
  });

  it("returns undefined when the serialized form carries no label segment", () => {
    expect(extractGraphListLabel("provenance:user")).toBeUndefined();
  });
});

describe("formatNotesForDisplay", () => {
  it("maps provenance kinds to their user-facing descriptions", () => {
    expect(formatNotesForDisplay("provenance:user|label:Joseph Mearman")).toBe("Added manually");
    expect(formatNotesForDisplay("provenance:expansion|label:A study of OA")).toBe(
      "Discovered via expansion",
    );
  });

  it("shows free-form notes as written", () => {
    expect(formatNotesForDisplay("Read before the supervision meeting")).toBe(
      "Read before the supervision meeting",
    );
  });
});
