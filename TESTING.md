# Testing

## Commands

```bash
npm test                      # unit, integration and component tests
npm run test:coverage         # same, with 100% thresholds enforced on every metric
npm run verify                # typecheck + lint + format + coverage + production build
LIVE_AI=1 npm test -- tests/live   # opt-in end-to-end against real Gemini and IndiaCode
```

## What is covered

Coverage is measured over the whole application: `app/`, `components/`, `lib/`,
`proxy.ts` and `next.config.ts`. The thresholds are 100% for statements,
branches, functions and lines, and CI fails below that. No file is excluded.

| Layer                 | Tests                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Document segmentation | headings, titles, numbered single lines, clause limit, empty input, model rendering                                                              |
| PDF extraction        | real PDFs generated in-test (multi-page, oversized, too many pages, no text, not a PDF)                                                          |
| IndiaCode client      | request shape, caching, schema tolerance, HTTP errors, section parsing, ref parsing                                                              |
| Jurisdiction          | state and regional detection in act titles, own-state preference, central fallback, never another state's law                                    |
| AI layer              | model chain, fallback order, timeouts, error aggregation, provider construction                                                                  |
| Analysis              | wire-to-strict conversion, bounds, deadline shapes, citation dropping, statute attachment, full pipeline through the AI SDK's mock model         |
| Deadlines             | UTC date arithmetic, anchor mapping, resolution, ordering                                                                                        |
| Compare               | similarity, word diff, alignment by content or shared title, one-to-one matching, long-clause fallback                                           |
| HTTP guards           | origin checks, size caps, JSON validation, error serialisation, rate limiting                                                                    |
| API routes            | text and multipart analysis, PDF error codes, validation, cross-site refusal, AI outage, compare, streaming ask with tool execution              |
| Components            | every component and page, with axe on the form, results, diff, chrome and content pages; keyboard interaction through Testing Library user-event |
| Proxy and config      | nonce CSP, dev vs prod policy, matcher, static headers                                                                                           |

## Principles

- **Tests fail for the right reason.** Each new test was checked to fail with the
  behaviour reverted before being kept.
- **Determinism.** Dates are injected (`today`), model calls are stubbed or run
  through the AI SDK mock model, and fetch is replaced in component tests.
- **No network in CI.** The live test is skipped unless `LIVE_AI=1` is set and
  a key is present.
- **Accessibility is asserted, not assumed.** Roles, names, live regions and axe
  results are part of the component tests.
