/**
 * Keeps the last analysis in sessionStorage so a refresh does not lose it.
 * Session scope means the document leaves the browser when the tab closes.
 */

const KEY = "clausesaathi.analysis";

export function saveAnalysis(
  value: unknown,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  try {
    storage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled: the result still shows on screen.
  }
}

export function loadAnalysis<T>(
  isValid: (value: unknown) => value is T,
  storage: Pick<Storage, "getItem"> = sessionStorage,
): T | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAnalysis(storage: Pick<Storage, "removeItem"> = sessionStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Nothing to do; the value was never persisted.
  }
}
