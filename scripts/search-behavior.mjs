import { config } from "dotenv";
import pg from "pg";
import { createSupplier, deleteSupplier, updateSupplier } from "../src/server/supplier-records.ts";
import { searchSuppliers } from "../src/server/catalog.ts";
import { parseDiscoveryQuery } from "../src/lib/discovery-query.ts";

config();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const db = new pg.Client({ connectionString });
await db.connect();

const failures = [];

function check(name, condition) {
  if (!condition) failures.push(name);
  else console.log(`ok ${name}`);
}

const counts = await db.query(
  `SELECT "dataType", COUNT(*)::int AS count FROM "Supplier" GROUP BY "dataType" ORDER BY "dataType"`,
);
const byType = Object.fromEntries(counts.rows.map((row) => [row.dataType, row.count]));
check("eight real suppliers", byType.REAL === 8);
check("eighteen demo suppliers", byType.DEMO === 18);

const realGaps = await db.query(
  `SELECT s."slug"
   FROM "Supplier" s
   LEFT JOIN "SupplierProduct" p ON p."supplierId" = s."id"
   WHERE s."dataType" = 'REAL'
   GROUP BY s."id", s."slug"
   HAVING COUNT(p."estimatedPrice") > 0 OR COUNT(p."minimumOrderQuantity") > 0`,
);
check("real prices and MOQ stay null", realGaps.rowCount === 0);

const unsourced = await db.query(
  `SELECT s."slug"
   FROM "Supplier" s
   WHERE s."dataType" = 'REAL'
     AND NOT EXISTS (
       SELECT 1 FROM "SupplierSource" src
       WHERE src."supplierId" = s."id" AND src."url" LIKE 'https://%'
     )`,
);
check("every real supplier has an https source", unsourced.rowCount === 0);

const slugs = await db.query(`SELECT COUNT(DISTINCT "slug")::int AS count, COUNT(*)::int AS rows FROM "Supplier"`);
check("no duplicate slugs", slugs.rows[0].count === slugs.rows[0].rows);

const ekoniva = await db.query(`SELECT "id" FROM "Supplier" WHERE "slug" = 'ekoniva'`);
await db.query(
  `INSERT INTO "Shortlist" ("id", "workspaceKey", "supplierId", "contactStatus", "updatedAt")
   VALUES (gen_random_uuid(), 'demo-workspace', $1, 'TO_CONTACT', NOW())
   ON CONFLICT ("workspaceKey", "supplierId") DO UPDATE SET "contactStatus" = 'TO_CONTACT', "updatedAt" = NOW()`,
  [ekoniva.rows[0].id],
);
await db.query(
  `INSERT INTO "SupplierNote" ("id", "workspaceKey", "supplierId", "content", "updatedAt")
   VALUES (gen_random_uuid(), 'demo-workspace', $1, 'Проверка заметки', NOW())`,
  [ekoniva.rows[0].id],
);
const saved = await db.query(
  `SELECT s."contactStatus", n."content"
   FROM "Shortlist" s
   JOIN "SupplierNote" n ON n."supplierId" = s."supplierId" AND n."workspaceKey" = s."workspaceKey"
   WHERE s."supplierId" = $1 AND n."content" = 'Проверка заметки'`,
  [ekoniva.rows[0].id],
);
check("favorite and note persist", saved.rows[0]?.contactStatus === "TO_CONTACT" && saved.rows[0]?.content === "Проверка заметки");
await db.query(`DELETE FROM "SupplierNote" WHERE "supplierId" = $1 AND "content" = 'Проверка заметки'`, [ekoniva.rows[0].id]);
await db.query(`DELETE FROM "Shortlist" WHERE "supplierId" = $1 AND "workspaceKey" = 'demo-workspace'`, [ekoniva.rows[0].id]);

await db.end();

async function names(raw) {
  const first = await searchSuppliers(parseDiscoveryQuery(raw));
  const slugs = first.items.map((item) => item.supplier.slug);
  const prices = first.items.map((item) => item.supplier.minPrice);

  for (let page = 2; page <= first.pages; page += 1) {
    const next = await searchSuppliers(parseDiscoveryQuery({ ...raw, page: String(page) }));
    slugs.push(...next.items.map((item) => item.supplier.slug));
  }

  return { total: first.total, slugs, prices, pageSize: first.items.length };
}

const milk = await names({ q: "МОЛОКО" });
check("МОЛОКО finds EkoNiva", milk.slugs.includes("ekoniva"));
check("МОЛОКО finds demo milk", milk.slugs.includes("nevskaya-molochnaya"));

