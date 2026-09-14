# Security

## Threat model

The app handles documents people consider private, calls a paid-by-quota AI
provider, and fetches third-party statute text. The risks that matter are
document leakage, prompt injection through document content, abuse of the AI
quota, and the usual web application classes (XSS, clickjacking, CSRF).

## Controls

**Transport and headers**

- Content Security Policy with a per-request nonce, `strict-dynamic`, no
  `unsafe-inline` for scripts, `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`
  (`proxy.ts`). Development adds `unsafe-eval` for React's debugging only.
- `Strict-Transport-Security` with preload, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  restrictive `Permissions-Policy` (camera, microphone and payment off;
  geolocation allowed for this origin only, and only used after the user presses the location button), `Cross-Origin-Opener-Policy` and
  `Cross-Origin-Resource-Policy: same-origin`, no `X-Powered-By`
  (`next.config.ts`).

**API routes** (`lib/http/`)

- Same-origin enforcement via `Sec-Fetch-Site`, with an `Origin`/`Host` match as
  fallback, so cross-site pages cannot spend the AI quota or submit documents.
- Declared and actual body size caps before parsing; uploads are typed by
  their magic bytes and checked for size, and PDFs for page count, before any
  bytes are read or sent to a model. PDF parsing has a 15 s deadline so a
  crafted file cannot hold a request open.
- Every body is validated with Zod; every string carries a maximum length;
  the analyse and compare schemas are strict, so a body with an unknown field
  is rejected with 400 (the Q&A body carries the AI SDK transport's own
  fields, so it is bounded rather than strict).
- Modules that read provider keys import `server-only`, so a Client Component
  that ever imported them would fail the build rather than ship the keys.
- Sliding-window rate limit per client address on all AI-backed routes (429),
  with the address table itself capped so a flood of fresh addresses cannot
  grow memory.
- Errors map to stable codes; internal messages never reach the client.
- Every `/api/*` response is sent with `Cache-Control: no-store`, so no
  shared cache or proxy keeps a copy of a brief or an answer.

**Exact caps** (`lib/constants.ts`): document 80 to 60,000 characters; upload
4 MiB; PDF 40 pages; situation 600 characters; question 500 characters; 12
chat turns of at most 32 parts; 250 clauses; 6 statute lookups per analysis;
10 AI requests per minute per address; 100 s across the provider chain.

**AI boundary**

- The "your situation" field is quoted into the analysis prompt, so it passes
  the same pattern screen as Q&A questions; text that addresses the assistant
  is dropped and the document is analysed evenly instead.
- Q&A questions pass two guards outside the answering model: a pattern screen
  for text that tries to re-instruct the assistant, and a separate, tiny model
  call that decides whether the question is about the document at all. Either
  failing returns a fixed refusal; the answering prompt is never reached.
- The document is sent to the answering model inside `<document>` tags with
  an instruction that nothing inside is a command; the only tool is a
  read-only statute search; every answer is checked for a clause citation or an
  explicit "not covered", and a caution is appended when it has neither.

- Structured output is validated before rendering; nothing the model returns is
  rendered as HTML or executed.
- Clause citations the model invents are dropped.
- Statute text is fetched from IndiaCode; the model cannot write law into the UI.
  Each fetch has a 6 s timeout and a 1 MB response cap, links are accepted only
  on IndiaCode's own host over https, and errors carry the status code alone so
  the search phrase never reaches a log.
- The Q&A system prompt instructs the model to treat document content as data,
  and the only tool is a read-only search. There is no tool that can write,
  fetch arbitrary URLs, or act on the user's behalf.
- Per-call timeouts and output token caps bound cost and latency.

**Data**

- No database, no server-side storage, no logging of document content. Only
  short statute search phrases leave the process apart from the model call.
- Secrets live in environment variables; `.env*` is git-ignored and
  `.env.example` documents the names only.

**Location**

- Geolocation is requested only when the user presses the button, through the
  browser's own permission prompt. The coordinates are matched to a state in
  the browser (`lib/statute/geo.ts`) and discarded; the request carries a
  state name at most, and the result says the state came from location.

**Supply chain**

- Every dependency is pinned to an exact version in `package.json` and the
  lockfile is installed with `npm ci`; GitHub Actions are pinned to commit SHAs.
- `npm audit --audit-level=high`, CodeQL (`security-and-quality` queries) and
  a Gitleaks scan of the full history run in CI on every push; Dependabot
  proposes weekly minor and patch updates for npm and Actions.
- `/.well-known/security.txt` (RFC 9116) points reporters at the private
  advisory form.

## Known limitations and accepted risks

- The rate limiter is in-process. On a multi-instance deployment each instance
  has its own window. A shared store would be the next step.
- Same-origin checks depend on browser-sent headers; non-browser clients that
  forge them are limited only by the rate limiter and input caps.
- There is no sign-in by design: nothing is stored, so there is nothing to
  protect with an account, and asking for one would exclude the people the
  app is for.
- pdf.js cannot be cancelled mid-parse; the deadline frees the request and the
  stalled worker is reclaimed with the function instance.

## Reporting

Open a private security advisory on the repository or contact the maintainer
through the profile linked from it. Please do not file public issues for
vulnerabilities.
