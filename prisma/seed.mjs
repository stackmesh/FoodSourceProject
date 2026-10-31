import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import pg from "pg";
import ts from "typescript";

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

const description =
  "Демонстрационная карточка. Название, цены, минимальный заказ, контакты и сертификаты вымышлены и не являются коммерческим предложением или проверенным источником.";

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query("BEGIN");
  await client.query(`DELETE FROM "Supplier" WHERE "dataType" = 'DEMO'`);
  await client.query(`DELETE FROM "Category"`);

  for (const category of categories) {
    await client.query(
      `INSERT INTO "Category" ("id", "nameRu", "nameEn", "slug", "sortOrder", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [idFor(`category:${category.slug}`), category.nameRu, category.nameEn, category.slug, category.sortOrder],
    );
  }

  for (const [index, supplier] of suppliers.entries()) {
    const supplierId = idFor(`supplier:${supplier.slug}`);
    const createdAt = new Date(Date.UTC(2026, 8, 1) + index * 36 * 60 * 60 * 1000);
    const url = `https://example.com/demo/${supplier.slug}`;

    await client.query(
      `INSERT INTO "Supplier"
        ("id", "name", "slug", "description", "supplierType", "city", "region", "country", "address", "website", "sourceUrl", "dataType", "verificationStatus", "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Россия',$8,$9,$9,'DEMO','UNVERIFIED',true,$10,$10)`,
      [
        supplierId,
        supplier.name,
        supplier.slug,
        description,
        supplier.type,
        supplier.city,
        supplier.region,
        `Демонстрационный адрес, ${supplier.city}`,
        url,
        createdAt,
      ],
    );

    for (const product of supplier.products) {
      await client.query(
        `INSERT INTO "SupplierProduct"
          ("id", "supplierId", "categoryId", "name", "estimatedPrice", "currency", "minimumOrderQuantity", "unit", "deliveryNotes", "isAvailable", "dataType", "priceUpdatedAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,'RUB',$6,$7,$8,true,'DEMO',$9,NOW())`,
        [
          idFor(`product:${supplier.slug}:${product.name}`),
          supplierId,
          idFor(`category:${product.category}`),
          product.name,
          product.price,
          product.moq,
          product.unit,
          product.delivery,
          product.price == null ? null : createdAt,
        ],
      );
    }

    const contacts = [
      ["PHONE", "Демо-телефон", `+7 (000) 100-${String(index + 1).padStart(2, "0")}-01`],
      ["EMAIL", "Демо-почта", `demo+${supplier.slug}@example.com`],
      ["WEBSITE", "Демо-сайт", url],
    ];

    for (const [type, label, value] of contacts) {
      await client.query(
        `INSERT INTO "SupplierContact" ("id", "supplierId", "type", "label", "value", "isPublic")
         VALUES ($1,$2,$3,$4,$5,true)`,
        [idFor(`contact:${supplier.slug}:${type}`), supplierId, type, label, value],
      );
    }

    for (const cert of supplier.certs) {
      await client.query(
        `INSERT INTO "Certification"
          ("id", "supplierId", "name", "status", "issuer", "verificationNotes", "updatedAt")
         VALUES ($1,$2,$3,$4,'Демонстрационный орган',$5,NOW())`,
        [
          idFor(`cert:${supplier.slug}:${cert.name}`),
          supplierId,
          cert.name,
          cert.status,
          "Запись вымышлена. Документ не проверялся и не подтверждает соответствие.",
        ],
      );
    }

    await client.query(
      `INSERT INTO "SupplierSource"
        ("id", "supplierId", "sourceType", "url", "title", "evidence", "isPrimary", "checkedAt")
       VALUES ($1,$2,'DEMO',$3,'Демонстрационная карточка',$4,true,$5)`,
      [
        idFor(`source:${supplier.slug}`),
        supplierId,
        url,
        "Fabricated sample. This URL is a placeholder, not a citation of a real company.",
        createdAt,
      ],
    );
  }

  await client.query("COMMIT");
  console.log(`Seeded ${suppliers.length} demonstration suppliers.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
