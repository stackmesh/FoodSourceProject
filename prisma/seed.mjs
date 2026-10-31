import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import pg from "pg";
import ts from "typescript";
import { realSuppliers } from "./real-suppliers.mjs";

config();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const source = readFileSync(new URL("./seed.ts", import.meta.url), "utf8");
const start = source.indexOf("const categories");
const end = source.indexOf("function idFor");
const slice = source.slice(start, end);
const compiled = ts.transpileModule(`${slice}\nmodule.exports = { categories, suppliers };`, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

mkdirSync(new URL("../.cache/", import.meta.url), { recursive: true });
writeFileSync(new URL("../.cache/demo-data.cjs", import.meta.url), compiled);

const require = createRequire(import.meta.url);
const { categories, suppliers } = require("../.cache/demo-data.cjs");

function idFor(key) {
  const hex = createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const demoDescription =
  "Демонстрационная карточка. Название, цены, минимальный заказ, контакты и сертификаты вымышлены и не являются коммерческим предложением или проверенным источником.";

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query("BEGIN");

  const categoryIds = new Map();
  for (const category of categories) {
    const inserted = await client.query(
      `INSERT INTO "Category" ("id", "nameRu", "nameEn", "slug", "sortOrder", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT ("slug") DO UPDATE SET
         "nameRu" = EXCLUDED."nameRu",
         "nameEn" = EXCLUDED."nameEn",
         "sortOrder" = EXCLUDED."sortOrder",
         "updatedAt" = NOW()
       RETURNING "id"`,
      [idFor(`category:${category.slug}`), category.nameRu, category.nameEn, category.slug, category.sortOrder],
    );
    categoryIds.set(category.slug, inserted.rows[0].id);
  }

  for (const [index, supplier] of suppliers.entries()) {
    const createdAt = new Date(Date.UTC(2026, 8, 1) + index * 36 * 60 * 60 * 1000);
    const url = `https://example.com/demo/${supplier.slug}`;
    await upsertSupplier(client, {
      slug: supplier.slug,
      name: supplier.name,
      description: demoDescription,
      type: supplier.type,
      city: supplier.city,
      region: supplier.region,
      address: `Демонстрационный адрес, ${supplier.city}`,
      website: url,
      sourceUrl: url,
      dataType: "DEMO",
      verificationStatus: "UNVERIFIED",
      lastVerifiedAt: null,
      createdAt,
      products: supplier.products.map((product) => ({
        category: product.category,
        name: product.name,
        description: null,
        price: product.price,
        moq: product.moq,
        unit: product.unit,
        delivery: product.delivery,
        dataType: "DEMO",
      })),
      contacts: [
        ["PHONE", "Демо-телефон", `+7 (000) 100-${String(index + 1).padStart(2, "0")}-01`, null],
        ["EMAIL", "Демо-почта", `demo+${supplier.slug}@example.com`, null],
        ["WEBSITE", "Демо-сайт", url, null],
      ],
      certs: supplier.certs.map((cert) => ({
        name: cert.name,
        status: cert.status,
        issuer: "Демонстрационный орган",
        sourceUrl: null,
        notes: "Запись вымышлена. Документ не проверялся и не подтверждает соответствие.",
      })),
      sources: [
        {
          type: "DEMO",
          url,
          title: "Демонстрационная карточка",
          evidence: "Fabricated sample. This URL is a placeholder, not a citation of a real company.",
          isPrimary: true,
          checkedAt: createdAt,
        },
      ],
    }, categoryIds);
  }

  for (const supplier of realSuppliers) {
    await upsertSupplier(client, {
      slug: supplier.slug,
      name: supplier.name,
      description: supplier.description,
      type: supplier.type,
      city: supplier.city,
      region: supplier.region,
      address: supplier.address,
      website: supplier.website,
      sourceUrl: supplier.sourceUrl,
      dataType: "REAL",
      verificationStatus: "PARTIALLY_VERIFIED",
      lastVerifiedAt: supplier.checkedAt,
      createdAt: supplier.checkedAt,
      products: supplier.products.map((product) => ({
        category: product.category,
        name: product.name,
        description: product.description ?? null,
        price: null,
        moq: null,
        unit: null,
        delivery: supplier.deliveryNotes ?? null,
        dataType: "REAL",
      })),
      contacts: supplier.contacts.map((contact) => [contact.type, contact.label, contact.value, contact.sourceUrl]),
      certs: supplier.certs,
      sources: supplier.sources.map((source) => ({
        type: "OFFICIAL_WEBSITE",
        url: source.url,
        title: source.title,
        evidence: source.evidence,
        isPrimary: source.isPrimary,
        checkedAt: supplier.checkedAt,
      })),
    }, categoryIds);
  }

  const demoSlugs = suppliers.map((supplier) => supplier.slug);
  await client.query(
    `DELETE FROM "Supplier" WHERE "dataType" = 'DEMO' AND NOT ("slug" = ANY($1::text[]))`,
    [demoSlugs],
  );

  await client.query("COMMIT");
  console.log(`Seeded ${realSuppliers.length} real and ${suppliers.length} demonstration suppliers.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

async function upsertSupplier(db, supplier, categoryIds) {
  const saved = await db.query(
    `INSERT INTO "Supplier"
      ("id", "name", "slug", "description", "supplierType", "city", "region", "country", "address", "website", "sourceUrl", "dataType", "verificationStatus", "lastVerifiedAt", "isActive", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,'Россия',$8,$9,$10,$11,$12,$13,true,$14,NOW())
     ON CONFLICT ("slug") DO UPDATE SET
       "name" = EXCLUDED."name",
       "description" = EXCLUDED."description",
       "supplierType" = EXCLUDED."supplierType",
       "city" = EXCLUDED."city",
       "region" = EXCLUDED."region",
       "country" = EXCLUDED."country",
       "address" = EXCLUDED."address",
       "website" = EXCLUDED."website",
       "sourceUrl" = EXCLUDED."sourceUrl",
       "dataType" = EXCLUDED."dataType",
       "verificationStatus" = EXCLUDED."verificationStatus",
       "lastVerifiedAt" = EXCLUDED."lastVerifiedAt",
       "isActive" = true,
       "updatedAt" = NOW()
     RETURNING "id"`,
    [
      idFor(`supplier:${supplier.slug}`),
      supplier.name,
      supplier.slug,
      supplier.description,
      supplier.type,
      supplier.city,
      supplier.region,
      supplier.address,
      supplier.website,
      supplier.sourceUrl,
      supplier.dataType,
      supplier.verificationStatus,
      supplier.lastVerifiedAt,
      supplier.createdAt,
    ],
  );
  const supplierId = saved.rows[0].id;

  await db.query(`DELETE FROM "SupplierProduct" WHERE "supplierId" = $1`, [supplierId]);
  await db.query(`DELETE FROM "SupplierContact" WHERE "supplierId" = $1`, [supplierId]);
  await db.query(`DELETE FROM "Certification" WHERE "supplierId" = $1`, [supplierId]);
  await db.query(`DELETE FROM "SupplierSource" WHERE "supplierId" = $1`, [supplierId]);

  for (const product of supplier.products) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Unknown category ${product.category} for ${supplier.slug}`);
    await db.query(
      `INSERT INTO "SupplierProduct"
        ("id", "supplierId", "categoryId", "name", "description", "estimatedPrice", "currency", "minimumOrderQuantity", "unit", "deliveryNotes", "isAvailable", "dataType", "priceUpdatedAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,'RUB',$7,$8,$9,$10,$11,$12,NOW())`,
      [
        idFor(`product:${supplier.slug}:${product.name}`),
        supplierId,
        categoryId,
        product.name,
        product.description,
        product.price,
        product.moq,
        product.unit,
        product.delivery,
        supplier.dataType === "DEMO" ? true : null,
        product.dataType,
        product.price == null ? null : supplier.createdAt,
      ],
    );
  }

  for (const [type, label, value, sourceUrl] of supplier.contacts) {
    await db.query(
      `INSERT INTO "SupplierContact" ("id", "supplierId", "type", "label", "value", "isPublic", "sourceUrl")
       VALUES ($1,$2,$3,$4,$5,true,$6)`,
      [idFor(`contact:${supplier.slug}:${type}:${value}`), supplierId, type, label, value, sourceUrl],
    );
  }

  for (const cert of supplier.certs) {
    await db.query(
      `INSERT INTO "Certification"
        ("id", "supplierId", "name", "status", "issuer", "verificationNotes", "sourceUrl", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [
        idFor(`cert:${supplier.slug}:${cert.name}`),
        supplierId,
        cert.name,
        cert.status,
        cert.issuer,
        cert.notes,
        cert.sourceUrl,
      ],
    );
  }

  for (const source of supplier.sources) {
    await db.query(
      `INSERT INTO "SupplierSource"
        ("id", "supplierId", "sourceType", "url", "title", "evidence", "isPrimary", "checkedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        idFor(`source:${supplier.slug}:${source.url}`),
        supplierId,
        source.type,
        source.url,
        source.title,
        source.evidence,
        source.isPrimary,
        source.checkedAt,
      ],
    );
  }
}
