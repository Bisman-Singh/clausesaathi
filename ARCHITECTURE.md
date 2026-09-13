# Architecture

## One request, end to end

```text
 browser                        server (Next.js route handlers)                external
 ───────                        ───────────────────────────────                ────────
 paste / PDF / sample
   │
   ▼
 POST /api/analyze ──────────▶ guard: same-origin, rate limit, size caps
                               parse: JSON text, multipart PDF (unpdf) or scan/photo (model transcription)
                               segment: deterministic clauses c1..cN
                               generateText + Output.object (wire schema) ──▶ Gemini
                               toBrief: strict validation, bounds, deadline shape
                               verifyCitations: drop ids that do not exist
                               attachStatutes: search + jurisdiction pick ───▶ IndiaCode
   ◀────────────────────────── { document, result }
 render sections, compute
 deadlines from user anchors
   │
   ▼
 POST /api/ask ──────────────▶ streamText with the document in the system
                               prompt and one tool (lookupStatute) ────────▶ Gemini, IndiaCode
   ◀────────────────────────── UI message stream
```

Compare mode is the same shape: `diffDocuments` aligns clauses by similarity
and produces word-level diffs; the model is asked only to explain the pairs the
diff marked as modified, indexed, and any index it invents is discarded.

## Design decisions

**Deterministic where it can be, generative where it must be.** Segmentation,
citation checking, diffing, deadline arithmetic, jurisdiction preference and
legal-aid eligibility are plain code with unit tests. The model does what only a
model can do: read prose and explain it. The boundary is what makes the output
checkable.

**Two schemas per generation.** Provider structured-output support is a subset
of JSON Schema (no unions, no patterns), so the model is asked for a flat "wire"
object. The app then validates it into a strict shape with discriminated
deadlines and bounded strings. Over-long strings are trimmed rather than
rejected, because a 401-character explanation is not a failed generation.

**Statutes come from an API, never from the model.** The model may only emit a
search phrase. The app searches IndiaCode, prefers the user's state's act, falls
back to a central act, and never shows another state's law by accident. When
the user picks no state, the document's own city, PIN code or state name is
used as a guess (`lib/statute/detect-state.ts`); the guess is shown with its
evidence in the form and in the result, never applied silently. Location is
opt-in: a button asks the browser for the position, `lib/statute/geo.ts`
matches it to the nearest of several anchor points per state on the device,
and only the state name is sent. A state the user picks by hand outranks both,
so the app works for a document about somewhere else. Nothing is inferred
from the visitor's IP. Hits are also filtered to the family of acts that fits
the document type (`lib/statute/domain.ts`), so "security deposit" in a rent
agreement finds a Rent Act rather than a deposit-schemes act. The displayed
text and link are the API's.

**A fallback chain instead of one model.** Each Gemini model has its own
free-tier quota pool, so a 429 on one is not an outage. Every attempt has its
own timeout. Streaming Q&A tries the same chain: each model's stream is read until it
produces content or fails, a failure before any content moves to the next
model, and the client sees one answer from its first chunk
(`lib/qa/stream.ts`).

**No database, no accounts.** A document is processed in memory for one request.
The browser keeps the last result in session storage through a small external
store read with `useSyncExternalStore`, which avoids hydration mismatches and
state-in-effect patterns.

**Interface language is a store, not a prop.** The locale lives in a tiny
external store backed by localStorage, updates `document.documentElement.lang`,
and every string exists in both languages by a `satisfies` check at compile time.

**Per-request CSP nonce.** `proxy.ts` mints a nonce and sets a strict policy
(`strict-dynamic`, no `unsafe-inline`). Pages therefore render dynamically, a
cost this app can afford; API routes are excluded from the proxy.

## Limits

Every input is bounded (`lib/constants.ts`): document length, upload size and PDF page
count, situation and question length, chat history, clause count and statute
lookups per analysis. The limits keep free-tier usage predictable and abuse
cheap to reject before a model is called.

## Known limitations

- Scans and photos are transcribed by the model, not by a dedicated OCR engine.
  The result is labelled as a transcription and the user is told to check
  names, amounts and dates against the original.
- The rate limiter is per serverless instance. See `SECURITY.md`.
- IndiaCode covers legislation, not case law. The app never claims otherwise.
- Hindi output quality depends on the model; the interface strings are reviewed.
