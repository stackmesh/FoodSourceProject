# Database design

Source of truth: `prisma/schema.prisma` and the SQL in `prisma/migrations`. The Prisma client is generated to `src/generated/prisma`.

## Entities

### Catalog

| Model | Role |
| --- | --- |
| `Supplier` | Company record. `slug` is unique. `dataType` is `REAL` or `DEMO`. `isActive` hides a row from reads. |
| `Category` | Product category. Unique `slug` and `nameRu`. |
| `SupplierProduct` | One product. Requires `categoryId` and exactly one `ProductType`. Price and MOQ are optional decimals. |
| `SupplierContact` | Published channel from a supplier page (`PHONE`, `EMAIL`, `WEBSITE`, …). Not a buyer CRM person. |
| `Certification` | Certificate claim. Effective status is recalculated from `expiresAt` on read except `SUSPENDED` and `REVOKED`. |
| `SupplierSource` | Evidence URL. Unique per supplier and URL. |

### Workspace (buyer CRM)

There is no user table. The tenant is `workspaceKey`, default `demo-workspace`.

| Model | Role |
| --- | --- |
| `Shortlist` | One engagement per workspace and supplier: status, last contact date, next follow-up date, primary person name, method. |
| `SupplierNote` | Private note for one workspace and supplier. |
| `SupplierContactPerson` | Person the buyer talks to. Partial unique indexes allow one primary and reject a repeated email or phone. |
| `ContactActivity` | Append-only event. Status changes store `previousStatus` and `newStatus`. Follow-up events store `followUpOn`. |

A missing shortlist is treated as `NOT_CONTACTED` by search and by `getEngagement`.

## Relationships

```
Supplier 1—* SupplierProduct *—1 Category
Supplier 1—* SupplierContact
Supplier 1—* Certification
Supplier 1—* SupplierSource
Supplier 1—* Shortlist
Supplier 1—* SupplierNote
Supplier 1—* SupplierContactPerson
Supplier 1—* ContactActivity
SupplierContactPerson 1—* ContactActivity (optional, ON DELETE SET NULL)
```

Catalog children cascade when a supplier is deleted. A category cannot be deleted while products reference it (`onDelete: Restrict`).

`ContactActivity.contactPersonId` cannot be a composite foreign key that also matches `supplierId` and `workspaceKey`: PostgreSQL 14 cannot `SET NULL` a single column of that composite. Migration `20261102220000_contact_integrity` adds trigger `ContactActivity_same_supplier`, which rejects a person from another supplier or workspace (`SQLSTATE 23514`).

## Constraints

| Constraint | Where |
| --- | --- |
| Unique slug | `Supplier.slug` |
| Unique category slug and Russian name | `Category` |
| Unique source URL per supplier | `SupplierSource (supplierId, url)` |
| One shortlist per workspace and supplier | `Shortlist (workspaceKey, supplierId)` |
| One primary person per workspace and supplier | unique index `SupplierContactPerson_one_primary_idx` where `isPrimary` |
| Unique email per workspace and supplier | unique index where `email IS NOT NULL` |
| Unique phone key per workspace and supplier | unique index where `phoneKey IS NOT NULL` |
| Same-supplier activity person | trigger `ContactActivity_same_supplier` |

`email` and `phone` may be null. Application code also rejects a second nameless duplicate (`fullName` case-insensitive when both email and phone are empty).

## Indexes

Search and listing use:

- `Supplier`: `name`; `city, region`; `isActive, city`; `isActive, region`; `dataType, verificationStatus`; `supplierType`
- `SupplierProduct`: `supplierId`; `categoryId`; `name`; `estimatedPrice`; `minimumOrderQuantity`; `dataType`; `productType`; `supplierId, productType`
- `Shortlist`: `workspaceKey, contactStatus`; `workspaceKey, nextFollowUpOn`
- `SupplierNote`: `workspaceKey, supplierId`
- `SupplierContactPerson`: `workspaceKey, supplierId`; `supplierId`
- `ContactActivity`: `workspaceKey, supplierId, occurredAt`; `workspaceKey, supplierId, type`; `contactPersonId`
- `Certification`: supplier plus status; `expiresAt`; `isDemo`

Text search folds `ё` → `е` with `translate(lower(...))` and `LIKE`. It is not a trigram or full-text index.

## Transactions

`applyEngagement` writes the shortlist and, when values change, `STATUS_CHANGED` and/or `FOLLOW_UP_SCHEDULED` in one transaction. An unchanged status or follow-up date does not insert another history row.

`createOwnedNote` upserts a shortlist, inserts the note, and inserts `NOTE_ADDED` (the note text is copied into `ContactActivity.description`).

`createCommunication` checks that a person belongs to the same supplier and workspace before insert.

`toggleFavorite` on unsave deletes activities, people, notes, and the shortlist together.

Failed transactions leave the previous shortlist and history unchanged. That is covered by `src/server/contact-management.test.ts`.

## Seed and existing catalog data

`npm run db:seed` upserts catalog rows from `prisma/seed.ts` (compiled by `prisma/seed.mjs`) plus `prisma/real-suppliers.mjs`, then calls `seedDemoRelationships`. `--relationships-only` updates only those demo CRM rows.

The local database reviewed here still has 26 suppliers (8 `REAL`, 18 `DEMO`) and 64 products. Contact tests create temporary suppliers and delete them in `finally`.

## Leftover table

The local database has `MediaAsset`. It is not in `schema.prisma`. The applied Prisma history includes `20261102100000_media_asset`, but that directory has no `migration.sql` in the repository. `prisma migrate status` therefore fails with `P3015` on this machine. A fresh clone using the committed migration folders will not create `MediaAsset`.
