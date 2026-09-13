import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createModelFactory, envFromProcess } from "@/lib/ai/client";
import { analyzeDocument } from "@/lib/analysis/analyze";
import { segmentDocument } from "@/lib/document/segment";
import { createIndiaCodeClient } from "@/lib/statute/indiacode";

/**
 * Opt-in end-to-end check against the real Gemini and IndiaCode APIs.
 * Run with `LIVE_AI=1 npm test -- tests/live`. Skipped everywhere else so CI
 * never needs credentials or network access.
 */
const live = process.env.LIVE_AI === "1" ? describe : describe.skip;

const SAMPLE = `RENTAL AGREEMENT

This agreement is made on 1 April 2026 between Mr. Example Owner (Landlord) and Ms. Sample Tenant (Tenant) for Flat 4B, Example Residency, Sample Nagar, Bengaluru.

1. Term
The tenancy is for eleven months from 1 April 2026. It may be renewed in writing.

2. Rent
The Tenant shall pay Rs. 18,000 per month on or before the 5th day of each month. Rent unpaid after the 10th attracts interest at 24 percent per annum.

3. Security deposit
The Tenant has paid Rs. 1,80,000 as security deposit. The Landlord will refund it within ninety days after the Tenant vacates, after deducting any dues and painting charges of two months rent.

4. Lock-in
Neither party may terminate this agreement during the first six months. If the Tenant leaves earlier, the entire deposit is forfeited.

5. Notice
After the lock-in, either party may terminate by giving one month written notice.

6. Maintenance
The Tenant bears all repairs, including structural repairs, at their own cost.`;

live("analyzeDocument against live services", () => {
  it("returns a verified brief with statutes attached", async () => {
    const env = envFromProcess();
    const result = await analyzeDocument(
      {
        document: segmentDocument(SAMPLE),
        situation: "I am the tenant and want to leave after four months",
        locale: "en",
        state: "Karnataka",
      },
      { factory: createModelFactory(env), env, statutes: createIndiaCodeClient() },
    );
    if (process.env.LIVE_OUT) {
      await writeFile(process.env.LIVE_OUT, JSON.stringify(result, null, 2));
    }
    expect(result.brief.summary.length).toBeGreaterThan(0);
    expect(result.brief.obligations.length).toBeGreaterThan(0);
    expect(result.brief.risks.length).toBeGreaterThan(0);
  }, 90_000);
});
