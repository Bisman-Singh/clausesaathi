// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readAnalysis,
  readAnalysisOnServer,
  resetAnalysisStore,
  subscribeAnalysis,
  writeAnalysis,
} from "@/lib/client/analysis-store";

const isNumber = (value: unknown): value is number => typeof value === "number";

afterEach(() => {
  vi.restoreAllMocks();
  resetAnalysisStore();
});

describe("analysis store", () => {
  it("notifies subscribers on write and reset, and returns a stable snapshot", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAnalysis(listener);
    writeAnalysis(7);
    expect(listener).toHaveBeenCalledTimes(1);
    const first = readAnalysis(isNumber);
    expect(first).toBe(7);
    expect(readAnalysis(isNumber)).toBe(first);
    resetAnalysisStore();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(readAnalysis(isNumber)).toBeNull();
    unsubscribe();
    writeAnalysis(8);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("re-parses when storage changed underneath it and rejects invalid values", () => {
    window.sessionStorage.setItem("clausesaathi.analysis", "9");
    expect(readAnalysis(isNumber)).toBe(9);
    window.sessionStorage.setItem("clausesaathi.analysis", '"text"');
    expect(readAnalysis(isNumber)).toBeNull();
    writeAnalysis(3);
    window.sessionStorage.removeItem("clausesaathi.analysis");
    expect(readAnalysis(isNumber)).toBeNull();
  });

  it("treats blocked storage as empty and renders nothing on the server", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readAnalysis(isNumber)).toBeNull();
    expect(readAnalysisOnServer()).toBeNull();
  });
});
