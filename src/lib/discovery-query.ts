const sorts = ["relevance", "price", "moq", "name"] as const;
const supplierTypes = [
  "MANUFACTURER",
  "DISTRIBUTOR",
  "FARM",
  "IMPORTER",
  "PACKAGING",
  "WHOLESALER",
  "OTHER",
] as const;

export type SortKey = (typeof sorts)[number];
export type SupplierTypeFilter = (typeof supplierTypes)[number];

export type DiscoveryQuery = {
  q: string;
  category: string;
  city: string;
  region: string;
  type: SupplierTypeFilter | "";
  certified: boolean;
  maxPrice: number | null;
  maxMoq: number | null;
  sort: SortKey;
  page: number;
};

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function numberOrNull(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isSort(value: string): value is SortKey {
  return sorts.some((sort) => sort === value);
}

function isSupplierType(value: string): value is SupplierTypeFilter {
  return supplierTypes.some((type) => type === value);
}

export function parseDiscoveryQuery(
  raw: Record<string, string | string[] | undefined>,
): DiscoveryQuery {
  const sort = first(raw.sort);
  const type = first(raw.type);
  const page = Number(first(raw.page) || "1");

  return {
    q: first(raw.q),
    category: first(raw.category),
    city: first(raw.city),
    region: first(raw.region),
    type: isSupplierType(type) ? type : "",
    certified: first(raw.certified) === "1",
    maxPrice: numberOrNull(first(raw.maxPrice)),
    maxMoq: numberOrNull(first(raw.maxMoq)),
    sort: isSort(sort) ? sort : "name",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function toSearchParams(query: DiscoveryQuery, page = query.page) {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.city) params.set("city", query.city);
  if (query.region) params.set("region", query.region);
  if (query.type) params.set("type", query.type);
  if (query.certified) params.set("certified", "1");
  if (query.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
  if (query.maxMoq != null) params.set("maxMoq", String(query.maxMoq));
  if (query.sort !== "name") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));

  return params;
}

export function hasRankingContext(query: DiscoveryQuery) {
  return Boolean(query.q || query.category || query.city || query.region);
}
