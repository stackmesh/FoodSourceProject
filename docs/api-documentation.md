# Server Actions and routes

FoodSource does not expose a versioned REST or RPC API. The browser posts HTML forms to Server Actions. One Route Handler exports comparison CSV.

All workspace writes use the server-side constant `demoWorkspaceKey` (`demo-workspace`). Clients cannot choose a workspace.

## Route Handler

### `GET /[locale]/compare/export`

File: `src/app/[locale]/compare/export/route.ts`.

- `locale` must be `ru` (`assertLocale`). Other locales call `notFound()`.
- Reads cookies `fs-compare` and `fs-match`.
- `400` if no comparison slugs resolve to active suppliers.
- `500` if catalog loading throws `DataError`.
- Success: `text/csv; charset=utf-8`, `Cache-Control: no-store`.
- Columns are listed in `comparisonExportColumns` (`src/lib/comparison-export.ts`). Internal note text is not exported. Public catalog email and phone, workspace contact status, and workspace contact-person name are exported.

## Server Actions

File: `src/server/actions.ts`. Each action that needs an identifier accepts `supplierId` (UUID) or `slug` (lowercase hyphenated). Invalid input returns `{ ok: false, error: "invalid" }` unless noted.

### `toggleFavorite(previous, formData)`

- Input: `supplierId`.
- Creates a shortlist row or, if one exists, deletes that workspace’s activities, people, notes, and shortlist.
- Result: `{ ok: true, saved }` or `{ ok: false, error: "invalid" | "missing" }`.

### `addToComparison(previous, formData)`

- Input: `slug`. Optional `rememberContext=1` plus search fields stores `fs-match`.
- Cookie `fs-compare` is limited to 3 slugs.
- Result: `{ ok: true, comparing }` or `{ ok: false, error: "full" | "invalid" | "missing" }`.

### `removeFromComparison(formData)`

- Input: `slug`. Invalid slug is ignored.

### `saveNote(previous, formData)`

- Input: `supplierId`, optional `noteId`, `content` (trimmed, 1–2000 characters).
- Create calls `createOwnedNote` (also writes `NOTE_ADDED`). Update calls `updateOwnedNote` (no extra history row).
- Result: `{ ok: true }` or `{ ok: false, error: "invalid" | "empty" | "missing" }`.
- Update is scoped by note id, workspace, and supplier. A note from another workspace is not updated.

### `deleteNote(formData)`

- Input: `noteId` and `supplierId`. Both must be valid UUIDs or the action returns.
- Deletes only a `demo-workspace` note for that supplier. History rows stay.

### `updateContactStatus(previous, formData)`

- Input: `supplierId`, `status` (`ContactStatus` enum).
- Optional `details=1` also accepts `contactPerson`, `lastContactOn`, `nextFollowUpOn`, `contactMethod`. The current UI does not send `details=1`; follow-up uses `saveFollowUp`.
- Dates use `parseContactDate`. A last-contact date cannot be after today.
- Result: `{ ok: true }` or `{ ok: false, error: "invalid" | "missing" }`.
- Status history is written only when the status changes.

### `saveFollowUp(previous, formData)`

- Input: `supplierId`, `nextFollowUpOn` (empty clears the date).
- Calls `setFollowUp`, which keeps the current status and writes `FOLLOW_UP_SCHEDULED` only when the date changes.

### `savePerson(previous, formData)`

- Input: `supplierId`, `fullName` (1–160), optional `personId`, `position` (max 120), `email`, `phone`, `preferredChannel`, `isPrimary=1`.
- Email and phone are normalized. Invalid values return `invalid`. Duplicate email, phone, or nameless name returns `duplicate`.
- Setting primary clears the previous primary in the same transaction.

### `deletePerson(formData)`

- Input: `supplierId`, `personId`. Invalid ids are ignored. Activities keep the event and set the person to null.

### `setPrimaryPerson(formData)`

- Input: `supplierId`, `personId`. The person must belong to that supplier and workspace.

### `addActivity(previous, formData)`

- Input: `supplierId`, `type` (user communication types only), `description` (1–2000), `occurredAt` (valid calendar datetime in the server time zone), optional `contactPersonId`, `channel`.
- A person from another supplier returns `{ ok: false, error: "contact" }`.
- Types that count as contact move `lastContactOn` forward, never backward.

## Validation helpers

| Check | Location |
| --- | --- |
| UUID / slug | Zod in `actions.ts` |
| Email and phone | `normalizeEmail`, `normalizePhone` in `src/lib/contact-activity.ts` |
| Calendar dates | `parseContactDate` in `src/lib/contact-tracking.ts` |
| Date-times | `parseZonedDateTime` in `src/lib/contact-activity.ts` |
| Status / method | `isContactStatus`, `isContactMethod` |
| Activity type / channel | `isUserActivityType`, `isCommunicationChannel` |
| Search query | `parseDiscoveryQuery` |

`STATUS_CHANGED`, `NOTE_ADDED`, and `FOLLOW_UP_SCHEDULED` cannot be posted through `addActivity`. Those rows are written by the service when the corresponding field actually changes.

## Reads used by pages

These are server functions, not HTTP endpoints:

| Function | Used by |
| --- | --- |
| `searchSuppliers` | `/suppliers` |
| `getSupplier`, `scoreSupplier`, `getRelationship` | `/suppliers/[slug]` |
| `getCatalog`, `getWorkspace` | `/favorites` |
| `getSuppliersBySlugs`, `getWorkspace` | `/compare` and CSV export |
| `getDashboard` | `/dashboard` |
| `getCategories`, `getProductTypeCounts` | home and `/categories` |
| `getSavedSupplierIds` | `/suppliers` favorite-state only |

Public catalog includes (`supplierInclude`) do not load notes, people, or activities.
