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
  link, preferring the user's own state's act over another state's
  (`lib/statute/`). If nothing is found, no law is shown.
- **Deadlines are arithmetic, not generation.** The model reports what a clause
  says ("30 days from the notice date"); dates are computed from anchors the user
  enters (`lib/deadlines/compute.ts`).
- **Compare mode diffs deterministically** (`lib/compare/diff.ts`); the model is
  asked only to explain the clauses the diff marked as changed.
- **Q&A is grounded** in the document sent with every turn plus one tool, a
  read-only statute search (`lib/qa/`). Document text is treated as data; the
  system prompt says so.

## Judging criteria, and where to verify each

| Criterion                       | How it is addressed                                                                                                                                                                                      | Look at                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Problem statement alignment** | All seven listed use cases in one product, plus legal-aid eligibility; information-not-advice built into prompts, UI copy and the boundary of what is shown                                              | table above, `lib/analysis/prompts.ts`, `lib/legal-aid/`                  |
| **Code quality**                | Strict TypeScript (`noUncheckedIndexedAccess`), ESLint with complexity ≤10, ≤80 lines per function, no `any`, no non-null assertions; small single-purpose modules with doc comments; Prettier-formatted | `tsconfig.json`, `eslint.config.mjs`, `ARCHITECTURE.md`                   |
| **Security**                    | Nonce-based CSP with `strict-dynamic` and no `unsafe-inline`, HSTS and the other hardening headers, same-origin checks, body size caps, schema validation, rate limiting, no stored user data            | `SECURITY.md`, `proxy.ts`, `next.config.ts`, `lib/http/`                  |
| **Efficiency**                  | No database; one model call per analysis with output caps; LRU-cached statute lookups; provider fallback with per-call timeouts; deterministic work (segmentation, diff, dates) done without a model     | `lib/cache/`, `lib/ai/client.ts`, `lib/compare/diff.ts`                   |
| **Testing**                     | 198 tests, **100% statements, branches, functions and lines across the whole repository** (routes, components, library, proxy), enforced in CI; opt-in live test against real Gemini and IndiaCode       | `TESTING.md`, `tests/`, `vitest.config.mts`                               |
| **Accessibility**               | WCAG 2.2 AA: keyboard-only flows, skip link, labelled controls with announced errors, live regions, focus management, 4.5:1 contrast in both schemes, reduced motion, `lang` switching, axe tests        | `ACCESSIBILITY.md`, `app/globals.css`, `components/`, `tests/components/` |

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
provider, Zod, Tailwind CSS v4, unpdf for PDF text, Gemini vision for scans and
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
provider and, for short search phrases only, IndiaCode.

## License

MIT. Statute text is served by IndiaCode; the Gazette of India remains the
authoritative source.
