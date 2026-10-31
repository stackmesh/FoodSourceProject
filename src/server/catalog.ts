import { demoWorkspaceKey } from "@/config/site";
import type { ContactStatus } from "@/generated/prisma/client";
import {
  hasRankingContext,
  type DiscoveryQuery,
} from "@/lib/discovery-query";
import { getPrisma } from "@/lib/prisma";
import { matchSuppliers } from "@/server/matching";
import { queryMatchCohort, querySupplierPage } from "@/server/supplier-search";
import {
  DataError,
  type CatalogSupplier,
  type WorkspaceEntry,
  type WorkspaceNote,
} from "@/server/catalog-types";

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

export async function getCatalog() {
  return readCatalog();
}

export async function getSupplier(slug: string) {
  try {
    const row = await getPrisma().supplier.findFirst({
      where: { slug, isActive: true },
      include: supplierInclude,
    });
    return row ? mapSupplier(row as Parameters<typeof mapSupplier>[0]) : null;
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
}

export async function getSuppliersBySlugs(slugs: string[]) {
  if (!slugs.length) return [];

  try {
    const rows = await getPrisma().supplier.findMany({
      where: { slug: { in: slugs }, isActive: true },
      include: supplierInclude,
    });
    const bySlug = new Map(rows.map((row) => [row.slug, mapSupplier(row as Parameters<typeof mapSupplier>[0])]));
    return slugs.flatMap((slug) => {
      const supplier = bySlug.get(slug);
      return supplier ? [supplier] : [];
    });
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
}

export async function searchSuppliers(query: DiscoveryQuery) {
  try {
    const [page, cohort] = await Promise.all([querySupplierPage(query), queryMatchCohort(query)]);
    const rows = page.ids.length
      ? await getPrisma().supplier.findMany({
          where: { id: { in: page.ids } },
          include: supplierInclude,
        })
      : [];
    const byId = new Map(
      rows.map((row) => [row.id, mapSupplier(row as Parameters<typeof mapSupplier>[0])]),
    );
    const suppliers = page.ids.flatMap((id) => {
      const supplier = byId.get(id);
      return supplier ? [supplier] : [];
    });
    const scores = new Map(
      matchSuppliers(suppliers, {
        query: query.q,
        category: query.category,
        city: query.city,
        region: query.region,
      }, cohort).map((report) => [report.supplierId, report.score]),
    );
    const facets = await loadFacets();

    return {
      items: suppliers.map((supplier) => ({
        supplier,
        score: scores.get(supplier.id) ?? null,
      })),
      total: page.total,
      page: page.page,
      pages: page.pages,
      showScore: hasRankingContext(query) || query.sort === "relevance",
      facets,
    };
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
}

export async function getDashboard() {
  try {
    const prisma = getPrisma();
    const [supplierCount, categoryCount, savedCount, regions, recentRows, popular] = await Promise.all([
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.shortlist.count({ where: { workspaceKey: demoWorkspaceKey } }),
      prisma.supplier.findMany({
        where: { isActive: true, region: { not: null } },
        distinct: ["region"],
        select: { region: true },
      }),
      prisma.supplier.findMany({
        where: { isActive: true },
        include: supplierInclude,
        orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        take: 5,
      }),
      categoryCounts(),
    ]);

    return {
      supplierCount,
      categoryCount,
      regionCount: regions.length,
      savedCount,
      recent: recentRows.map((row) => mapSupplier(row as Parameters<typeof mapSupplier>[0])),
      popular,
    };
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
}

export async function getCategories() {
  try {
    return await categoryCounts();
  } catch (error) {
    console.error(error);
    throw new DataError();
  }
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

async function loadFacets() {
  const prisma = getPrisma();
  const [categories, cities, regions] = await Promise.all([
    categoryCounts(),
    prisma.supplier.findMany({
      where: { isActive: true, city: { not: null } },
      distinct: ["city"],
      select: { city: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true, region: { not: null } },
      distinct: ["region"],
      select: { region: true },
    }),
  ]);

  return {
    categories,
    cities: cities
      .flatMap((row) => (row.city ? [row.city] : []))
      .sort((left, right) => left.localeCompare(right, "ru")),
    regions: regions
      .flatMap((row) => (row.region ? [row.region] : []))
      .sort((left, right) => left.localeCompare(right, "ru")),
  };
}

async function categoryCounts(limit?: number) {
  const rows = await getPrisma().$queryRaw<
    Array<{ slug: string; nameRu: string; nameEn: string; count: number }>
  >`
    SELECT c."slug", c."nameRu", c."nameEn", COUNT(DISTINCT p."supplierId")::int AS count
    FROM "Category" c
    JOIN "SupplierProduct" p ON p."categoryId" = c."id"
    JOIN "Supplier" s ON s."id" = p."supplierId" AND s."isActive" = true
    GROUP BY c."id", c."slug", c."nameRu", c."nameEn"
    ORDER BY count DESC, c."nameRu" ASC
  `;

  return limit ? rows.slice(0, limit) : rows;
}

export type { ContactStatus };
