import type { CatalogSupplier } from "@/server/catalog-types";
import { foldSearchText, type DiscoveryQuery } from "@/lib/discovery-query";

export const scoreWeights = {
  category: 0.35,
  geography: 0.25,
  price: 0.15,
  moq: 0.1,
  certification: 0.1,
  delivery: 0.05,
} as const;

export type ScoreRange = { min: number; max: number } | null;

function lowerIsBetter(value: number | null, range: ScoreRange) {
  if (value == null) {
    return 0.2;
  }

  if (!range || range.max === range.min) {
    return 1;
  }

  return 1 - (value - range.min) / (range.max - range.min);
}

export function scoreSupplier(
  supplier: CatalogSupplier,
  query: DiscoveryQuery,
  priceRange: ScoreRange,
  moqRange: ScoreRange,
) {
  const needle = foldSearchText(query.q);
  const name = foldSearchText(supplier.name);
  const city = foldSearchText(supplier.city ?? "");
  const region = foldSearchText(supplier.region ?? "");

  let category = query.q || query.category ? 0.15 : 0.5;
  if (query.category && supplier.products.some((product) => product.categorySlug === query.category)) {
    category = 1;
  } else if (needle) {
    const productHit = supplier.products.some((product) =>
      foldSearchText([product.name, product.categoryNameRu, product.categoryNameEn].join(" ")).includes(needle),
    );
    category = productHit ? 1 : name.includes(needle) ? 0.55 : 0.15;
  }

  let geography = 0.5;
  if (query.city || query.region) {
    geography = 1;
  } else if (needle && (city.includes(needle) || region.includes(needle))) {
    geography = 1;
  } else if (needle) {
    geography = 0.35;
  }

  const price = lowerIsBetter(supplier.minPrice, priceRange);
  const moq = lowerIsBetter(supplier.minMoq, moqRange);
  const certification =
    supplier.certifications.length === 0
      ? 0
      : supplier.certifications.some((item) => item.status === "VERIFIED")
        ? 1
        : 0.55;
  const delivery = supplier.products.some((product) => product.deliveryNotes) ? 1 : 0;

  const total = Math.round(
    (category * scoreWeights.category +
      geography * scoreWeights.geography +
      price * scoreWeights.price +
      moq * scoreWeights.moq +
      certification * scoreWeights.certification +
      delivery * scoreWeights.delivery) *
      100,
  );

  return total;
}
