// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LocaleProvider,
  readStoredLocale,
  resetLocaleStore,
  useLocale,
  useT,
  writeLocale,
} from "@/components/locale-provider";

function Probe() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="text">{t("appName")}</p>
      <button type="button" onClick={() => setLocale("hi")}>
        hi
      </button>
    </div>
  );
}

afterEach(() => {
  resetLocaleStore();
  window.localStorage.clear();
});

describe("readStoredLocale", () => {
  it("returns the stored locale, defaulting on junk or failure", () => {
    expect(readStoredLocale({ getItem: () => "hi" })).toBe("hi");
    expect(readStoredLocale({ getItem: () => "xx" })).toBe("en");
    expect(
      readStoredLocale({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("en");
  });
});

describe("LocaleProvider", () => {
  it("starts from storage and updates text, storage and the html lang on change", async () => {
    window.localStorage.setItem("clausesaathi.locale", "en");
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("text")).toHaveTextContent("ClauseSaathi");
    await userEvent.click(screen.getByRole("button", { name: "hi" }));
    expect(screen.getByTestId("locale")).toHaveTextContent("hi");
    expect(screen.getByTestId("text")).toHaveTextContent("क्लॉज़साथी");
    expect(document.documentElement.lang).toBe("hi-IN");
    expect(window.localStorage.getItem("clausesaathi.locale")).toBe("hi");
  });

  it("keeps working when storage rejects writes and reacts to storage events", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    act(() => {
      writeLocale("hi", {
        setItem: () => {
          throw new Error("quota");
        },
      });
    });
    expect(screen.getByTestId("locale")).toHaveTextContent("hi");
    act(() => {
      resetLocaleStore();
      window.dispatchEvent(new Event("storage"));
    });
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });

  it("provides a no-op setter outside a provider", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<Probe />);
    await userEvent.click(screen.getByRole("button", { name: "hi" }));
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    spy.mockRestore();
  });

  it("renders the default locale on the server", () => {
    const html = renderToString(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    expect(html).toContain("ClauseSaathi");
  });

  it("accepts a write with no storage at all", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    act(() => writeLocale("hi", null));
    expect(screen.getByTestId("locale")).toHaveTextContent("hi");
  });
});
