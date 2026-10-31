import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorState, PanelSkeleton } from "@/components/catalog/chrome";
import { SupplierProfile } from "@/components/catalog/supplier-profile";
import { assertLocale } from "@/i18n/locale";
import { compareCookieName, parseCompareSlugs } from "@/lib/comparison";
import { getSupplier, getWorkspace } from "@/server/catalog";
import { DataError } from "@/server/catalog-types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale: assertLocale(locale),
    namespace: "Profile",
  });
  return { title: t("title") };
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8"><PanelSkeleton /></div>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = assertLocale(localeParam);
  setRequestLocale(locale);
  const t = await getTranslations("Profile");
  const loaded = await loadDetail(slug);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ErrorState title={t("errorTitle")} text={t("errorText")} action={t("retry")} />
      </div>
    );
  }

  const supplier = loaded.supplier;

  if (!supplier) {
    notFound();
  }

  const entry = loaded.workspace.find((item) => item.supplierId === supplier.id) ?? null;

  return (
    <SupplierProfile
      supplier={supplier}
      locale={locale}
      saved={entry != null}
      comparing={loaded.comparing}
      workspace={entry}
    />
  );
}

async function loadDetail(slug: string) {
  try {
    const [supplier, workspace, jar] = await Promise.all([
      getSupplier(slug),
      getWorkspace(),
      cookies(),
    ]);

    return {
      supplier,
      workspace,
      comparing: supplier
        ? parseCompareSlugs(jar.get(compareCookieName)?.value).includes(supplier.slug)
        : false,
    };
  } catch (error) {
    if (!(error instanceof DataError)) throw error;
    return null;
  }
}
