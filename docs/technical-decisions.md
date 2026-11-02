# Technical decisions

## Application model

FoodSource is a catalog-plus-workspace app, not a marketplace and not a CRM product with accounts. The catalog is published facts. Buyer engagement lives beside it, keyed by `workspaceKey`, so a user table can be added later without rewriting supplier rows.

That split is intentional:

- `SupplierContact` is a published channel from a source page.
- `SupplierContactPerson` is who the buyer talks to.
- `Shortlist` is the current relationship.
- `ContactActivity` is the append-only record.
- `SupplierNote` is private workspace text.

Search treats a missing shortlist as `NOT_CONTACTED`. That keeps the contact filter useful before a buyer has saved the supplier.

## No authentication

There is no login. Every workspace query uses `demo-workspace`. This is a product constraint of the current delivery, not an oversight in the contact tables. Anyone who can open the app can read and write that workspace. Notes are “internal” only relative to the public catalog include, not relative to an authenticated user.

## Next.js 16 and next-intl

The App Router, `cacheComponents`, and `partialPrefetching` are enabled. `Date.now()` / `new Date()` during prerender is avoided unless the tree is inside `Suspense` and calls `connection()` from `next/server`.

The locale list is `ru` only. English keys are kept in `messages/en.json` so the trees stay aligned, but `src/proxy.ts` redirects `/en`. Serving English would be a routing change, not a missing translation file.

Prisma 7 uses a generated client under `src/generated/prisma` and `@prisma/adapter-pg`. CLI migrations prefer `DIRECT_URL`.

## SQL search instead of Prisma `findMany` filters

`src/server/supplier-search.ts` builds a single `WHERE` from parameterized `Prisma.sql` fragments. That keeps city, certificate, freshness, contact-status, and price filters in the database. Sort `match` still loads the filtered population into `matchSuppliers` because price and MOQ scores need peers.

`Prisma.raw` is used only for a whitelist of `ASC`/`DESC` and the unit-key expression. Filter values stay bound parameters.

## Matching score

Weights and the formula live in `src/server/matching.ts` and are documented in [matching-score.md](matching-score.md). Product type is a catalog filter and is not a criterion. Missing facts stay in the denominator so a thin record cannot score 100. The profile uses the same population as the list, not the comparison cookie.

## Dates and time zones

Follow-up and last-contact columns are PostgreSQL `DATE`. The service stores them as UTC midnight date-only values. Overdue checks compare calendar strings. Activity `occurredAt` is a timestamp parsed with `serverTimeZone()`, which is the Node process time zone (or `UTC` if that identifier is invalid). The application does not pin `Asia/Vladivostok` in code.

## History is append-only

Editing a note does not write a second `NOTE_ADDED` row. Deleting a note does not delete history. Unchanged status or follow-up dates do not insert duplicates. Removing a favorite is the exception: it deletes that workspace’s CRM rows so a later save starts empty.

## One primary contact

A partial unique index enforces one primary person per workspace and supplier. `saveContactPerson` and `setPrimaryContact` clear other primaries in the same transaction and copy the primary name onto `Shortlist.contactPerson`.

## Catalog honesty

`REAL` rows store only sourced facts. `DEMO` rows are labeled in the UI. The seed fails if `productTypeForName` cannot classify a product name. The application must not invent GOST numbers, delivery day counts, prices, or contacts.

## Trade-offs

| Choice | Cost |
| --- | --- |
| Hardcoded workspace | Simple now; no per-buyer isolation |
| Full filtered set scored on every search | Correct peer groups; extra reads as the catalog grows |
| `getWorkspace()` returns every note | Simple favorites page; extra data on profile and compare |
| Trigger instead of composite FK | Works on PostgreSQL 14; integrity lives in SQL plus service checks |
| Cookie comparison list | No server state; visible to JavaScript; limit 3 |
| Favorite removal deletes CRM rows | Clean shortlist; irreversible without a backup |
| Russian-only routing | Matches the served product; English is unused |
