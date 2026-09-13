# Contributing

## Setup

```bash
npm install
cp .env.example .env.local   # add GOOGLE_GENERATIVE_AI_API_KEY
npm run dev
```

## Before you push

```bash
npm run verify
```

That runs the type check, ESLint, Prettier, the test suite with 100% coverage
thresholds and a production build. CI runs the same steps plus `npm audit` and
CodeQL.

## Ground rules

- Keep the boundary: deterministic code for anything checkable (segmentation,
  citations, diffs, dates, statutes), the model only for reading and explaining.
- Every string shown to a user goes through `lib/i18n` in both languages.
- Every interactive element must be reachable and usable by keyboard, with a
  visible label. Run the axe tests and the manual walkthrough in
  `ACCESSIBILITY.md` for UI changes.
- No real documents, names, addresses or case data in tests or samples. Invent
  them.
- Commit messages follow Conventional Commits, one line: `feat: …`, `fix: …`,
  `docs: …`, `test: …`, `chore: …`.
