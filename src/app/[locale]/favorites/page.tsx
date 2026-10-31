import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { EmptyState, ErrorState, PageIntro, PanelSkeleton } from "@/components/catalog/chrome";
import { SupplierBadges } from "@/components/catalog/badges";
import { FavoriteButton } from "@/components/catalog/supplier-actions";
import {
  ContactStatusForm,
  DeleteNoteButton,
  NoteEditor,
} from "@/components/catalog/workspace-forms";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatMoney } from "@/lib/format";
import { getCatalog, getWorkspace } from "@/server/catalog";
import { DataError } from "@/server/catalog-types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Favorites" });
  return { title: t("title") };
}

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Favorites");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <PageIntro title={t("title")} description={t("description")} />
      <Suspense fallback={<PanelSkeleton />}>
        <FavoriteList locale={locale} />
      </Suspense>
    </div>
  );
}

async function FavoriteList({ locale }: { locale: string }) {
  const t = await getTranslations("Favorites");
  const catalog = await getTranslations("Catalog");
  const saved = await loadFavorites();

  if (!saved) {
    return <ErrorState title={t("errorTitle")} text={t("errorText")} action={t("retry")} />;
  }

  if (!saved.length) {
      return (
        <EmptyState
          title={t("emptyTitle")}
          text={t("emptyText")}
          href="/suppliers"
          action={t("emptyAction")}
        />
      );
    }

    return (
      <ul className="space-y-4">
        {saved.map(({ supplier, entry }) => (
          <li key={supplier.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SupplierBadges supplier={supplier} />
                <h2 className="mt-3 text-base font-semibold">
                  <Link href={`/suppliers/${supplier.slug}`} className="hover:text-primary">
                    {supplier.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[supplier.city, supplier.region].filter(Boolean).join(", ")}
                  {supplier.minPrice == null
                    ? ""
                    : ` · ${catalog("priceFrom", { value: formatMoney(supplier.minPrice, locale) })}`}
                </p>
              </div>
              <FavoriteButton supplierId={supplier.id} saved />
            </div>
            <div className="mt-4 space-y-4 border-t pt-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">{t("status")}</h3>
                <ContactStatusForm supplierId={supplier.id} status={entry.contactStatus} />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-medium">{t("notes")}</h3>
                {entry.notes.map((note) => (
                  <div key={note.id}>
                    <NoteEditor supplierId={supplier.id} note={note} />
                    <DeleteNoteButton noteId={note.id} />
                  </div>
                ))}
                <NoteEditor supplierId={supplier.id} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
}

async function loadFavorites() {
  try {
    const [suppliers, workspace] = await Promise.all([getCatalog(), getWorkspace()]);
    return workspace.flatMap((entry) => {
      const supplier = suppliers.find((item) => item.id === entry.supplierId);
      return supplier ? [{ supplier, entry }] : [];
    });
  } catch (error) {
    if (!(error instanceof DataError)) throw error;
    return null;
  }
}
