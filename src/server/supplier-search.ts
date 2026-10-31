import { Prisma } from "@/generated/prisma/client";
import { foldSearchText, type DiscoveryQuery } from "@/lib/discovery-query";
import { getPrisma } from "@/lib/prisma";

export const discoveryPageSize = 9;

const folded = {
  name: Prisma.raw(`translate(lower(s."name"), 'ё', 'е')`),
  city: Prisma.raw(`translate(lower(s."city"), 'ё', 'е')`),
  region: Prisma.raw(`translate(lower(s."region"), 'ё', 'е')`),
  product: Prisma.raw(`translate(lower(p."name"), 'ё', 'е')`),
  categoryRu: Prisma.raw(`translate(lower(c."nameRu"), 'ё', 'е')`),
  categoryEn: Prisma.raw(`translate(lower(c."nameEn"), 'ё', 'е')`),
};

function whereSql(query: DiscoveryQuery, like: string) {
  const filters = [Prisma.sql`s."isActive" = true`];

  if (like !== "%%") {
    filters.push(Prisma.sql`(
      ${folded.name} LIKE ${like}
      OR ${folded.city} LIKE ${like}
      OR ${folded.region} LIKE ${like}
      OR EXISTS (
        SELECT 1
        FROM "SupplierProduct" p
        JOIN "Category" c ON c."id" = p."categoryId"
        WHERE p."supplierId" = s."id"
          AND (
            ${folded.product} LIKE ${like}
            OR ${folded.categoryRu} LIKE ${like}
            OR ${folded.categoryEn} LIKE ${like}
          )
      )
    )`);
  }

  if (query.category) {
    filters.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM "SupplierProduct" p
      JOIN "Category" c ON c."id" = p."categoryId"
      WHERE p."supplierId" = s."id" AND c."slug" = ${query.category}
    )`);
  }

  if (query.city) filters.push(Prisma.sql`s."city" = ${query.city}`);
  if (query.region) filters.push(Prisma.sql`s."region" = ${query.region}`);
  if (query.type) filters.push(Prisma.sql`s."supplierType"::text = ${query.type}`);

  if (query.certified) {
    filters.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Certification" cert WHERE cert."supplierId" = s."id"
    )`);
  }

  if (query.maxPrice != null) {
    filters.push(Prisma.sql`(
      SELECT MIN(p."estimatedPrice")
      FROM "SupplierProduct" p
      WHERE p."supplierId" = s."id"
    ) <= ${query.maxPrice}`);
  }

  if (query.maxMoq != null) {
    filters.push(Prisma.sql`(
      SELECT MIN(p."minimumOrderQuantity")
      FROM "SupplierProduct" p
      WHERE p."supplierId" = s."id"
    ) <= ${query.maxMoq}`);
  }

  return Prisma.join(filters, " AND ");
}

const filteredFrom = Prisma.sql`
  FROM "Supplier" s
  CROSS JOIN LATERAL (
    SELECT
      MIN(p."estimatedPrice") AS min_price,
      MIN(p."minimumOrderQuantity") AS min_moq
    FROM "SupplierProduct" p
    WHERE p."supplierId" = s."id"
  ) stats
`;

export async function querySupplierPage(query: DiscoveryQuery) {
  const foldedQuery = foldSearchText(query.q);
  const like = `%${foldedQuery}%`;
  const where = whereSql(query, like);
  const prisma = getPrisma();

  const [summary] = await prisma.$queryRaw<
    Array<{
      total: number;
      price_min: string | null;
      price_max: string | null;
      moq_min: string | null;
      moq_max: string | null;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*)::int AS total,
      MIN(stats.min_price)::text AS price_min,
      MAX(stats.min_price)::text AS price_max,
      MIN(stats.min_moq)::text AS moq_min,
      MAX(stats.min_moq)::text AS moq_max
    ${filteredFrom}
    WHERE ${where}
  `);

  const total = summary?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / discoveryPageSize));
  const page = Math.min(query.page, pages);
  const offset = (page - 1) * discoveryPageSize;

  const rows = total
    ? await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT s."id"
        ${filteredFrom}
        WHERE ${where}
        ORDER BY
          CASE WHEN ${query.sort} = 'price' THEN stats.min_price END ASC NULLS LAST,
          CASE WHEN ${query.sort} = 'moq' THEN stats.min_moq END ASC NULLS LAST,
          CASE
            WHEN ${query.sort} = 'relevance' AND ${foldedQuery} <> '' AND ${folded.name} LIKE ${like} THEN 0
            WHEN ${query.sort} = 'relevance' AND ${foldedQuery} <> '' THEN 1
            ELSE 2
          END,
          s."name" ASC
        LIMIT ${discoveryPageSize} OFFSET ${offset}
      `)
    : [];

  return {
    ids: rows.map((row) => row.id),
    total,
    page,
    pages,
    priceRange: range(summary?.price_min, summary?.price_max),
    moqRange: range(summary?.moq_min, summary?.moq_max),
  };
}

function range(min: string | null | undefined, max: string | null | undefined) {
  if (min == null || max == null) return null;
  const low = Number(min);
  const high = Number(max);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return { min: low, max: high };
}
