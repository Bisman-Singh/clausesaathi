// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { AnalysisView } from "@/components/analyze/analysis-view";
import { Timeline } from "@/components/analyze/timeline";
import { FIXTURE_DOCUMENT, FIXTURE_RESULT, renderWithLocale } from "@/tests/components/helpers";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({ messages: [], sendMessage: vi.fn(), status: "ready", error: undefined }),
}));

const view = (
  <AnalysisView
    document={FIXTURE_DOCUMENT}
    result={FIXTURE_RESULT}
    jurisdiction={{ state: "Karnataka", basis: "user" }}
    documentText="doc"
    state="Karnataka"
    today="2026-09-13"
  />
);

describe("AnalysisView", () => {
  it("renders every section with clause citations and the statute link", async () => {
    const { container } = renderWithLocale(view);
    expect(
      screen.getByRole("heading", { level: 2, name: "What this document says" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "At a glance" })).toBeInTheDocument();
    expect(screen.getByText("citation(s) the AI made up were removed")).toBeInTheDocument();
    expect(screen.getByText(/no matching provision for Karnataka/)).toBeInTheDocument();
    for (const name of [
      "In plain language",
      "Key terms",
      "Obligations and deadlines",
      "Things to watch",
      "Inconsistencies",
      "Options to consider",
      "Questions for a lawyer",
      "What to gather",
      "Free legal aid",
      "Ask about this document",
      "The clauses",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    const citation = screen.getAllByRole("link", { name: "See clause: 3. Security deposit" })[0];
    expect(citation).toHaveAttribute("href", "#clause-c4");
    expect(container.querySelector("#clause-c4")).toHaveTextContent("security deposit");
    expect(screen.getByRole("link", { name: "Read the section on IndiaCode" })).toHaveAttribute(
      "href",
      expect.stringContaining("indiacode"),
    );
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("hides the dropped-citation note and empty sections when there is nothing to show", () => {
    renderWithLocale(
      <AnalysisView
        document={FIXTURE_DOCUMENT}
        jurisdiction={{ state: null, basis: "none" }}
        result={{
          ...FIXTURE_RESULT,
          droppedCitations: 0,
          brief: {
            ...FIXTURE_RESULT.brief,
            summary: [{ text: "No citations.", clauseIds: [] }],
            keyTerms: [],
            obligations: [],
            risks: [],
            inconsistencies: [],
            nextSteps: [],
          },
        }}
        documentText="doc"
        state=""
        today="2026-09-13"
      />,
    );
    expect(screen.queryByText(/made up were removed/)).toBeNull();
    expect(screen.getByText("No citations.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Key terms" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Options to consider" })).toBeNull();
  });
});

describe("Timeline", () => {
  it("asks for anchor dates, computes deadlines once entered, and orders items", async () => {
    renderWithLocale(
      <Timeline
        document={FIXTURE_DOCUMENT}
        obligations={FIXTURE_RESULT.brief.obligations}
        today="2026-09-13"
      />,
    );
    const list = screen.getByRole("list");
    const before = within(list)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(before[0]).toContain("Sign the renewal");
    expect(before[0]).toContain("7 days left");
    expect(before[1]).toContain("Enter the date of");
    expect(before.at(-1)).toContain("No deadline stated");

    await userEvent.type(screen.getByLabelText("termination or vacating"), "2026-09-01");
    const after = within(list)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(
      after.some((text) => text?.includes("2026-11-30") && text.includes("78 days left")),
    ).toBe(true);
    await userEvent.clear(screen.getByLabelText("termination or vacating"));
    expect(within(list).getAllByRole("listitem")[1]?.textContent).toContain("Enter the date of");
  });

  it("describes overdue and same-day deadlines", () => {
    renderWithLocale(
      <Timeline
        document={FIXTURE_DOCUMENT}
        obligations={[
          {
            party: "A",
            action: "Late",
            clauseId: "c1",
            deadline: { kind: "absolute", date: "2026-09-10" },
          },
          {
            party: "B",
            action: "Now",
            clauseId: "c1",
            deadline: { kind: "absolute", date: "2026-09-13" },
          },
        ]}
        today="2026-09-13"
      />,
    );
    expect(screen.getByText(/3 days overdue/)).toBeInTheDocument();
    expect(screen.getByText(/Due today/)).toBeInTheDocument();
    expect(screen.queryByRole("group")).toBeNull();
  });
});