const ye = await names({ q: "цыпленка" });
check("е matches ё in цыплёнка", ye.slugs.includes("privolzhskaya-ptica"));

const yo = await names({ q: "ЦЫПЛЁНКА" });
check("ЦЫПЛЁНКА matches the same demo product", yo.slugs.includes("privolzhskaya-ptica"));

const dairy = await names({ category: "dairy" });
check("dairy filter includes EkoNiva", dairy.slugs.includes("ekoniva"));
check("dairy filter excludes a meat supplier", !dairy.slugs.includes("privolzhskaya-ptica"));

const city = await names({ city: "Владивосток" });
check("Vladivostok is only Russian Fishery", city.total === 1 && city.slugs[0] === "russian-fishery");

const region = await names({ region: "Белгородская область" });
check("Belgorod region is only EFKO", region.total === 1 && region.slugs[0] === "efko");

const price = await names({ maxPrice: "100" });
check("price filter includes cheap demo milk", price.slugs.includes("nevskaya-molochnaya"));
check("price filter excludes unsourced real prices", !price.slugs.includes("ekoniva") && !price.slugs.includes("miratorg"));

const moq = await names({ maxMoq: "10" });
check("MOQ filter includes a low demo order", moq.slugs.includes("baltiyskiy-ulov") || moq.slugs.includes("moskovskaya-teplitsa"));
check("MOQ filter excludes null real MOQ", !moq.slugs.includes("ekoniva"));

const certified = await names({ certified: "1" });
check("certification filter includes Miratorg", certified.slugs.includes("miratorg"));
check("certification filter includes a certified demo row", certified.slugs.includes("privolzhskaya-ptica"));
check(
  "certification filter excludes a supplier with no certificate",
  !certified.slugs.includes("donskaya-govyadina") && !certified.slugs.includes("ekoniva"),
);

const sorted = await names({ sort: "price" });
const priced = sorted.prices.filter((value) => value != null);
check("price sort puts a priced supplier first", sorted.prices[0] != null && sorted.slugs[0] === "upakovka-povolzhyya");
check("price sort is ascending", priced.every((value, index) => index === 0 || value >= priced[index - 1]));

const page1 = await searchSuppliers(parseDiscoveryQuery({ sort: "name", page: "1" }));
const page2 = await searchSuppliers(parseDiscoveryQuery({ sort: "name", page: "2" }));
check("page size is 9", page1.items.length === 9 && page1.total === 26);
check(
  "page 2 differs from page 1",
  page2.items.length === 9 &&
    page2.items.every((item) => !page1.items.some((first) => first.supplier.slug === item.supplier.slug)),
);

const created = await createSupplier({
  name: "ДЕМО — Временный поиск",
  slug: "vremennyy-poisk",
  description: "Временная запись для проверки CRUD.",
  supplierType: "OTHER",
  city: "Томск",
  region: "Томская область",
  address: null,
  website: null,
  sourceUrl: "https://example.com/demo/vremennyy-poisk",
  dataType: "DEMO",
  products: [
    {
      name: "Пробный продукт",
      categorySlug: "grocery",
      estimatedPrice: 15,
      minimumOrderQuantity: 3,
      unit: "кг",
      deliveryNotes: null,
    },
  ],
});
const createdSearch = await names({ q: "Временный", city: "Томск" });
check("created supplier is searchable", createdSearch.slugs.includes("vremennyy-poisk"));

await updateSupplier(created.id, {
  name: "ДЕМО — Временный поиск обновлён",
  slug: "vremennyy-poisk",
  description: "Временная запись для проверки CRUD.",
  supplierType: "OTHER",
  city: "Томск",
  region: "Томская область",
  address: null,
  website: null,
  sourceUrl: "https://example.com/demo/vremennyy-poisk",
  dataType: "DEMO",
  products: [
    {
      name: "Обновлённый продукт",
      categorySlug: "grocery",
      estimatedPrice: 15,
      minimumOrderQuantity: 3,
      unit: "кг",
      deliveryNotes: null,
    },
  ],
});
const updatedSearch = await names({ q: "обновлён" });
check("updated name is searchable", updatedSearch.slugs.includes("vremennyy-poisk"));

await deleteSupplier(created.id);
const deletedSearch = await names({ q: "Временный" });
check("deleted supplier leaves search", !deletedSearch.slugs.includes("vremennyy-poisk"));

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("search and filter checks passed");
