import { describe, expect, it } from "vitest";
import { centralActFor, domainHints, preferRelevant } from "@/lib/statute/domain";
import type { StatuteHit } from "@/lib/statute/indiacode";

const hit = (act: string): StatuteHit => ({ ref: act, title: act, act, snippet: "", url: "" });

describe("domainHints", () => {
  it("maps a document type to the family of acts that govern it", () => {
    expect(domainHints("Rental Agreement")).toContain("Rent");
    expect(domainHints("Offer of Employment")).toContain("Wages");
    expect(domainHints("Gym membership terms")).toContain("Consumer");
    expect(domainHints("Personal loan agreement")).toContain("Negotiable Instruments");
  });

  it("returns nothing for a type it does not recognise", () => {
    expect(domainHints("Will")).toEqual([]);
    expect(centralActFor("Will")).toBeNull();
    expect(centralActFor("Rental Agreement")).toBe("Transfer of Property Act");
  });
});

describe("preferRelevant", () => {
  const deposit = hit("The Banning of Unregulated Deposit Schemes Act, 2019");
  const rent = hit("The Karnataka Rent Act, 1999");
  const property = hit("The Transfer of Property Act, 1882");

  it("keeps only hits from the document's domain when there are any", () => {
    expect(preferRelevant([deposit, rent, property], domainHints("Rent agreement"))).toEqual([
      rent,
      property,
    ]);
  });

  it("leaves the ranking alone when nothing matches or there are no hints", () => {
    expect(preferRelevant([deposit], domainHints("Rent agreement"))).toEqual([deposit]);
    expect(preferRelevant([deposit, rent], [])).toEqual([deposit, rent]);
  });
});
