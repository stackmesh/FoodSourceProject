import assert from "node:assert/strict";
import {
  cohortFromProductRows,
  defaultMatchWeights,
  matchSuppliers,
  resolveMatchWeights,
  type MatchSupplier,
} from "./matching";

const weights = Object.values(defaultMatchWeights);
assert.equal(Number(weights.reduce((sum, value) => sum + value, 0).toFixed(10)), 1);
assert.deepEqual(defaultMatchWeights, {
  product: 0.35,
  geography: 0.25,
  price: 0.15,
  moq: 0.1,
  certification: 0.1,
  delivery: 0.05,
});

assert.throws(() => resolveMatchWeights({ product: -1 }), /non-negative/);
assert.throws(
  () =>
    resolveMatchWeights({
      product: 0,
      geography: 0,
      price: 0,
      moq: 0,
      certification: 0,
      delivery: 0,
    }),
  /zero/,
);

const productOnly = resolveMatchWeights({ product: 70, geography: 0, price: 0, moq: 0, certification: 0, delivery: 0 });
assert.equal(productOnly.product, 1);

function supplier(patch: Partial<MatchSupplier> & Pick<MatchSupplier, "id" | "name">): MatchSupplier {
  return {
    city: null,
    region: null,
    dataType: "REAL",
    verificationStatus: "UNVERIFIED",
    products: [],
    certifications: [],
    ...patch,
  };
}

function product(patch: Partial<MatchSupplier["products"][number]> & Pick<MatchSupplier["products"][number], "name">) {
  return {
    categorySlug: "grocery",
    categoryNameRu: "Бакалея",
    categoryNameEn: "Grocery",
    price: null,
    currency: "RUB",
    moq: null,
    unit: null,
    deliveryNotes: null,
    ...patch,
  };
}

const dairy = supplier({
  id: "dairy",
  name: "ЭкоНива",
  city: "Москва",
  products: [product({ name: "Молоко", categorySlug: "dairy", categoryNameRu: "Молочная продукция", categoryNameEn: "Dairy" })],
});
const poultry = supplier({
  id: "poultry",
  name: "Приволжская птица",
  city: "Казань",
  region: "Республика Татарстан",
  dataType: "DEMO",
  products: [
    product({
      name: "Тушка цыплёнка-бройлера",
      categorySlug: "meat",
      categoryNameRu: "Мясо",
      categoryNameEn: "Meat",
      price: 246,
      moq: 100,
      unit: "кг",
      deliveryNotes: "Демо: доставка по региону",
    }),
  ],
  certifications: [{ status: "UNVERIFIED" }],
});

const [found] = matchSuppliers([dairy], { query: "МОЛОКО", category: "dairy", city: "Москва" });
assert.equal(found.factors.find((factor) => factor.key === "product")?.reason, "category_match");
assert.equal(found.factors.find((factor) => factor.key === "geography")?.reason, "location_match");
assert.equal(found.factors.find((factor) => factor.key === "price")?.status, "missing");
assert.equal(found.factors.find((factor) => factor.key === "price")?.points, null);
assert.equal(found.doesNotGuaranteeBestSupplier, true);
assert.equal(found.countsAsVerifiedSupplier, false);

const [yeMatch] = matchSuppliers([poultry], { query: "цыпленка" });
assert.equal(yeMatch.factors.find((factor) => factor.key === "product")?.reason, "product_text");
assert.equal(yeMatch.factors.find((factor) => factor.key === "certification")?.reason, "demonstration_not_evidence");
assert.notEqual(yeMatch.factors.find((factor) => factor.key === "certification")?.reason, "verified");

const pricedKg = supplier({
  id: "kg-low",
  name: "Низкая цена",
  products: [product({ name: "Рис", price: 90, moq: 50, unit: "кг" })],
});
const pricedKgHigh = supplier({
  id: "kg-high",
  name: "Высокая цена",
  products: [product({ name: "Рис", price: 180, moq: 20, unit: "kg" })],
});
const pricedPieces = supplier({
  id: "pieces",
  name: "Штуки",
  products: [product({ name: "Контейнер", price: 6.5, moq: 10, unit: "шт" })],
});

const sameUnit = matchSuppliers([pricedKg, pricedKgHigh]);
assert.equal(sameUnit[0].price.lowest, true);
assert.equal(sameUnit[1].price.lowest, false);
assert.equal(sameUnit[0].price.mixedUnits, false);
assert.equal(sameUnit[0].moq.lowest, false);
assert.equal(sameUnit[1].moq.lowest, true);
assert.ok((sameUnit[0].factors.find((factor) => factor.key === "price")?.ratio ?? 0) > (sameUnit[1].factors.find((factor) => factor.key === "price")?.ratio ?? 0));

const mixed = matchSuppliers([pricedKg, pricedPieces]);
assert.equal(mixed[0].price.lowest, false);
assert.equal(mixed[1].price.lowest, false);
assert.equal(mixed[0].price.mixedUnits, true);
assert.equal(mixed[1].price.mixedUnits, true);
assert.equal(mixed[0].price.amount, 90);
assert.equal(mixed[0].price.unit, "kg");
assert.equal(mixed[1].price.amount, 6.5);
assert.equal(mixed[1].price.unit, "pcs");
assert.equal(mixed[0].moq.amount, 50);
assert.equal(mixed[1].moq.amount, 10);
assert.equal(mixed[0].moq.lowest, false);
assert.equal(mixed[1].moq.lowest, false);
assert.equal(mixed[0].factors.find((factor) => factor.key === "price")?.status, "not_comparable");
assert.equal(mixed[1].factors.find((factor) => factor.key === "moq")?.status, "not_comparable");

