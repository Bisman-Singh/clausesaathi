import { describe, expect, it } from "vitest";
import { resolveJurisdiction } from "@/lib/statute/resolve";

describe("resolveJurisdiction", () => {
  it("takes the client's state with its basis, then an explicit none, then the document's own clues", () => {
    expect(resolveJurisdiction("Kerala", "Flat in Bengaluru 560001")).toEqual({
      state: "Kerala",
      basis: "user",
    });
    expect(resolveJurisdiction("Goa", "x", "location")).toEqual({
      state: "Goa",
      basis: "location",
    });
    expect(resolveJurisdiction(null, "Flat in Bengaluru 560001", "none")).toEqual({
      state: null,
      basis: "none",
    });
    expect(resolveJurisdiction(null, "Flat in Bengaluru 560001")).toEqual({
      state: "Karnataka",
      basis: "document",
    });
    expect(resolveJurisdiction(null, "No place named.")).toEqual({ state: null, basis: "none" });
  });
});
