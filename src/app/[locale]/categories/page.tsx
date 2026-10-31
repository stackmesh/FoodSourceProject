import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ErrorState, PageIntro, PanelSkeleton } from "@/components/catalog/chrome";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { getCategories } from "@/server/catalog";
import { DataError } from "@/server/catalog-types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "CategoriesPage" });
  return { title: t("title") };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("CategoriesPage");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <PageIntro title={t("title")} description={t("description")} />
      <Suspense fallback={<PanelSkeleton />}>
        <CategoryGrid locale={locale} />
      </Suspense>
    </div>
  );
}

async function CategoryGrid({ locale }: { locale: string }) {
  const t = await getTranslations("CategoriesPage");
  const categories = await loadCategories();

  if (!categories) {
    return <ErrorState title={t("errorTitle")} text={t("errorText")} action={t("retry")} />;
  }

  if (!categories.length) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={`/suppliers?category=${category.slug}`}
            className="block rounded-xl border bg-card p-4 hover:border-primary/40"
          >
            <p className="font-medium">{locale === "en" ? category.nameEn : category.nameRu}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("count", { count: category.count })}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function loadCategories() {
  try {
    return await getCategories();
  } catch (error) {
    if (!(error instanceof DataError)) throw error;
    return null;
  }
}
