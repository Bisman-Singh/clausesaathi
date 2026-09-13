import { tool } from "ai";
import { z } from "zod";
import type { IndiaCodeClient } from "@/lib/statute/indiacode";
import { pickForJurisdiction, type IndianState } from "@/lib/statute/jurisdiction";

/** The single tool the Q&A model may call: a read-only statute search. */
export function statuteTools(client: IndiaCodeClient, state: IndianState | null) {
  return {
    lookupStatute: tool({
      description:
        "Search Indian legislation for a short phrase and return the most relevant section for the user's state.",
      inputSchema: z.object({
        query: z
          .string()
          .min(2)
          .max(120)
          .describe("Plain search phrase, e.g. 'security deposit refund'"),
      }),
      execute: async ({ query }) => {
        const hits = await client.search(query, 5);
        const best = pickForJurisdiction(hits, state);
        if (!best) return { found: false as const };
        return {
          found: true as const,
          act: best.act,
          section: best.title,
          excerpt: best.snippet,
          url: best.url,
        };
      },
    }),
  };
}
