import { describe, expect, it } from "vitest";
import { RENT_AGREEMENT_V1, EMPLOYMENT_OFFER, CONSUMER_TERMS } from "@/lib/samples";
import { detectState, stateOfPin } from "@/lib/statute/detect-state";

describe("stateOfPin", () => {
  it("maps unambiguous prefixes and prefers the longer Goa prefix", () => {
    expect(stateOfPin("560001")).toBe("Karnataka");
    expect(stateOfPin("403001")).toBe("Goa");
    expect(stateOfPin("400001")).toBe("Maharashtra");
    expect(stateOfPin("110001")).toBe("Delhi");
  });

  it("refuses prefixes shared by two states", () => {
    expect(stateOfPin("248001")).toBeNull();
    expect(stateOfPin("834001")).toBeNull();
    expect(stateOfPin("790001")).toBeNull();
  });
});

describe("detectState", () => {
  it("reads the city and PIN code out of the samples", () => {
    expect(detectState(RENT_AGREEMENT_V1)).toEqual({ state: "Karnataka", evidence: "560001" });
    expect(detectState(EMPLOYMENT_OFFER)).toEqual({ state: "Maharashtra", evidence: "Pune" });
    expect(detectState(CONSUMER_TERMS)).toEqual({ state: "Telangana", evidence: "Hyderabad" });
  });

  it("lets an explicit state name outweigh a city elsewhere in the text", () => {
    const text =
      "The Landlord resides in Mumbai. The premises are in Kerala, and Kerala law applies.";
    expect(detectState(text)).toEqual({ state: "Kerala", evidence: "Kerala" });
  });

  it("handles multi-word and old city names, case-insensitively", () => {
    expect(detectState("registered office at NEW DELHI")?.state).toBe("Delhi");
    expect(detectState("courts at navi mumbai")?.state).toBe("Maharashtra");
    expect(detectState("High Court of Madras")?.state).toBe("Tamil Nadu");
  });

  it("does not read a rupee amount as a PIN code", () => {
    expect(detectState("A deposit of Rs. 500000 is paid for the flat in Bengaluru.")?.state).toBe(
      "Karnataka",
    );
    expect(detectState("Pay ₹250000 on signing.")).toBeNull();
    expect(detectState("Pay 250000/- on signing.")).toBeNull();
    expect(detectState("Pay 250000 rupees on signing.")).toBeNull();
  });

  it("returns null when nothing points anywhere or two states tie", () => {
    expect(detectState("This agreement is between two parties.")).toBeNull();
    expect(detectState("Offices in Pune and Chennai.")).toBeNull();
    expect(detectState("PIN 999999 is not a real code.")).toBeNull();
  });
});
