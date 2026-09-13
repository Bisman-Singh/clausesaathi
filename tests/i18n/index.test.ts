import { describe, expect, it } from "vitest";
import { htmlLang, isLocale, t, toLocale } from "@/lib/i18n";
import { translations } from "@/lib/i18n/translations";

describe("translations", () => {
  it("have the same keys in every language and no empty strings", () => {
    const enKeys = Object.keys(translations.en).sort();
    const hiKeys = Object.keys(translations.hi).sort();
    expect(hiKeys).toEqual(enKeys);
    for (const locale of ["en", "hi"] as const) {
      for (const [key, value] of Object.entries(translations[locale])) {
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("t", () => {
  it("returns the localised string and substitutes placeholders", () => {
    expect(t("en", "appName")).toBe("ClauseSaathi");
    expect(t("hi", "appName")).toBe("क्लॉज़साथी");
    expect(t("en", "tagline", { unused: 1 })).toBe(translations.en.tagline);
  });
});

describe("locale helpers", () => {
  it("validates and defaults locales", () => {
    expect(isLocale("hi")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(toLocale("hi")).toBe("hi");
    expect(toLocale(undefined)).toBe("en");
    expect(htmlLang("en")).toBe("en-IN");
    expect(htmlLang("hi")).toBe("hi-IN");
  });
});
