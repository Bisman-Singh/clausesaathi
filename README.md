# ClauseSaathi

[![CI](https://github.com/Bisman-Singh/clausesaathi/actions/workflows/ci.yml/badge.svg)](https://github.com/Bisman-Singh/clausesaathi/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Bisman-Singh/clausesaathi/actions/workflows/codeql.yml/badge.svg)](https://github.com/Bisman-Singh/clausesaathi/actions/workflows/codeql.yml)

Understand any legal document before you sign it. ClauseSaathi reads a contract,
notice or policy and explains it in plain language, in English or Hindi, with
every statement linked to the clause it came from and every legal point checked
against the text of Indian legislation.

**Live:** <https://clausesaathi.bisman.org>

> Information, not legal advice. For decisions about your rights, speak to a
> lawyer or your District Legal Services Authority.

## The problem

Legal documents decide people's money, homes and jobs, and most people sign them
without understanding them. Paying a lawyer to read a rent agreement is out of
reach for many, and generic AI chat answers are unverifiable: they cannot show
which clause a claim came from, they invent law, and they guess dates.

ClauseSaathi is built around one rule: **nothing on screen is unverifiable**.

## What it does

| Use case in the brief                    | What the app does                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Simplify complex legal documents         | Plain-language summary and key terms, each sentence citing its clause                                                          |
| Compare contracts, agreements, policies  | `/compare` aligns two versions clause by clause (deterministic diff), then explains only what changed and who it favours       |
| Highlight clauses, obligations, risks    | Obligations with computed deadlines, risk flags with severity, each tied to a clause and to the governing statute on IndiaCode |
| Highlight inconsistencies                | Contradictions between clauses, cited                                                                                          |
| Answer questions on the documents        | Streaming Q&A grounded in the document, with a read-only statute lookup tool                                                   |
| Understand options and next steps        | Options phrased as choices, never instructions                                                                                 |
| Summaries, checklists, actionable output | A checklist of documents and facts to gather, and a self-check for free legal aid under Section 12 of the LSA Act 1987         |
| Prepare for a legal professional         | Document-specific questions to ask a lawyer                                                                                    |

Scans and phone photos work too: a PDF with no text layer, or a JPG, PNG or
WebP, is transcribed by the model and the result is labelled so the reader
checks names, amounts and dates against the original.

Which state's law applies is never assumed. The user picks a state, or presses
"Use my location" (a browser permission prompt, only on request; the position
is matched to a state on the device and never sent anywhere), or leaves it and
the document's own city, PIN code or state name is used as a labelled guess. A
manual choice always wins, so a document about a relative's flat in another
state gets that state's law.

Try it with the built-in synthetic samples: a rent agreement (two versions for
compare mode), an employment offer, gym membership terms and a legal notice.

## How generative AI is used, and how it is kept honest

- **Model:** Gemini via the Vercel AI SDK. `gemini-3.6-flash` first, then
  `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` on separate free-tier quota
  pools, with an optional OpenAI fallback when a key is configured
  (`lib/ai/models.ts`, `lib/ai/client.ts`).
- **Structured output only.** The model returns a flat JSON object that is
  validated against a strict Zod schema before anything renders
  (`lib/analysis/schemas.ts`). A response that does not validate is a failed
  generation and the next model is tried.
- **Citations are verified.** The document is split into clauses with stable ids
  by deterministic code (`lib/document/segment.ts`). The model may only cite
  those ids; any id it invents is dropped and the count is shown on screen
  (`lib/analysis/citations.ts`).
- **The model never writes the law.** When a risk touches Indian legislation the
  app queries the IndiaCode open API and shows the section it returns, with a
  link, preferring the user's own state's act over another state's and keeping
  hits inside the family of acts that fits the document type
  (`lib/statute/`). If nothing is found, no law is shown.
- **Deadlines are arithmetic, not generation.** The model reports what a clause
  says ("30 days from the notice date"); dates are computed from anchors the user
  enters (`lib/deadlines/compute.ts`).
- **Compare mode diffs deterministically** (`lib/compare/diff.ts`); the model is
  asked only to explain the clauses the diff marked as changed.
- **Q&A is grounded** in the document sent with every turn plus one tool, a
  read-only statute search (`lib/qa/`). Document text is treated as data; the
  system prompt says so.

## Security

The full threat model and control list is in `SECURITY.md`. The short version:

- **Browser hardening.** Per-request nonce CSP with `strict-dynamic` and no
  `unsafe-inline` for scripts, HSTS with preload, `X-Frame-Options: DENY`,
  COOP and CORP `same-origin`, a `Permissions-Policy` that allows geolocation
  for this origin only (`proxy.ts`, `next.config.ts`).
- **Every API route** checks `Sec-Fetch-Site` (with an `Origin`/`Host`
  fallback), caps the declared and actual body size before parsing, validates
  the body with strict, bounded Zod schemas, and rate-limits per client
  address with a sliding window shared across instances through Upstash Redis
  (`lib/http/`). Uploads are typed by magic bytes, not by the declared
  MIME type (`lib/document/upload.ts`); PDFs are capped by size, page count and
  parse time (`lib/document/pdf.ts`).
- **The model is boxed in.** Document text and the user's situation are data,
  never instructions: the situation is screened for text that addresses the
  assistant, Q&A questions pass a pattern screen and a separate topic-gate
  model, the document travels inside `<document>` tags, and every answer is
  checked for a citation (`lib/qa/guard.ts`, `lib/qa/gate.ts`). Structured
  output is validated before render; invented clause ids are dropped.
- **Third parties see the minimum.** IndiaCode receives short search phrases
  over a capped, time-limited fetch, and its links are host-checked before they
  render (`lib/statute/indiacode.ts`). Nothing is stored server-side and no
  document content is logged.
- **Supply chain.** Exact versions for every dependency, Actions pinned to
  commit SHAs, `npm audit`, CodeQL and Dependabot in CI, and
  `/.well-known/security.txt` for reporters.

## Efficiency

- **One model call per analysis**, structured output with a token cap, and a
  100 s request deadline across the provider chain so a stalled model never
  holds a function for its full 120 s (`lib/ai/client.ts`).
- **Deterministic work stays off the model:** clause segmentation, citation
  verification, deadline arithmetic and the compare diff are plain code that
  runs in milliseconds (`lib/document/segment.ts`, `lib/compare/diff.ts`).
- **Statutes are fetched in parallel** across the risks and across the three
  query phrasings per risk, each with a 6 s timeout and a 1 MB cap, behind an
  hour-long cache shared across instances through Redis, with an in-memory
  LRU when Redis is absent (`lib/analysis/statutes.ts`, `lib/cache/store.ts`).
- **Results are cached** by a SHA-256 of the text, situation, locale and state
  for an hour, so the samples and repeated documents cost nothing
  (`lib/analysis/cache.ts`); topic-gate verdicts are cached the same way, so a
  repeated question skips its model call (`lib/qa/gate.ts`).
- **The client stays small.** Photos are shrunk in the browser before upload,
  the Q&A panel is lazy-loaded only after a result exists, state detection runs
  behind typing with `useDeferredValue`, and the home page ships about 180 KB
  of JavaScript: Lighthouse 96 performance, 100 accessibility, 100 best
  practices, 100 SEO on production.
- **Memory is bounded** everywhere something is kept: the three LRU caches, the
  rate limiter's address table, and the input caps in `lib/constants.ts`.
- **Complexity is bounded too.** Segmentation is one linear pass over the text
  with a hard cap of 250 clauses. Compare mode aligns clauses with bigram
  profiles computed once per clause, so matching is O(before × after) over at
  most 250 × 250 small maps, and the word-level diff runs only on pairs of at
  most 600 words. State detection is a fixed set of anchored patterns over the
  text. Nothing in the request path is worse than quadratic in a capped input.

## Judging criteria

One subsection per criterion, each with the evidence and where to check it.

### Code Quality

- Strict TypeScript with `noUncheckedIndexedAccess`; no `any`, no non-null
  assertions (`tsconfig.json`).
- ESLint enforces cyclomatic complexity ≤ 10 and ≤ 80 lines per function;
  Prettier formatting is checked in CI (`eslint.config.mjs`).
- Small single-purpose modules with a doc comment at the top of each, and a
  written architecture with the design decisions and their reasons
  (`ARCHITECTURE.md`).
- Conventional one-line commits, CI on every push, no generated files tracked.

### Security

- Threat model, controls and accepted risks written down (`SECURITY.md`).
- Nonce CSP with `strict-dynamic`, HSTS, COOP, CORP, frame denial and a
  minimal `Permissions-Policy` (`proxy.ts`, `next.config.ts`).
- Same-origin checks, body caps, magic-byte file typing, strict bounded Zod
  schemas, shared sliding-window rate limiting, `no-store` responses
  (`lib/http/`).
- Prompt-injection screens on the situation field and Q&A, a separate topic
  gate, delimited document data, citation checks (`lib/qa/`).
- Exact dependency pins, SHA-pinned Actions, `npm audit`, CodeQL, Gitleaks
  and Dependabot in CI; `server-only` on key-holding modules;
  `/.well-known/security.txt`.

### Efficiency

- One structured model call per analysis, with a token cap and a 100 s
  deadline across the fallback chain (`lib/ai/client.ts`).
- Parallel statute lookups with timeouts, size caps and a Redis-shared cache;
  hashed result and topic-gate caches (`lib/analysis/`, `lib/cache/`).
- Deterministic segmentation, citation verification, diff and date arithmetic
  with stated complexity bounds (section above).
- Lazy-loaded Q&A chunk, browser-side image shrinking, deferred state
  detection; Lighthouse 96 / 100 / 100 / 100 on production.

### Testing

- 295 tests: unit, API route, component with axe, and an opt-in live suite
  against real Gemini and IndiaCode (`tests/`, `TESTING.md`).
- 100% statements, branches, functions and lines over the whole repository,
  enforced as a CI threshold, no file excluded (`vitest.config.mts`).
- Deterministic by construction: the AI SDK mock model, injected fetch and
  clock, and a generated PDF fixture instead of binaries.

### Accessibility

- WCAG 2.2 AA: keyboard-only flows, skip link, labelled controls with
  announced errors, live regions, focus management after navigation
  (`ACCESSIBILITY.md`).
- 4.5:1 contrast in light and dark schemes, reduced-motion support, `lang`
  switching for Hindi, print styles for "Save as PDF" (`app/globals.css`).
- Every page and result view passes axe in the component tests
  (`tests/components/`).

### Problem Statement Alignment

- All seven use cases in the brief in one product, plus legal-aid eligibility
  under Section 12 of the LSA Act 1987 (table at the top, `lib/legal-aid/`).
- Information, not advice: built into the prompts, the UI copy and the
  boundary of what is shown; every claim traceable to a clause or a statute
  (`lib/analysis/prompts.ts`).
- English and Hindi, scans and photos, state-aware law: built for the people
  the challenge names, not only for clean English PDFs.

## Getting started

```bash
npm install
cp .env.example .env.local     # add a free Gemini key from https://aistudio.google.com/apikey
npm run dev                    # http://localhost:3000
npm run verify                 # typecheck, lint, format check, tests with coverage, build
```

The only required variable is `GOOGLE_GENERATIVE_AI_API_KEY`. `OPENAI_API_KEY`
is optional and adds a fallback model. Without any key the UI still renders and
the API returns a clear "AI unavailable" error.

To run the end-to-end check against the real services:

```bash
LIVE_AI=1 npm test -- tests/live
```

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Vercel AI SDK with the Google
provider, Zod, Tailwind CSS v4, Upstash Redis for shared limits and caches, unpdf for PDF text, Gemini vision for scans and
photos, Vitest with Testing Library
and axe. Deployed on Vercel.

## Project layout

```text
app/            routes: /, /compare, /about, /accessibility, and /api/{analyze,compare,ask}
components/     UI, all client-safe, no data fetching outside lib/client
lib/ai          model chain and fallback
lib/analysis    schemas, prompts, citation verification, statute attachment
lib/compare     deterministic clause diff and change explanations
lib/deadlines   date arithmetic for obligations
lib/document    segmentation, PDF text extraction, scan and photo transcription
lib/http        request guards, rate limiting, input parsing
lib/i18n        English and Hindi strings, checked for parity
lib/legal-aid   Section 12 eligibility
lib/qa          Q&A prompt and statute tool
lib/samples     synthetic documents
lib/statute     IndiaCode client and jurisdiction preference
proxy.ts        per-request CSP nonce
tests/          mirrors the source tree
```

See `ARCHITECTURE.md` for the request flow and the reasoning behind the design.

## Privacy

Documents are processed in memory for one request and never written to disk or
a database. The last result stays in the browser's session storage until the
tab closes. The only third parties that see document text are the model
provider and, for short search phrases only, IndiaCode. The Gemini key runs
on Google's paid tier, under whose terms prompts and responses are not used to
improve Google's products and are logged only briefly for abuse detection. Location is read only
when the user presses the button and accepts the browser prompt, and the
coordinates are turned into a state inside the browser; the server sees the
state name at most, never a position.

## License

MIT. Statute text is served by IndiaCode; the Gazette of India remains the
authoritative source.
