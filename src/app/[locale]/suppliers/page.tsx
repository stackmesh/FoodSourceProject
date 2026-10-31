import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { CardSkeletonGrid, EmptyState, ErrorState, PageIntro } from "@/components/catalog/chrome";
import { DiscoveryFilters } from "@/components/catalog/discovery-filters";
import { SupplierCard } from "@/components/catalog/supplier-card";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { compareCookieName, parseCompareSlugs } from "@/lib/comparison";
import { parseDiscoveryQuery, toSearchParams } from "@/lib/discovery-query";
import { getSavedIds, searchSuppliers } from "@/server/catalog";
import { DataError } from "@/server/catalog-types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Discovery" });
  return { title: t("title") };
}

export default async function SuppliersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Discovery");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <PageIntro title={t("title")} description={t("description")} />
      <Suspense fallback={<CardSkeletonGrid />}>
        <DiscoveryResults locale={locale} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DiscoveryResults({
  locale,
  searchParams,
}: {
  locale: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("Discovery");
  const query = parseDiscoveryQuery(await searchParams);
  const loaded = await loadDiscovery(query);

  if (!loaded) {
    return <ErrorState title={t("errorTitle")} text={t("errorText")} action={t("retry")} />;
  }

  const { result, savedIds, comparing } = loaded;

  return (
      <div className="space-y-4">
        <DiscoveryFilters
          query={{ ...query, page: result.page }}
          categories={result.facets.categories}
          cities={result.facets.cities}
          regions={result.facets.regions}
        />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm text-muted-foreground">{t("results", { count: result.total })}</p>
          {result.showScore ? (
            <p className="max-w-xl text-xs leading-5 text-muted-foreground">{t("scoreNote")}</p>
          ) : null}
        </div>
        {result.items.length === 0 ? (
          <EmptyState
            title={t("emptyTitle")}
            text={t("emptyText")}
            href="/suppliers"
            action={t("clear")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {result.items.map(({ supplier, score }) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                locale={locale}
                saved={savedIds.has(supplier.id)}
                comparing={comparing.has(supplier.slug)}
                score={score}
                showScore={result.showScore}
                context={{
                  query: query.q,
                  category: query.category,
                  city: query.city,
                  region: query.region,
                }}
              />
            ))}
          </div>
        )}
        <Pagination page={result.page} pages={result.pages} query={query} />
      </div>
    );
}

async function loadDiscovery(query: ReturnType<typeof parseDiscoveryQuery>) {
  try {
    const [result, savedIds, jar] = await Promise.all([
      searchSuppliers(query),
      getSavedIds(),
      cookies(),
    ]);

    return {
      result,
      savedIds,
      comparing: new Set(parseCompareSlugs(jar.get(compareCookieName)?.value)),
    };
  } catch (error) {
    if (!(error instanceof DataError)) throw error;
    return null;
  }
}

function Pagination({
  page,
  pages,
  query,
}: {
  page: number;
  pages: number;
  query: ReturnType<typeof parseDiscoveryQuery>;
}) {
  if (pages <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
      {page > 1 ? (
        <Link href={`/suppliers?${toSearchParams(query, page - 1).toString()}`} className="rounded-md border bg-card px-3 py-2">
          ←
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={`/suppliers?${toSearchParams(query, page + 1).toString()}`} className="rounded-md border bg-card px-3 py-2">
          →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
