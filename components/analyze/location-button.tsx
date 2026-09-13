"use client";

import { useState } from "react";
import { useT } from "@/components/locale-provider";
import type { TranslationKey } from "@/lib/i18n";
import { nearestState } from "@/lib/statute/geo";
import type { IndianState } from "@/lib/statute/jurisdiction";

export interface LocationButtonProps {
  onLocate: (state: IndianState) => void;
}

type Status = "idle" | "locating" | "done" | "denied" | "unavailable" | "outside";

const STATUS_KEY: Record<Exclude<Status, "idle">, TranslationKey> = {
  locating: "locationLocating",
  done: "locationDone",
  denied: "locationDenied",
  unavailable: "locationUnavailable",
  outside: "locationOutside",
};

/** How long to wait for a fix before giving up, and how old a cached fix may be. */
const OPTIONS: PositionOptions = { timeout: 10_000, maximumAge: 600_000 };

/**
 * Asks the browser for the user's position, only when pressed, and turns it
 * into a state on the device. Nothing about the position leaves the browser.
 */
export function LocationButton({ onLocate }: LocationButtonProps) {
  const t = useT();
  const [status, setStatus] = useState<Status>("idle");

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const state = nearestState(position.coords.latitude, position.coords.longitude);
        if (!state) {
          setStatus("outside");
          return;
        }
        setStatus("done");
        onLocate(state);
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      OPTIONS,
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={locate}
        disabled={status === "locating"}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-60"
      >
        <span aria-hidden="true">◎</span>
        {t("locationButton")}
      </button>
      <p className="text-sm text-muted" aria-live="polite">
        {status === "idle" ? t("locationHint") : t(STATUS_KEY[status])}
      </p>
    </div>
  );
}
