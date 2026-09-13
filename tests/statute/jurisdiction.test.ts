import { describe, expect, it } from "vitest";
import type { StatuteHit } from "@/lib/statute/indiacode";
import { isIndianState, pickForJurisdiction, stateOfAct } from "@/lib/statute/jurisdiction";

const hit = (act: string): StatuteHit => ({
  ref: act,
  title: act,
  act,
  snippet: "",
  url: "https://x/",
});

describe("stateOfAct", () => {
  it("finds the state named in an act title and ignores central acts", () => {
    expect(stateOfAct("The Delhi Rent Control Act, 1958")).toBe("Delhi");
    expect(stateOfAct("The Karnataka Rent Act, 1999")).toBe("Karnataka");
    expect(stateOfAct("The Indian Contract Act, 1872")).toBeNull();
    expect(stateOfAct("The Goa, Daman and Diu Buildings Act")).toBe("Goa");
  });
});

describe("pickForJurisdiction", () => {
  const hits = [
    hit("The Delhi Rent Control Act, 1958"),
    hit("The Transfer of Property Act, 1882"),
    hit("The Karnataka Rent Act, 1999"),
  ];

  it("prefers the user's own state when present", () => {
    expect(pickForJurisdiction(hits, "Karnataka")?.act).toBe("The Karnataka Rent Act, 1999");
  });

  it("falls back to a central act rather than another state's law", () => {
    expect(pickForJurisdiction(hits, "Kerala")?.act).toBe("The Transfer of Property Act, 1882");
    expect(pickForJurisdiction(hits, null)?.act).toBe("The Transfer of Property Act, 1882");
  });

  it("returns the first hit when every hit is state law, and null for none", () => {
    expect(pickForJurisdiction([hits[0] as StatuteHit], "Kerala")?.act).toBe(hits[0]?.act);
    expect(pickForJurisdiction([], "Kerala")).toBeNull();
  });
});

describe("isIndianState", () => {
  it("accepts listed states only", () => {
    expect(isIndianState("Karnataka")).toBe(true);
    expect(isIndianState("Narnia")).toBe(false);
  });
});
