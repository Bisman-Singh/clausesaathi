import { clearAnalysis, loadAnalysis, saveAnalysis } from "@/lib/client/storage";

/**
 * The current analysis as a tiny external store backed by sessionStorage.
 *
 * Read through `useSyncExternalStore`, the server sees nothing and the browser
 * restores the last result after a refresh, without a hydration mismatch and
 * without setting state inside an effect.
 */

const listeners = new Set<() => void>();
let cached: { raw: string | null; value: unknown } = { raw: null, value: null };

export function subscribeAnalysis(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A referentially stable snapshot, re-parsed only when storage changed. */
export function readAnalysis<T>(isValid: (value: unknown) => value is T): T | null {
  const raw = safeRaw();
  if (raw !== cached.raw) {
    cached = { raw, value: raw === null ? null : loadAnalysis(isValid) };
  }
  return cached.value as T | null;
}

export function readAnalysisOnServer(): null {
  return null;
}

export function writeAnalysis(value: unknown): void {
  saveAnalysis(value);
  cached = { raw: safeRaw(), value };
  listeners.forEach((listener) => listener());
}

export function resetAnalysisStore(): void {
  clearAnalysis();
  cached = { raw: null, value: null };
  listeners.forEach((listener) => listener());
}

function safeRaw(): string | null {
  try {
    return window.sessionStorage.getItem("clausesaathi.analysis");
  } catch {
    return null;
  }
}
