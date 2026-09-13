import { describe, expect, it } from "vitest";
import type { StatuteHit } from "@/lib/statute/indiacode";
import {
  stateName,
  isCentralAct,
  isIndianState,
  pickForJurisdiction,
  stateOfAct,
} from "@/lib/statute/jurisdiction";

const hit = (act: string): StatuteHit => ({
  ref: act,
  title: act,
  act,
  snippet: "",
  url: "https://x/",
});

describe("stateOfAct and isCentralAct", () => {
  it("finds the state named in an act title and ignores central acts", () => {
    expect(stateOfAct("The Delhi Rent Control Act, 1958")).toBe("Delhi");
    expect(stateOfAct("The Karnataka Rent Act, 1999")).toBe("Karnataka");
    expect(stateOfAct("The Indian Contract Act, 1872")).toBeNull();
    expect(stateOfAct("The Goa, Daman and Diu Buildings Act")).toBe("Goa");
  });

  it("maps historical act names to today's state", () => {
    expect(stateOfAct("The Bombay Rents, Hotel and Lodging House Rates Control Act")).toBe(
      "Maharashtra",
    );
    expect(stateOfAct("The Orissa House Rent Control Act")).toBe("Odisha");
    expect(stateOfAct("The Mysore Rent Control Act")).toBe("Karnataka");
    expect(pickForJurisdiction([hit("The Bombay Rent Act")], "Maharashtra")?.act).toBe(
      "The Bombay Rent Act",
    );
  });

  it("treats historical regional names as non-central", () => {
    expect(isCentralAct("The Ajmer Tenancy and Land Records Act, 1950")).toBe(false);
    expect(isCentralAct("The Bombay Rents, Hotel and Lodging House Rates Control Act")).toBe(false);
    expect(isCentralAct("The Transfer of Property Act, 1882")).toBe(true);
    expect(isCentralAct("The Delhi Rent Control Act, 1958")).toBe(false);
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

  it("shows nothing rather than another state's law when the user gave a state", () => {
    const stateOnly = [hits[0] as StatuteHit, hit("The Ajmer Tenancy and Land Records Act, 1950")];
    expect(pickForJurisdiction(stateOnly, "Kerala")).toBeNull();
    expect(pickForJurisdiction(stateOnly, null)?.act).toBe(hits[0]?.act);
    expect(pickForJurisdiction([], "Kerala")).toBeNull();
    expect(pickForJurisdiction([], null)).toBeNull();
  });
});

describe("stateName", () => {
  it("writes the state in the interface language", () => {
    expect(stateName("Karnataka", "hi")).toBe("कर्नाटक");
    expect(stateName("Karnataka", "en")).toBe("Karnataka");
  });
});

describe("isIndianState", () => {
  it("accepts listed states only", () => {
    expect(isIndianState("Karnataka")).toBe(true);
    expect(isIndianState("Narnia")).toBe(false);
  });
});