const withOutlier = matchSuppliers([pricedKg, pricedKgHigh, pricedPieces]);
assert.equal(withOutlier[2].price.amount, 6.5);
assert.equal(withOutlier[2].price.mixedUnits, true);
assert.equal(withOutlier[2].price.lowest, false);
assert.equal(withOutlier[0].price.mixedUnits, false);

for (const report of sameUnit) {
  const points = report.factors.reduce((total, factor) => total + (factor.points ?? 0), 0);
  assert.equal(points, report.score);
  assert.ok(report.factors.every((factor) => factor.points == null || Number.isInteger(factor.points)));
}

const [wrongCity] = matchSuppliers([poultry], { city: "Москва" });
assert.equal(wrongCity.factors.find((factor) => factor.key === "geography")?.reason, "location_miss");
assert.equal(wrongCity.factors.find((factor) => factor.key === "geography")?.ratio, 0);

const [partialLocation] = matchSuppliers([poultry], { city: "Москва", region: "Республика Татарстан" });
assert.equal(partialLocation.factors.find((factor) => factor.key === "geography")?.reason, "partial_location");

const aliasCohort = cohortFromProductRows([
  { supplierId: "a", unit: "кг", currency: "RUB", price: 10, moq: 1 },
  { supplierId: "a", unit: "kg", currency: "RUB", price: 12, moq: 2 },
  { supplierId: "b", unit: "kg", currency: "RUB", price: 20, moq: 3 },
]);
const aliasPrices = aliasCohort.prices ?? [];
const aliasPrice = aliasPrices[0];
assert.equal(aliasPrices.length, 1);
assert.equal(aliasPrice?.unit, "kg");
assert.equal(aliasPrice?.suppliers, 2);

const knownUnverified = supplier({
  id: "claimed",
  name: "Заявлено",
  dataType: "REAL",
  products: [product({ name: "Масло", categorySlug: "grocery" })],
  certifications: [{ status: "UNVERIFIED" }],
});
const unknownCerts = supplier({
  id: "unknown",
  name: "Без записей",
  dataType: "REAL",
  products: [product({ name: "Масло", categorySlug: "grocery" })],
});
const verified = supplier({
  id: "verified",
  name: "Проверено",
  dataType: "REAL",
  verificationStatus: "VERIFIED",
  products: [product({ name: "Масло", categorySlug: "grocery" })],
  certifications: [{ status: "VERIFIED" }],
});
const expired = supplier({
  id: "expired",
  name: "Истекло",
  dataType: "REAL",
  products: [product({ name: "Масло", categorySlug: "grocery" })],
  certifications: [{ status: "EXPIRED" }],
});
const certReports = matchSuppliers([knownUnverified, unknownCerts, verified, expired], { category: "grocery" });
assert.equal(certReports[0].factors.find((factor) => factor.key === "certification")?.reason, "unverified_not_counted");
assert.equal(certReports[0].factors.find((factor) => factor.key === "certification")?.ratio, 0);
assert.equal(certReports[0].verifiedCertifications, 0);
assert.equal(certReports[1].factors.find((factor) => factor.key === "certification")?.status, "missing");
assert.equal(certReports[1].factors.find((factor) => factor.key === "certification")?.points, null);
assert.equal(certReports[2].factors.find((factor) => factor.key === "certification")?.reason, "verified");
assert.equal(certReports[2].countsAsVerifiedSupplier, true);
assert.equal(certReports[3].factors.find((factor) => factor.key === "certification")?.reason, "expired_not_verified");
assert.ok((certReports[1].score ?? 0) > (certReports[0].score ?? 0));

const stated = supplier({
  id: "stated",
  name: "Доставка",
  city: "Казань",
  products: [product({ name: "Салат", deliveryNotes: "Поставка в Казань и Москву" })],
});
const [delivery] = matchSuppliers([stated], { city: "Казань" });
const deliveryFactor = delivery.factors.find((factor) => factor.key === "delivery");
assert.equal(deliveryFactor?.reason, "stated_for_requested_place_unverified");
assert.equal(delivery.deliveryVerified, false);

const [unasked] = matchSuppliers([stated]);
assert.equal(unasked.factors.find((factor) => factor.key === "delivery")?.status, "not_requested");
assert.equal(unasked.factors.find((factor) => factor.key === "delivery")?.points, null);

const meat = supplier({
  id: "meat",
  name: "Мясо",
  products: [product({ name: "Говядина", categorySlug: "meat" })],
});
const alsoMeat = supplier({
  id: "also-meat",
  name: "Ещё мясо",
  products: [product({ name: "Свинина", categorySlug: "meat" })],
});
const packaging = supplier({
  id: "pack",
  name: "Упаковка",
  products: [product({ name: "Короб", categorySlug: "packaging" })],
});
const compatibility = matchSuppliers([meat, alsoMeat, packaging]);
assert.equal(compatibility[0].factors.find((factor) => factor.key === "product")?.reason, "shared_category");
assert.equal(compatibility[2].factors.find((factor) => factor.key === "product")?.reason, "different_categories");

const [weighted] = matchSuppliers([pricedKg, pricedKgHigh], {
  weights: { product: 0, geography: 0, price: 1, moq: 0, certification: 0, delivery: 0 },
});
assert.equal(weighted.score, 100);
assert.equal(weighted.factors.find((factor) => factor.key === "price")?.weight, 1);

const [missingOnly] = matchSuppliers([
  supplier({
    id: "empty",
    name: "Пусто",
    products: [product({ name: "Без чисел", categorySlug: "grocery" })],
  }),
], { category: "grocery" });
assert.equal(missingOnly.score, 100);
assert.equal(Number(missingOnly.coverage.toFixed(2)), 0.35);
assert.ok(missingOnly.factors.filter((factor) => factor.key !== "product").every((factor) => factor.points == null));

console.log("matching checks passed");
