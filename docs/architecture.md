# Architecture

FoodSource is a Next.js App Router application. Pages load catalog and workspace data on the server. Mutations go through Server Actions. There is one Route Handler: comparison CSV export. There is no separate HTTP API and no user authentication.

## System shape

```
Browser
  → src/proxy.ts (next-intl + /en redirect)
  → src/app/[locale]/* pages
      → src/server/catalog.ts, supplier-search.ts, matching.ts, contact-management.ts
      → PostgreSQL through Prisma 7 + @prisma/adapter-pg
  → src/server/actions.ts (favorites, compare cookie, notes, people, status, follow-up, history)
```

`src/proxy.ts` is the Next.js request proxy (this Next.js version does not use `middleware.ts`). It redirects `/en` and `/en/*` to the same path without the prefix, then runs next-intl. Routing in `src/i18n/routing.ts` lists only `ru`, with `localePrefix: "never"` and `localeDetection: false`.

`messages/ru.json` is the served catalog. `messages/en.json` matches the Russian key tree and is imported from `src/i18n/request.ts`, but the router never selects `en`.

## Main modules

| Area | Location | Responsibility |
| --- | --- | --- |
| Pages | `src/app/[locale]` | Home, overview (`/dashboard`), search, profile, compare, favorites, categories, settings |
| Catalog UI | `src/components/catalog` | Cards, filters, profile, comparison, certificates, workspace forms, people, timeline |
| Shell | `src/components/layout`, `src/components/landing` | Header, footer, home, section placeholders |
| Server reads | `src/server/catalog.ts`, `supplier-search.ts`, `matching.ts` | Catalog mapping, SQL search, match score |
| Server writes | `src/server/actions.ts`, `contact-management.ts` | Workspace mutations |
| Catalog writes | `src/server/supplier-records.ts` | Used by tests and seed helpers, not by the public UI |
| Parsing | `src/lib/discovery-query.ts`, `contact-tracking.ts`, `contact-activity.ts`, `freshness.ts`, `certificate-status.ts`, `product-type.ts` | URL, dates, enums, product classification |
| i18n | `src/i18n/*`, `messages/*.json` | Locale assertion and message types |
| Data | `prisma/schema.prisma`, `prisma/seed.mjs` | Schema, migrations, seed |

Settings (`/settings`) is a static section page. It does not persist user preferences.

## Data flow

### Search

1. The search form submits query-string parameters. It does not debounce.
2. `parseDiscoveryQuery` in `src/lib/discovery-query.ts` reads the URL.
3. `searchSuppliers` in `src/server/catalog.ts` loads global facets, the filtered supplier id set, the match cohort, and the current page.
4. `querySupplierPage` / `querySupplierIds` in `src/server/supplier-search.ts` run parameterized SQL. Page size is 9.
5. `matchSuppliers` scores the full filtered set when a ranking context is present or the sort is `match`. Product type is a filter, not a score weight.
6. The results toolbar applies sort immediately. Advanced filters stay collapsed until opened.

### Profile

1. `getSupplier(slug)` loads published catalog rows only (products, public contacts, certifications, sources).
2. `getWorkspace()` loads every `demo-workspace` shortlist and note; the page keeps the row for this supplier.
3. `getRelationship(supplier.id)` loads workspace people and history.
4. `scoreSupplier` uses the same filtered population as the list. The comparison cookie is not applied on the profile.

### Workspace writes

Server Actions in `src/server/actions.ts` validate `FormData` with Zod and enum helpers, then call `src/server/contact-management.ts`. That service scopes every query with `demoWorkspaceKey` (`demo-workspace`). Status, follow-up, note create, and communication writes run in a Prisma transaction. History is append-only.

Removing a favorite deletes that workspace’s people, history, notes, and shortlist in one transaction.

### Comparison

Comparison membership is a non-httpOnly cookie (`fs-compare`, limit 3). Optional match context is an httpOnly cookie (`fs-match`). `GET /[locale]/compare/export` builds a CSV. Note text is not a CSV column.

## Validation and errors

- URL search parameters are parsed in `parseDiscoveryQuery`. Unknown enum values are dropped.
- Server Actions return small `{ ok, error }` objects (`invalid`, `missing`, `duplicate`, `empty`, `full`, `contact`).
- Catalog loaders catch database failures, log the error, and throw `DataError`. Pages render `ErrorState`.
- `next/cache` `revalidatePath("/", "layout")` runs after successful workspace writes.

## Localization

Message types come from `messages/ru.json` via `src/i18n/global.ts`. Catalog copy for statuses, activity types, notes, and follow-ups lives under the `Catalog` namespace. The UI must keep missing facts as «Не указано» and demo records as «Демонстрационные данные».

## Duplication and complexity that already exist

- `ContactMethod` (shortlist) and `CommunicationChannel` (people / history) overlap.
- `src/lib/scoring.ts` re-exports matching helpers and is unused.
- `scripts/run-contact-management-test.mjs` is an unused alternate of `npm run test:contact`.
- `searchSuppliers` always loads the full filtered supplier set to score peers, including when the page only shows nine rows.
- Profile, compare, favorites, and CSV export still call `getWorkspace()`, which loads every workspace note.
