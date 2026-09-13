// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import AboutPage from "@/app/about/page";
import AccessibilityPage from "@/app/accessibility/page";
import ComparePage from "@/app/compare/page";
import ErrorPage from "@/app/error";
import RootLayout, { metadata, viewport } from "@/app/layout";
import NotFound from "@/app/not-found";
import HomePage from "@/app/page";
import { renderWithLocale } from "@/tests/components/helpers";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({ messages: [], sendMessage: vi.fn(), status: "ready", error: undefined }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("pages", () => {
  it("renders the content pages with headings, lists and no axe violations", async () => {
    const { container, rerender } = renderWithLocale(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How ClauseSaathi works");
    expect(screen.getByText(/Gemini model/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    rerender(<AccessibilityPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Accessibility statement");
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("renders the home and compare pages", () => {
    const { rerender } = renderWithLocale(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Paste or upload");
    rerender(<ComparePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Compare two versions");
  });

  it("renders not-found and the error boundary with a working reset", async () => {
    const reset = vi.fn();
    const { rerender } = renderWithLocale(<NotFound />);
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    rerender(<ErrorPage error={new Error("x")} reset={reset} />);
    await userEvent.click(screen.getByRole("button"));
    expect(reset).toHaveBeenCalled();
  });

  it("declares the document language, metadata and viewport in the root layout", () => {
    const tree = RootLayout({ children: <p>child</p> });
    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("en-IN");
    expect(metadata.metadataBase?.toString()).toBe("https://clausesaathi.bisman.org/");
    expect(viewport.width).toBe("device-width");
  });
});
