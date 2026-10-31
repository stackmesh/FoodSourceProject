import { demoWorkspaceKey } from "@/config/site";
import type { ContactStatus } from "@/generated/prisma/client";
import {
  hasRankingContext,
  type DiscoveryQuery,
} from "@/lib/discovery-query";
import { scoreSupplier } from "@/lib/scoring";
import { getPrisma } from "@/lib/prisma";
import {
  DataError,
  type CatalogSupplier,
  type WorkspaceEntry,
  type WorkspaceNote,
} from "@/server/catalog-types";

const pageSize = 9;

const supplierInclude = {
  products: {
    include: { category: true },
    orderBy: { name: "asc" as const },
  },
  contacts: { orderBy: { type: "asc" as const } },
  certifications: { orderBy: { name: "asc" as const } },
  sources: { orderBy: { isPrimary: "desc" as const } },
};

type SupplierRow = Awaited<
  ReturnType<ReturnType<typeof getPrisma>["supplier"]["findMany"]>
>[number];

function asNumber(value: { toString(): string } | null | undefined) {
  if (value == null) {
    return null;
  }

  const number = Number(value.toString());
  return Number.isFinite(number) ? number : null;
}

function mapSupplier(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  supplierType: CatalogSupplier["supplierType"];
  city: string | null;
  region: string | null;
  country: string;
  address: string | null;
  website: string | null;
  sourceUrl: string | null;
  dataType: CatalogSupplier["dataType"];
  verificationStatus: CatalogSupplier["verificationStatus"];
  createdAt: Date;
  products: Array<{
    id: string;
    name: string;
    estimatedPrice: { toString(): string } | null;
    currency: string;
    minimumOrderQuantity: { toString(): string } | null;
    unit: string | null;
    deliveryNotes: string | null;
    priceUpdatedAt: Date | null;
    category: { slug: string; nameRu: string; nameEn: string };
  }>;
  contacts: CatalogSupplier["contacts"];
  certifications: Array<{
    id: string;
    name: string;
    documentUrl: string | null;
    issuer: string | null;
    status: CatalogSupplier["certifications"][number]["status"];
    expiresAt: Date | null;
    verificationNotes: string | null;
  }>;
  sources: CatalogSupplier["sources"];
}): CatalogSupplier {
  const products = row.products.map((product) => ({
    id: product.id,
    name: product.name,
    categorySlug: product.category.slug,
    categoryNameRu: product.category.nameRu,
    categoryNameEn: product.category.nameEn,
    price: asNumber(product.estimatedPrice),
    currency: product.currency,
    moq: asNumber(product.minimumOrderQuantity),
    unit: product.unit,
    deliveryNotes: product.deliveryNotes,
    priceUpdatedAt: product.priceUpdatedAt?.toISOString() ?? null,
  }));
  const prices = products.flatMap((product) => (product.price == null ? [] : [product.price]));
  const moqs = products.flatMap((product) => (product.moq == null ? [] : [product.moq]));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    supplierType: row.supplierType,
    city: row.city,
    region: row.region,
    country: row.country,
    address: row.address,
    website: row.website,
    sourceUrl: row.sourceUrl,
    dataType: row.dataType,
    verificationStatus: row.verificationStatus,
    createdAt: row.createdAt.toISOString(),
    products,
    contacts: row.contacts,
    certifications: row.certifications.map((item) => ({
      ...item,
      expiresAt: item.expiresAt?.toISOString() ?? null,
    })),
    sources: row.sources,
    minPrice: prices.length ? Math.min(...prices) : null,
    minMoq: moqs.length ? Math.min(...moqs) : null,
  };
}

