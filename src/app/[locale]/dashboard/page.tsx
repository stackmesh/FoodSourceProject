import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ErrorState, PageIntro, PanelSkeleton } from "@/components/catalog/chrome";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatDate } from "@/lib/format";
import { DataError } from "@/server/catalog-types";
import { getDashboard } from "@/server/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <PageIntro title={t("title")} description={t("description")} />
      <Suspense fallback={<PanelSkeleton />}>
        <DashboardContent locale={locale} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ locale }: { locale: string }) {
  const t = await getTranslations("Dashboard");
  const data = await loadDashboard();

  if (!data) {
    return <ErrorState title={t("errorTitle")} text={t("errorText")} action={t("retry")} />;
  }

  const stats = [
      { label: t("suppliers"), value: data.supplierCount, hint: t("supplierHint") },
      { label: t("categories"), value: data.categoryCount, hint: t("categoryHint") },
      { label: t("regions"), value: data.regionCount, hint: t("regionHint") },
      { label: t("saved"), value: data.savedCount, hint: t("savedHint") },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <section key={stat.label} className="rounded-xl border bg-card p-4">
              <h2 className="text-sm text-muted-foreground">{stat.label}</h2>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{stat.hint}</p>
            </section>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("recent")}</h2>
            <ul className="mt-3 divide-y">
              {data.recent.map((supplier) => (
                <li key={supplier.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/suppliers/${supplier.slug}`} className="text-sm font-medium hover:text-primary">
                      {supplier.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[supplier.city, supplier.region].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={supplier.createdAt}>
                    {formatDate(supplier.createdAt, locale)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("popular")}</h2>
            <ul className="mt-3 space-y-2">
              {data.popular.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/suppliers?category=${category.slug}`}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    <span>{locale === "en" ? category.nameEn : category.nameRu}</span>
                    <span className="text-muted-foreground">{category.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    );
}

async function loadDashboard() {
  try {
    return await getDashboard();
  } catch (error) {
    if (!(error instanceof DataError)) throw error;
    return null;
  }
}
