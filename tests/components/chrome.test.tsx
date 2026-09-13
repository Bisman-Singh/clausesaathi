// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetLocaleStore } from "@/components/locale-provider";
import { SiteFooter, SOURCE_URL } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SkipLink } from "@/components/skip-link";
import { renderWithLocale } from "@/tests/components/helpers";

let pathname = "/compare";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

afterEach(() => {
  resetLocaleStore();
  window.localStorage.clear();
  pathname = "/compare";
});

describe("site chrome", () => {
  it("marks the current page, switches language, and has no axe violations", async () => {
    const { container } = renderWithLocale(
      <>
        <SkipLink />
        <SiteHeader />
        <main id="main-content" />
        <SiteFooter />
      </>,
    );
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("link", { name: "Compare two versions" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Understand a document" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Source code" })).toHaveAttribute("href", SOURCE_URL);
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Language" }), "hi");
    expect(screen.getByRole("link", { name: "दो संस्करणों की तुलना करें" })).toBeInTheDocument();
    expect(screen.getByText(/कानूनी सलाह नहीं/)).toBeInTheDocument();
  });
});
