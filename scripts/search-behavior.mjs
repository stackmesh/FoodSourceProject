import { config } from "dotenv";
import pg from "pg";
import { createSupplier, deleteSupplier, updateSupplier } from "../src/server/supplier-records.ts";
import { getSupplier, scoreSupplier, searchSuppliers } from "../src/server/catalog.ts";
import { parseDiscoveryQuery } from "../src/lib/discovery-query.ts";
import { cohortFromProductRows, normalizeComparableUnit } from "../src/server/matching.ts";

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

const milkByName = await names({ q: "МОЛОКО", scope: "name" });
check("name scope keeps a supplier whose name contains молоко", milkByName.slugs.includes("sibirskoe-moloko"));
check("name scope skips a supplier that only matches a product", !milkByName.slugs.includes("ekoniva"));

const milkByProduct = await names({ q: "МОЛОКО", scope: "product" });
check("product scope finds EkoNiva", milkByProduct.slugs.includes("ekoniva"));

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
check("certification filter includes a real sourced claim", certified.slugs.includes("miratorg"));
check("certification filter excludes demonstration certificates", !certified.slugs.includes("privolzhskaya-ptica"));
check(
  "certification filter excludes a supplier with no certificate",
  !certified.slugs.includes("donskaya-govyadina") && !certified.slugs.includes("ekoniva"),
);

const priceSorted = await searchSuppliers(parseDiscoveryQuery({ sort: "price" }));
const priceItems = [...priceSorted.items];
for (let page = 2; page <= priceSorted.pages; page += 1) {
  const next = await searchSuppliers(parseDiscoveryQuery({ sort: "price", page: String(page) }));
  priceItems.push(...next.items);
}
const priceCohort = cohortFromProductRows(
  priceItems.flatMap((item) =>
    item.supplier.products.map((product) => ({
      supplierId: item.supplier.id,
      unit: product.unit,
      currency: product.currency,
      price: product.price,
      moq: product.moq,
    })),
  ),
);
const dominantPrice = [...priceCohort.prices].sort((left, right) => right.suppliers - left.suppliers)[0];
const dominantTied =
  priceCohort.prices.filter((group) => group.suppliers === dominantPrice?.suppliers).length > 1;
const comparablePrices = priceItems.map((item) => {
  if (!dominantPrice || dominantTied) return null;
  const amounts = item.supplier.products.flatMap((product) =>
    product.price != null &&
    (product.currency || "RUB") === dominantPrice.currency &&
    normalizeComparableUnit(product.unit) === dominantPrice.unit
      ? [product.price]
      : [],
  );
  return amounts.length ? Math.min(...amounts) : null;
});
const firstWithoutUnit = comparablePrices.indexOf(null);
check("price sort has one comparable unit", Boolean(dominantPrice) && !dominantTied && dominantPrice.unit === "kg");
check(
  "price sort is ascending inside that unit",
  comparablePrices.filter((value) => value != null).every((value, index, values) => index === 0 || value >= values[index - 1]),
);
check(
  "price sort leaves other units after the comparable unit",
  firstWithoutUnit === -1 || comparablePrices.slice(firstWithoutUnit).every((value) => value == null),
);
check("a piece price is not ranked as the lowest kilogram price", priceItems[0]?.supplier.slug !== "upakovka-povolzhyya");

const page1 = await searchSuppliers(parseDiscoveryQuery({ sort: "name", page: "1" }));
const page2 = await searchSuppliers(parseDiscoveryQuery({ sort: "name", page: "2" }));
check("page size is 9", page1.items.length === 9 && page1.total === 26);
check(
  "page 2 differs from page 1",
  page2.items.length === 9 &&
    page2.items.every((item) => !page1.items.some((first) => first.supplier.slug === item.supplier.slug)),
);

const dairyName = await searchSuppliers(parseDiscoveryQuery({ category: "dairy" }));
const dairyMatch = await searchSuppliers(parseDiscoveryQuery({ category: "dairy", sort: "match" }));
check("category filter total is unchanged by match sort", dairyName.total === dairyMatch.total && dairyMatch.total > 0);
check(
  "match sort is descending",
  dairyMatch.items.every((item, index, items) => {
    if (index === 0) return true;
    const previous = items[index - 1]?.score;
    if (previous == null) return item.score == null;
    if (item.score == null) return true;
    return item.score <= previous;
  }),
);
check(
  "match rows include a six-part breakdown",
  dairyMatch.items.every((item) => item.report?.factors?.length === 6),
);
const listedTop = (await searchSuppliers(parseDiscoveryQuery({ sort: "match" }))).items[0];
const listedSupplier = await getSupplier(listedTop.supplier.slug);
const profileScore = await scoreSupplier(listedSupplier, parseDiscoveryQuery({}));
const profileFromSort = await scoreSupplier(listedSupplier, parseDiscoveryQuery({ sort: "match" }));
check(
  "profile uses the same catalog score as match sort",
  profileScore?.score != null &&
    profileScore.score === listedTop.score &&
    profileFromSort?.score === listedTop.score,
);
const ekoSupplier = await getSupplier("ekoniva");
const ekoProfile = await scoreSupplier(ekoSupplier, parseDiscoveryQuery({ category: "dairy" }));
const eko = dairyMatch.items.find((item) => item.supplier.slug === "ekoniva");
check("profile keeps the filtered dairy score", ekoProfile?.score === eko?.score && ekoProfile?.score != null);
check(
  "missing prices do not become a perfect score",
  Boolean(eko) &&
    eko.score != null &&
    eko.score < 100 &&
    eko.report.factors.find((factor) => factor.key === "price")?.status === "missing",
);
const matchedPage1 = await searchSuppliers(parseDiscoveryQuery({ sort: "match", page: "1" }));
const matchedPage2 = await searchSuppliers(parseDiscoveryQuery({ sort: "match", page: "2" }));
check(
  "match sort pages do not repeat suppliers",
  matchedPage2.items.length > 0 &&
    matchedPage2.items.every((item) => !matchedPage1.items.some((first) => first.supplier.id === item.supplier.id)),
);
const boundaryScores = [...matchedPage1.items.map((item) => item.score), matchedPage2.items[0]?.score];
check(
  "match sort stays descending across pages",
  boundaryScores.every((score, index) => {
    if (index === 0) return true;
    const previous = boundaryScores[index - 1];
    if (previous == null) return score == null;
    if (score == null) return true;
    return score <= previous;
  }),
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
