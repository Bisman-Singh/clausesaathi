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
  restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy` and
  `Cross-Origin-Resource-Policy: same-origin`, no `X-Powered-By`
  (`next.config.ts`).

**API routes** (`lib/http/`)

- Same-origin enforcement via `Sec-Fetch-Site`, with an `Origin`/`Host` match as
  fallback, so cross-site pages cannot spend the AI quota or submit documents.
- Declared and actual body size caps before parsing; PDFs are checked for size
  and page count before extraction.
- Every body is validated with Zod; unknown shapes are rejected with 400.
- Sliding-window rate limit per client address on all AI-backed routes (429).
- Errors map to stable codes; internal messages never reach the client.

**AI boundary**

- Structured output is validated before rendering; nothing the model returns is
  rendered as HTML or executed.
- Clause citations the model invents are dropped.
- Statute text is fetched from IndiaCode; the model cannot write law into the UI.
- The Q&A system prompt instructs the model to treat document content as data,
  and the only tool is a read-only search. There is no tool that can write,
  fetch arbitrary URLs, or act on the user's behalf.
- Per-call timeouts and output token caps bound cost and latency.

**Data**

- No database, no server-side storage, no logging of document content. Only
  short statute search phrases leave the process apart from the model call.
- Secrets live in environment variables; `.env*` is git-ignored and
  `.env.example` documents the names only.

**Supply chain**

- Exact dependency versions, `npm audit --audit-level=high` and CodeQL run in CI
  on every push.

## Known limitations

- The rate limiter is in-process. On a multi-instance deployment each instance
  has its own window. A shared store would be the next step.
- Same-origin checks depend on browser-sent headers; non-browser clients that
  forge them are limited only by the rate limiter and input caps.

## Reporting

Open a private security advisory on the repository or contact the maintainer
through the profile linked from it. Please do not file public issues for
vulnerabilities.
