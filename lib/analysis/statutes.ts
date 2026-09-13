import type { Risk, RiskWithStatute, StatuteReference } from "@/lib/analysis/schemas";
import { preferRelevant } from "@/lib/statute/domain";
import type { IndiaCodeClient } from "@/lib/statute/indiacode";
import { pickForJurisdiction, type IndianState } from "@/lib/statute/jurisdiction";
import { LIMITS } from "@/lib/constants";

/** How many hits to fetch so a jurisdiction preference has something to choose from. */
const HITS_PER_QUERY = 10;

/**
 * Attach a real statute passage to each risk that asked for one.
 *
 * Lookups run in parallel, are capped per analysis, and a failed lookup simply
 * leaves the risk without a statute. The law shown is always the API's text.
 */
export interface StatuteOptions {
  state: IndianState | null;
  /** Act-title words for the kind of document, from `domainHints`; keeps hits on topic. */
  hints?: string[];
  /** A central act to name in a last search when state-specific searches find nothing. */
  centralAct?: string | null;
  maxLookups?: number;
}

const SEVERITY_RANK: Record<Risk["severity"], number> = { high: 0, medium: 1, low: 2 };

/** Which risks get a lookup: those with a query, highest severity first, up to the budget. */
function chooseLookups(risks: Risk[], maxLookups: number): Set<number> {
  return new Set(
    risks
      .map((risk, index) => ({ index, risk }))
      .filter(({ risk }) => (risk.statuteQuery?.trim().length ?? 0) > 0)
      .sort((a, b) => SEVERITY_RANK[a.risk.severity] - SEVERITY_RANK[b.risk.severity])
      .slice(0, maxLookups)
      .map(({ index }) => index),
  );
}

export async function attachStatutes(
  risks: Risk[],
  client: IndiaCodeClient,
  options: StatuteOptions,
): Promise<RiskWithStatute[]> {
  const chosen = chooseLookups(risks, options.maxLookups ?? LIMITS.MAX_STATUTE_LOOKUPS);
  const hints = options.hints ?? [];
  return Promise.all(
    risks.map(async (risk, index) => {
      if (!chosen.has(index)) return { ...risk, statute: null };
      const query = (risk.statuteQuery as string).trim();
      return { ...risk, statute: await lookup(client, query, options, hints) };
    }),
  );
}

/**
 * The state-qualified query first, so the user's own act can surface. When
 * that search already yields a usable hit, own-state or central, it is taken;
 * an empty result falls back to the plain query, and if that only finds other
 * states' acts, one last search names the domain's central act outright.
 */
async function searchWithPreference(
  client: IndiaCodeClient,
  query: string,
  options: StatuteOptions,
  hints: string[],
) {
  const { state } = options;
  const attempts = [
    ...(state ? [`${query} ${state}`] : []),
    query,
    ...(options.centralAct ? [`${query} ${options.centralAct}`] : []),
  ];
  for (const attempt of attempts) {
    const hit = pickForJurisdiction(
      preferRelevant(await client.search(attempt, HITS_PER_QUERY), hints),
      state,
    );
    if (hit) return hit;
  }
  return null;
}

async function lookup(
  client: IndiaCodeClient,
  query: string,
  options: StatuteOptions,
  hints: string[],
): Promise<StatuteReference | null> {
  try {
    const hit = await searchWithPreference(client, query, options, hints);
    if (!hit) return null;
    return { act: hit.act, title: hit.title, snippet: hit.snippet, url: hit.url };
  } catch (error) {
    console.warn("statute lookup failed", { queryChars: query.length, error: String(error) });
    return null;
  }
}
