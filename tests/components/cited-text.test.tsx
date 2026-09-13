// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CitedText, splitCitations } from "@/components/analyze/cited-text";
import { FIXTURE_DOCUMENT, renderWithLocale } from "@/tests/components/helpers";

describe("splitCitations", () => {
  it("splits prose around clause tags and keeps surrounding text", () => {
    expect(splitCitations("See [c1] and [c2].")).toEqual([
      { kind: "text", value: "See " },
      { kind: "clause", value: "c1" },
      { kind: "text", value: " and " },
      { kind: "clause", value: "c2" },
      { kind: "text", value: "." },
    ]);
    expect(splitCitations("[c3]")).toEqual([{ kind: "clause", value: "c3" }]);
    expect(splitCitations("no tags")).toEqual([{ kind: "text", value: "no tags" }]);
  });
});

describe("CitedText", () => {
  it("links known clauses and leaves unknown tags as text", () => {
    renderWithLocale(
      <CitedText text="Notice is in [c6], not [c42]." document={FIXTURE_DOCUMENT} />,
    );
    expect(screen.getByRole("link", { name: "See clause: 5. Notice" })).toHaveAttribute(
      "href",
      "#clause-c6",
    );
    expect(screen.getByText(/\[c42\]/)).toBeInTheDocument();
  });
});
