// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnalyzeWorkspace,
  isStoredAnalysis,
  textFromClauses,
  todayIso,
} from "@/components/analyze/workspace";
import { resetAnalysisStore } from "@/lib/client/analysis-store";
import { FIXTURE_RESPONSE, fetchJson, renderWithLocale } from "@/tests/components/helpers";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({ messages: [], sendMessage: vi.fn(), status: "ready", error: undefined }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  resetAnalysisStore();
});

describe("isStoredAnalysis and todayIso", () => {
  it("accepts the stored shape only", () => {
    expect(isStoredAnalysis(null)).toBe(false);
    expect(isStoredAnalysis("x")).toBe(false);
    expect(isStoredAnalysis({ documentText: "d", state: "", response: null })).toBe(false);
    expect(isStoredAnalysis({ documentText: "d", state: "", response: FIXTURE_RESPONSE })).toBe(
      true,
    );
  });

  it("rebuilds text from clauses for PDF uploads", () => {
    expect(textFromClauses(FIXTURE_RESPONSE)).toContain("1. Term\nThe tenancy");
  });

  it("formats today as an ISO date", () => {
    expect(todayIso(new Date("2026-09-13T22:30:00+05:30"))).toBe("2026-09-13");
  });
});

describe("AnalyzeWorkspace", () => {
  it("submits a sample, shows the result, focuses its heading and stores it", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchJson(FIXTURE_RESPONSE)));
    renderWithLocale(<AnalyzeWorkspace />);
    await userEvent.selectOptions(screen.getByLabelText("Or try a sample"), "rent-agreement");
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "What this document says" }),
      ).toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement?.id).toBe("result-heading"));
    expect(
      JSON.parse(window.sessionStorage.getItem("clausesaathi.analysis") ?? "null"),
    ).toMatchObject({
      state: "",
    });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[0]).toBe("/api/analyze");
    expect(JSON.parse(call[1].body as string)).toMatchObject({ locale: "en" });
  });

  it("sends a PDF as multipart and keeps the extracted text for questions", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchJson(FIXTURE_RESPONSE)));
    renderWithLocale(<AnalyzeWorkspace />);
    const file = new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByLabelText("Or upload a PDF"), file);
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    await waitFor(() =>
      expect(screen.getByText("The tenancy lasts eleven months.")).toBeInTheDocument(),
    );
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[1].body).toBeInstanceOf(FormData);
    const stored = JSON.parse(window.sessionStorage.getItem("clausesaathi.analysis") ?? "{}");
    expect(stored.documentText).toContain("1. Term");
  });

  it("shows a translated error when the API refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchJson({ error: "rate_limited" }, 429)));
    renderWithLocale(<AnalyzeWorkspace />);
    await userEvent.selectOptions(screen.getByLabelText("Or try a sample"), "legal-notice");
    await userEvent.click(screen.getByRole("button", { name: "Explain this document" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Too many requests"));
  });

  it("restores the previous analysis from session storage", () => {
    window.sessionStorage.setItem(
      "clausesaathi.analysis",
      JSON.stringify({ response: FIXTURE_RESPONSE, documentText: "doc", state: "Kerala" }),
    );
    renderWithLocale(<AnalyzeWorkspace />);
    expect(
      screen.getByRole("heading", { level: 1, name: "What this document says" }),
    ).toBeInTheDocument();
  });
});
