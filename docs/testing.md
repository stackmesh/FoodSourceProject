# Testing

Tests are Node assert scripts, not Jest or Playwright. TypeScript tests run through `scripts/register-loader.mjs`, which resolves `@/` and relative imports.

## Strategy

- Pure functions (matching, freshness, certificates, CSV, product type) run without Postgres.
- Contact management is an integration test against the local database. It creates temporary suppliers and deletes them in `finally`.
- Search, freshness, persistence, and contact-form scripts post to `http://localhost:3000` or query Postgres. They need a running `npm run dev` and `DATABASE_URL`.
- Typecheck, ESLint, Prisma validate, and `next build` are the static gates.

There is no end-to-end browser suite and no CI workflow in this repository.

## Commands

From `package.json`:

```bash
npm run typecheck
npm run lint
npm run test:matching
npm run test:freshness
npm run test:csv
npm run test:certificates
npm run test:product-type
npm run test:contact
npm run build
npx prisma validate
```

Behavior scripts (not npm scripts):

```bash
node --import ./scripts/register-loader.mjs scripts/search-behavior.mjs
node --import ./scripts/register-loader.mjs scripts/freshness-behavior.mjs
node --import ./scripts/register-loader.mjs scripts/persist-actions.mjs
node --import ./scripts/register-loader.mjs scripts/contact-tracking.mjs
```

`scripts/run-contact-management-test.mjs` is an unused alternate loader. Use `npm run test:contact`.

`test:contact` requires Postgres. If `DATABASE_URL` is missing, the test imports `dotenv/config` from `.env`.

## Coverage that is actually executed

| Area | How |
| --- | --- |
| Match score weights, missing facts, certificates, geography | `npm run test:matching` |
| Freshness thresholds and time zones | `npm run test:freshness` |
| Comparison CSV columns and note exclusion | `npm run test:csv` |
| Certificate badge markup and status labels | `npm run test:certificates` |
| Product-type classification | `npm run test:product-type` |
| Person CRUD, one primary, email/phone normalize, cross-supplier reject, status history, follow-up, overdue, rollback, notes ownership, contact search filter | `npm run test:contact` |
| Search, filters, sort | `scripts/search-behavior.mjs` |
| Freshness filter on live pages | `scripts/freshness-behavior.mjs` |
| Favorite, note, status, compare, delete-note HTTP forms | `scripts/persist-actions.mjs` |
| Follow-up dates, overdue copy, status-only updates | `scripts/contact-tracking.mjs` |
| All seven `ContactStatus` values persist and write history once | Ad-hoc Phase 6 script against `contact-management.ts` |

## Results from the Phase 6 / Phase 7 pass

Executed and passing on this machine:

- `tsc --noEmit`
- `npm run test:matching`, `test:freshness`, `test:csv`, `test:certificates`, `test:product-type`, `test:contact`
- `scripts/search-behavior.mjs`, `freshness-behavior.mjs`, `persist-actions.mjs`, `contact-tracking.mjs`
- `npm run build` (Next.js 16.4.3, compiled and prerendered)
- Live HTTP 200 for search filters, profile (`privolzhskaya-ptica`), compare, and favorites
- `/en/suppliers` → 307 `/suppliers`

Executed with issues:

- `npx prisma migrate status` fails (`P3015`) because `prisma/migrations/20261102100000_media_asset/` has no `migration.sql`. The migration is already applied on the local database.
- `npm run lint` exits 0 with one warning: `@next/next/no-img-element` on `src/components/landing/home-page.tsx`. The previous `react/no-children-prop` error in `certificate-badges.test.tsx` was fixed by rendering `NextIntlClientProvider` with JSX children.

Not executed:

- Interactive browser clicks, confirmation dialogs, double-submit protection, loading-state timing
- Mobile and desktop layout comparison in a real viewport
- A served English UI (`/en` redirects)
- Hosted production deployment
- Authorization against a second real user (there is no user model)

## Known limitations

- Removing a favorite deletes workspace CRM rows. Tests cover the delete; there is no undo test.
- `NOTE_ADDED` stores the note text on the history row. Deleting the note does not remove that event.
- Temporary contact-test suppliers must not remain. The contact test and HTTP scripts clean up in `finally`.
- A full `npm run db:seed` rewrites `updatedAt` and changes freshness. Prefer `--relationships-only` when you only need demo CRM rows.
- Certificate lint used to be the only ESLint error. `src/components/landing/home-page.tsx` may still warn about a raw `<img>`.
