// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { AtAGlance } from "@/components/analyze/at-a-glance";
import { BriefHeader } from "@/components/analyze/brief-header";
import { Checklist } from "@/components/analyze/checklist";
import { Hero } from "@/components/analyze/hero";
import { ResultNav } from "@/components/analyze/result-nav";
import { ResultSkeleton } from "@/components/analyze/skeleton";
import { presentSections } from "@/components/analyze/analysis-view";
import { FIXTURE_RESULT, renderWithLocale } from "@/tests/components/helpers";

describe("Checklist", () => {
  it("lets the reader tick items off and keeps count", async () => {
    const { container } = renderWithLocale(
      <Checklist id="checklist" title="What to gather" items={["Signed copy", "Receipt"]} />,
    );
    expect(screen.getByText("2 of 2 still to gather")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Signed copy" }));
    expect(screen.getByText("1 of 2 still to gather")).toBeInTheDocument();
    expect(screen.getByText("Signed copy")).toHaveClass("line-through");
    await userEvent.click(screen.getByRole("checkbox", { name: "Signed copy" }));
    expect(screen.getByText("2 of 2 still to gather")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders nothing without items", () => {
    const { container } = renderWithLocale(<Checklist id="x" title="Empty" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AtAGlance and presentSections", () => {
  it("counts risks by severity and the other headline numbers", () => {
    renderWithLocale(<AtAGlance result={FIXTURE_RESULT} />);
    const list = screen.getByRole("list", { name: "At a glance" });
    expect(within(list).getByText("1 High risk(s)")).toBeInTheDocument();
    expect(within(list).getByText("1 Medium risk(s)")).toBeInTheDocument();
    expect(within(list).queryByText(/Low risk/)).not.toBeInTheDocument();
    expect(within(list).getByText(/obligations$/)).toBeInTheDocument();
    expect(within(list).getByText(/questions for a lawyer$/)).toBeInTheDocument();
  });

  it("shows a low-severity chip when that is all there is", () => {
    const risks = FIXTURE_RESULT.brief.risks.map((risk) => ({ ...risk, severity: "low" as const }));
    renderWithLocale(
      <AtAGlance result={{ ...FIXTURE_RESULT, brief: { ...FIXTURE_RESULT.brief, risks } }} />,
    );
    expect(screen.getByText("2 Low risk(s)")).toBeInTheDocument();
  });

  it("lists only the sections the brief has content for", () => {
    const ids = presentSections(FIXTURE_RESULT.brief).map((section) => section.id);
    expect(ids).toContain("risks");
    expect(ids).toContain("checklist");
    const empty = presentSections({
      ...FIXTURE_RESULT.brief,
      keyTerms: [],
      obligations: [],
      risks: [],
      inconsistencies: [],
      nextSteps: [],
      questionsForLawyer: [],
      checklist: [],
    }).map((section) => section.id);
    expect(empty).toEqual(["summary", "legal-aid", "ask", "clauses"]);
  });
});

describe("BriefHeader", () => {
  it("says when the state came from the user's location", () => {
    renderWithLocale(
      <BriefHeader result={FIXTURE_RESULT} jurisdiction={{ state: "Goa", basis: "location" }} />,
    );
    expect(screen.getByText("Goa, from your location")).toBeInTheDocument();
  });
});

describe("Hero, ResultNav and skeleton", () => {
  it("render the page title, section links and hidden placeholders", async () => {
    const { container } = renderWithLocale(
      <>
        <Hero />
        <ResultNav sections={[{ id: "risks", key: "sectionRisks" }]} />
        <ResultSkeleton />
      </>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Understand any legal document",
    );
    expect(
      within(screen.getByRole("navigation", { name: "On this page" })).getByRole("link", {
        name: "Things to watch",
      }),
    ).toHaveAttribute("href", "#risks");
    expect(container.querySelector(".skeleton")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
