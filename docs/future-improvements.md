# Future improvements

These items are not in the current delivery. Do not treat them as implemented.

## Product

- Authentication and a real user or organization tenant instead of `demo-workspace`
- Per-user shortlists, notes, and history that a second buyer cannot read
- Soft-delete or archive for favorites so CRM history is not destroyed
- Edit or redact history when a note is deleted (today `NOTE_ADDED` keeps the text)
- Upcoming / overdue follow-up list in the UI (`listFollowUps` exists; no page calls it)
- Settings that persist (the `/settings` route is a static section)
- Serve English by adding `en` to `src/i18n/routing.ts` and removing the `/en` redirect, or drop `messages/en.json` if English will not ship
- Hosted demo environment and a real `NEXT_PUBLIC_APP_URL`

## Technical debt

- Restore or formally retire `MediaAsset`. The table exists locally; the migration SQL does not. `prisma migrate status` fails with `P3015` until that directory is repaired or the history is reconciled.
- Remove unused `src/lib/scoring.ts` and `scripts/run-contact-management-test.mjs`
- Collapse `ContactMethod` and `CommunicationChannel` if the product can use one enum
- Stop loading every workspace note on profile, compare, and CSV export. Search already uses `getSavedSupplierIds`.
- `searchSuppliers` loads every filtered supplier to compute match peers even when the page shows nine rows and no score is shown. Load the page first when `hasRankingContext` is false and sort is not `match`.
- `getRelationship` returns the full activity list. `listActivities` already paginates.
- `discovery-filters.tsx` (~460 lines) and `matching.ts` (~650 lines) are large. Split only when a change needs it.
- Add a CI workflow that runs `typecheck`, `lint`, unit tests, and `build`
- Replace the leftover `revalidatePath("/en")` path (already removed) and any other English-only leftovers as they appear

## Scalability

The current catalog is 26 suppliers and 64 products. The following will matter only after the catalog grows:

- Trigram or full-text indexes for name and product search (`LIKE` plus `translate` cannot use a btree on `name` efficiently)
- Avoid scoring the full filtered set on every request, or persist nothing and keep scoring a bounded peer group
- Facets are global and cheap at this size; they will need cached or incremental counts later
- Do not add Redis or an application cache until a measured page is slow

## Quality

- Playwright or equivalent for status dropdown, note confirm, follow-up, and double-submit
- Viewport checks for the search filter grid and the profile aside
- Require `supplierId` on every note delete in tests (the action now rejects a missing id)
- Keep `test:contact` cleanup even when an assertion fails (already in `finally`)
