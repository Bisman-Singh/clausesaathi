// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiffView } from "@/components/compare/diff-view";
import { CompareWorkspace } from "@/components/compare/workspace";
import { diffDocuments, summarizeChanges } from "@/lib/compare/diff";
import { segmentDocument } from "@/lib/document/segment";
import { RENT_AGREEMENT_V1, RENT_AGREEMENT_V2 } from "@/lib/samples";
import { fetchJson, renderWithLocale } from "@/tests/components/helpers";

afterEach(() => vi.unstubAllGlobals());

const changes = diffDocuments(
  segmentDocument(RENT_AGREEMENT_V1),
  segmentDocument(RENT_AGREEMENT_V2),
);
const modifiedIndex = changes.findIndex((change) => change.kind === "modified");

describe("DiffView", () => {
  it("shows counts, highlights with text markers, and explanations", async () => {
    const { container } = renderWithLocale(
      <DiffView
        changes={changes}
        explanations={[
          {
            index: modifiedIndex,
            whatChanged: "Interest drops.",
            whoBenefits: "Lessee",
            severity: "low",
          },
        ]}
        summary={summarizeChanges(changes)}
      />,
    );
    expect(screen.getByText(/\d+ changed/)).toBeInTheDocument();
    expect(container.querySelector("ins")).toHaveTextContent("+");
    expect(container.querySelector("del")).toHaveTextContent("-");
    expect(screen.getByText("Interest drops.")).toBeInTheDocument();
    expect(screen.getByText("Lessee")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says so when nothing changed and falls back to side-by-side for long clauses", () => {
    const same = diffDocuments(
      segmentDocument(RENT_AGREEMENT_V1),
      segmentDocument(RENT_AGREEMENT_V1),
    );
    const { rerender } = renderWithLocale(
      <DiffView changes={same} explanations={[]} summary={summarizeChanges(same)} />,
    );
    expect(screen.getByText("The two versions are identical.")).toBeInTheDocument();

    const long = Array.from({ length: 400 }, (_, i) => `w${i}`).join(" ");
    const big = diffDocuments(segmentDocument(`${long} a`), segmentDocument(`${long} b`));
    rerender(<DiffView changes={big} explanations={[]} summary={summarizeChanges(big)} />);
    expect(screen.getAllByText(/w399/)).toHaveLength(2);
  });
});

describe("CompareWorkspace", () => {
  it("rejects short input, loads the sample, and renders the comparison", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        fetchJson({
          changes,
          explanations: [],
          summary: summarizeChanges(changes),
          model: "google/gemini-3.6-flash",
        }),
      ),
    );
    renderWithLocale(<CompareWorkspace />);
    await userEvent.type(screen.getByLabelText("Earlier version"), "a");
    await userEvent.type(screen.getByLabelText("Later version"), "b");
    await userEvent.click(screen.getByRole("button", { name: "Compare versions" }));
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("at least 80 characters");
    await userEvent.click(screen.getByRole("button", { name: "Load the sample rent agreement" }));
    expect(screen.getByLabelText("Earlier version")).toHaveValue(RENT_AGREEMENT_V1);
    await userEvent.click(screen.getByRole("button", { name: "Compare versions" }));
    await waitFor(() => expect(screen.getByText(/\d+ unchanged/)).toBeInTheDocument());
  });

  it("shows an error when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchJson({ error: "ai_unavailable" }, 503)));
    renderWithLocale(<CompareWorkspace />);
    await userEvent.click(screen.getByRole("button", { name: "Load the sample rent agreement" }));
    await userEvent.click(screen.getByRole("button", { name: "Compare versions" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("busy right now"));
  });

  it("ignores a second submit while a comparison is running", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    renderWithLocale(<CompareWorkspace />);
    await userEvent.click(screen.getByRole("button", { name: "Load the sample rent agreement" }));
    await userEvent.click(screen.getByRole("button", { name: "Compare versions" }));
    expect(screen.getByRole("status")).toHaveTextContent("Comparing…");
    await userEvent.click(screen.getByRole("button", { name: "Comparing…" }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
