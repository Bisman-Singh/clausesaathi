import { describe, expect, it } from "vitest";
import type { Obligation } from "@/lib/analysis/schemas";
import {
  addDays,
  anchorKeyFor,
  buildTimeline,
  daysBetween,
  isIsoDate,
  requiredAnchors,
  resolveDeadline,
} from "@/lib/deadlines/compute";

const obligation = (action: string, deadline: Obligation["deadline"]): Obligation => ({
  party: "Tenant",
  action,
  clauseId: "c1",
  deadline,
});

describe("date arithmetic", () => {
  it("adds days across month and year boundaries in UTC", () => {
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts whole days between dates in either direction", () => {
    expect(daysBetween("2026-09-13", "2026-10-04")).toBe(21);
    expect(daysBetween("2026-10-04", "2026-09-13")).toBe(-21);
  });

  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-09-13")).toBe(true);
    expect(isIsoDate("13-09-2026")).toBe(false);
    expect(isIsoDate("2026-13-45")).toBe(false);
  });
});

describe("anchorKeyFor", () => {
  it("maps common phrasings onto anchors", () => {
    expect(anchorKeyFor("the date notice is served")).toBe("notice");
    expect(anchorKeyFor("date of invoice")).toBe("invoice");
    expect(anchorKeyFor("delivery of the goods")).toBe("delivery");
    expect(anchorKeyFor("termination of this agreement")).toBe("termination");
    expect(anchorKeyFor("commencement date")).toBe("start");
    expect(anchorKeyFor("the date of signing")).toBe("agreement");
    expect(anchorKeyFor("some unknown event")).toBe("other");
  });
});

describe("resolveDeadline", () => {
  const today = "2026-09-13";

  it("passes through unspecified and absolute deadlines", () => {
    expect(resolveDeadline({ kind: "unspecified" }, {}, today)).toEqual({ status: "unspecified" });
    expect(resolveDeadline({ kind: "absolute", date: "2026-09-20" }, {}, today)).toEqual({
      status: "dated",
      date: "2026-09-20",
      daysLeft: 7,
    });
  });

  it("asks for a missing anchor and computes once it is supplied", () => {
    const deadline = { kind: "relative" as const, days: 30, from: "the notice date" };
    expect(resolveDeadline(deadline, {}, today)).toEqual({
      status: "needs_anchor",
      anchor: "notice",
      days: 30,
    });
    expect(resolveDeadline(deadline, { notice: "2026-09-01" }, today)).toEqual({
      status: "dated",
      date: "2026-10-01",
      daysLeft: 18,
    });
  });
});

describe("buildTimeline", () => {
  it("orders dated items by urgency, then items needing anchors, then unspecified", () => {
    const items = buildTimeline(
      [
        obligation("Vacate", { kind: "unspecified" }),
        obligation("Refund deposit", { kind: "relative", days: 30, from: "vacating" }),
        obligation("Pay rent", { kind: "absolute", date: "2026-10-05" }),
        obligation("Serve notice", { kind: "absolute", date: "2026-09-20" }),
        obligation("Repair", { kind: "relative", days: 15, from: "date of notice" }),
      ],
      { notice: "2026-09-10" },
      "2026-09-13",
    );
    expect(items.map((item) => item.obligation.action)).toEqual([
      "Serve notice",
      "Repair",
      "Pay rent",
      "Refund deposit",
      "Vacate",
    ]);
  });

  it("keeps a stable order for items with equal status", () => {
    const items = buildTimeline(
      [obligation("A", { kind: "unspecified" }), obligation("B", { kind: "unspecified" })],
      {},
      "2026-09-13",
    );
    expect(items.map((item) => item.obligation.action)).toEqual(["A", "B"]);
  });
});

describe("requiredAnchors", () => {
  it("lists distinct anchors in canonical order", () => {
    expect(
      requiredAnchors([
        obligation("x", { kind: "relative", days: 1, from: "termination" }),
        obligation("y", { kind: "relative", days: 2, from: "signing" }),
        obligation("z", { kind: "relative", days: 3, from: "date of signing" }),
        obligation("w", { kind: "absolute", date: "2026-01-01" }),
      ]),
    ).toEqual(["agreement", "termination"]);
  });
});
