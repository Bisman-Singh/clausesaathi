import type { Risk, RiskWithStatute, StatuteReference } from "@/lib/analysis/schemas";
import type { IndiaCodeClient } from "@/lib/statute/indiacode";
import { isCentralAct, pickForJurisdiction, type IndianState } from "@/lib/statute/jurisdiction";
import { LIMITS } from "@/lib/constants";

/** How many hits to fetch so a jurisdiction preference has something to choose from. */
const HITS_PER_QUERY = 10;

/**
 * Attach a real statute passage to each risk that asked for one.
 *
 * Lookups run in parallel, are capped per analysis, and a failed lookup simply
 * leaves the risk without a statute. The law shown is always the API's text.
 */
export async function attachStatutes(
  risks: Risk[],
  client: IndiaCodeClient,
  state: IndianState | null,
  maxLookups: number = LIMITS.MAX_STATUTE_LOOKUPS,
): Promise<RiskWithStatute[]> {
  let budget = maxLookups;
  return Promise.all(
    risks.map(async (risk) => {
      const query = risk.statuteQuery?.trim();
      if (!query || budget <= 0) return { ...risk, statute: null };
      budget -= 1;
      return { ...risk, statute: await lookup(client, query, state) };
    }),
  );
}

/** Try the state-qualified query first so the user's own act can surface. */
async function searchWithPreference(
  client: IndiaCodeClient,
  query: string,
  state: IndianState | null,
) {
  if (state) {
    const own = pickForJurisdiction(
      await client.search(`${query} ${state}`, HITS_PER_QUERY),
      state,
    );
    if (own && !isCentralAct(own.act)) return own;
  }
  return pickForJurisdiction(await client.search(query, HITS_PER_QUERY), state);
}

async function lookup(
  client: IndiaCodeClient,
  query: string,
  state: IndianState | null,
): Promise<StatuteReference | null> {
  try {
    const hit = await searchWithPreference(client, query, state);
    if (!hit) return null;
    return { act: hit.act, title: hit.title, snippet: hit.snippet, url: hit.url };
  } catch (error) {
    console.warn("statute lookup failed", { query, error: String(error) });
    return null;
  }
}
