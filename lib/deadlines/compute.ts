import type { Deadline, Obligation } from "@/lib/analysis/schemas";

/**
 * Deterministic deadline arithmetic.
 *
 * The model only reports what a clause says ("30 days from the notice date").
 * Turning that into a calendar date is done here, from anchor dates the user
 * supplies, so a number on screen is never a model's guess.
 */

/** The events a relative deadline can count from, in the order shown. */
export const ANCHOR_KEYS = [
  "agreement",
  "start",
  "notice",
  "invoice",
  "delivery",
  "termination",
  "other",
] as const;
export type AnchorKey = (typeof ANCHOR_KEYS)[number];

const ANCHOR_PATTERNS: ReadonlyArray<[AnchorKey, RegExp]> = [
  ["notice", /notice|intimat/i],
  ["invoice", /invoice|bill|demand/i],
  ["delivery", /deliver|receipt|receiv|possession|handover/i],
  ["termination", /terminat|expir|end of|vacat|exit|resign/i],
  ["start", /commenc|start|joining|effective|occupation|move/i],
  ["agreement", /sign|execut|agreement|contract|date of this|dated/i],
];

/** Map the model's free-text "from" phrase onto a known anchor. */
export function anchorKeyFor(from: string): AnchorKey {
  const match = ANCHOR_PATTERNS.find(([, pattern]) => pattern.test(from));
  return match ? match[0] : "other";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Add whole days to an ISO date, in UTC so local time zones cannot shift it. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from one ISO date to another, negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** A real calendar date in ISO form; "2026-02-30" fails because it does not round-trip. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export type AnchorDates = Partial<Record<AnchorKey, string>>;

export type ResolvedDeadline =
  | { status: "dated"; date: string; daysLeft: number }
  | { status: "needs_anchor"; anchor: AnchorKey; days: number }
  | { status: "unspecified" };

/** Resolve one deadline against the anchors the user has provided. */
export function resolveDeadline(
  deadline: Deadline,
  anchors: AnchorDates,
  today: string,
): ResolvedDeadline {
  if (deadline.kind === "unspecified") return { status: "unspecified" };
  if (deadline.kind === "absolute") {
    return { status: "dated", date: deadline.date, daysLeft: daysBetween(today, deadline.date) };
  }
  const anchor = anchorKeyFor(deadline.from);
  const base = anchors[anchor];
  if (!base) return { status: "needs_anchor", anchor, days: deadline.days };
  const date = addDays(base, deadline.days);
  return { status: "dated", date, daysLeft: daysBetween(today, date) };
}

export interface TimelineItem {
  obligation: Obligation;
  resolved: ResolvedDeadline;
}

const STATUS_ORDER: Record<ResolvedDeadline["status"], number> = {
  dated: 0,
  needs_anchor: 1,
  unspecified: 2,
};

/** Build the obligations timeline: dated items first, soonest at the top. */
export function buildTimeline(
  obligations: Obligation[],
  anchors: AnchorDates,
  today: string,
): TimelineItem[] {
  return obligations
    .map((obligation) => ({
      obligation,
      resolved: resolveDeadline(obligation.deadline, anchors, today),
    }))
    .sort((a, b) => {
      const order = STATUS_ORDER[a.resolved.status] - STATUS_ORDER[b.resolved.status];
      if (order !== 0) return order;
      if (a.resolved.status === "dated" && b.resolved.status === "dated") {
        return a.resolved.daysLeft - b.resolved.daysLeft;
      }
      return 0;
    });
}

/** The anchors a set of obligations would need, so the UI can ask for them. */
export function requiredAnchors(obligations: Obligation[]): AnchorKey[] {
  const keys = new Set<AnchorKey>();
  for (const { deadline } of obligations) {
    if (deadline.kind === "relative") keys.add(anchorKeyFor(deadline.from));
  }
  return ANCHOR_KEYS.filter((key) => keys.has(key));
}