async function readCatalog() {
  try {
    const rows = await getPrisma().supplier.findMany({
      where: { isActive: true },
      include: supplierInclude,
      orderBy: { name: "asc" },
    });

    return rows.map((row) => mapSupplier(row as SupplierRow & Parameters<typeof mapSupplier>[0]));
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
}

function includesQuery(supplier: CatalogSupplier, needle: string) {
  return [supplier.name, supplier.city, supplier.region, ...supplier.products.flatMap((product) => [
    product.name,
    product.categoryNameRu,
    product.categoryNameEn,
  ])]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase("ru")
    .includes(needle);
}

function matches(supplier: CatalogSupplier, query: DiscoveryQuery) {
  if (query.category && !supplier.products.some((product) => product.categorySlug === query.category)) {
    return false;
  }
  if (query.city && supplier.city !== query.city) return false;
  if (query.region && supplier.region !== query.region) return false;
  if (query.type && supplier.supplierType !== query.type) return false;
  if (query.certified && supplier.certifications.length === 0) return false;
  if (query.maxPrice != null && (supplier.minPrice == null || supplier.minPrice > query.maxPrice)) {
    return false;
  }
  if (query.maxMoq != null && (supplier.minMoq == null || supplier.minMoq > query.maxMoq)) {
    return false;
  }
  if (query.q && !includesQuery(supplier, query.q.toLocaleLowerCase("ru"))) return false;
  return true;
}

function range(values: Array<number | null>) {
  const present = values.filter((value): value is number => value != null);
  if (!present.length) return null;
  return { min: Math.min(...present), max: Math.max(...present) };
}

export async function getCatalog() {
  return readCatalog();
}

export async function getSupplier(slug: string) {
  const catalog = await readCatalog();
  return catalog.find((supplier) => supplier.slug === slug) ?? null;
}

export async function getSuppliersBySlugs(slugs: string[]) {
  const catalog = await readCatalog();
  return slugs.flatMap((slug) => {
    const supplier = catalog.find((item) => item.slug === slug);
    return supplier ? [supplier] : [];
  });
}

export async function searchSuppliers(query: DiscoveryQuery) {
  const catalog = await readCatalog();
  const filtered = catalog.filter((supplier) => matches(supplier, query));
  const priceRange = range(filtered.map((supplier) => supplier.minPrice));
  const moqRange = range(filtered.map((supplier) => supplier.minMoq));
  const ranked = filtered.map((supplier) => ({
    supplier,
    score: scoreSupplier(supplier, query, priceRange, moqRange),
  }));

  ranked.sort((left, right) => {
    if (query.sort === "price") {
      return compareNullable(left.supplier.minPrice, right.supplier.minPrice) || byName(left.supplier, right.supplier);
    }
    if (query.sort === "moq") {
      return compareNullable(left.supplier.minMoq, right.supplier.minMoq) || byName(left.supplier, right.supplier);
    }
    if (query.sort === "relevance") {
      return right.score - left.score || byName(left.supplier, right.supplier);
    }
    return byName(left.supplier, right.supplier);
  });

  const pages = Math.max(1, Math.ceil(ranked.length / pageSize));
  const page = Math.min(query.page, pages);
  const start = (page - 1) * pageSize;

  return {
    items: ranked.slice(start, start + pageSize),
    total: ranked.length,
    page,
    pages,
    showScore: hasRankingContext(query) || query.sort === "relevance",
    facets: {
      categories: categoryFacets(catalog),
      cities: unique(catalog.map((supplier) => supplier.city)),
      regions: unique(catalog.map((supplier) => supplier.region)),
    },
  };
}

export async function getDashboard() {
  const catalog = await readCatalog();
  let savedCount = 0;
  let categoryCount = 0;

  try {
    [savedCount, categoryCount] = await Promise.all([
      getPrisma().shortlist.count({ where: { workspaceKey: demoWorkspaceKey } }),
      getPrisma().category.count(),
    ]);
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
  const regions = new Set(catalog.flatMap((supplier) => (supplier.region ? [supplier.region] : [])));
  const recent = [...catalog].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 5);

  return {
    supplierCount: catalog.length,
    categoryCount,
    regionCount: regions.size,
    savedCount,
    recent,
    popular: categoryFacets(catalog).slice(0, 6),
  };
}

export async function getCategories() {
  const catalog = await readCatalog();
  return categoryFacets(catalog);
}

export async function getWorkspace(): Promise<WorkspaceEntry[]> {
  try {
    const [shortlists, notes] = await Promise.all([
      getPrisma().shortlist.findMany({
        where: { workspaceKey: demoWorkspaceKey },
        orderBy: { updatedAt: "desc" },
      }),
      getPrisma().supplierNote.findMany({
        where: { workspaceKey: demoWorkspaceKey },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const notesBySupplier = new Map<string, WorkspaceNote[]>();

    for (const note of notes) {
      const list = notesBySupplier.get(note.supplierId) ?? [];
      list.push({
        id: note.id,
        supplierId: note.supplierId,
        content: note.content,
        updatedAt: note.updatedAt.toISOString(),
      });
      notesBySupplier.set(note.supplierId, list);
    }

    return shortlists.map((entry) => ({
      supplierId: entry.supplierId,
      contactStatus: entry.contactStatus,
      notes: notesBySupplier.get(entry.supplierId) ?? [],
    }));
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
}

export async function getSavedIds() {
  const workspace = await getWorkspace();
  return new Set(workspace.map((entry) => entry.supplierId));
}

function categoryFacets(catalog: CatalogSupplier[]) {
  const facets = new Map<string, { slug: string; nameRu: string; nameEn: string; count: number }>();

  for (const supplier of catalog) {
    const seen = new Set<string>();
    for (const product of supplier.products) {
      if (seen.has(product.categorySlug)) continue;
      seen.add(product.categorySlug);
      const current = facets.get(product.categorySlug) ?? {
        slug: product.categorySlug,
        nameRu: product.categoryNameRu,
        nameEn: product.categoryNameEn,
        count: 0,
      };
      current.count += 1;
      facets.set(product.categorySlug, current);
    }
  }

  return [...facets.values()].sort((left, right) => right.count - left.count || left.nameRu.localeCompare(right.nameRu, "ru"));
}

function unique(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((left, right) =>
    left.localeCompare(right, "ru"),
  );
}

function byName(left: CatalogSupplier, right: CatalogSupplier) {
  return left.name.localeCompare(right.name, "ru");
}

function compareNullable(left: number | null, right: number | null) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

export type { ContactStatus };
