import { SupplierBadges } from "@/components/catalog/badges";
import { CompareButton, FavoriteButton } from "@/components/catalog/supplier-actions";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatQuantity } from "@/lib/format";
import type { CatalogSupplier } from "@/server/catalog-types";
import { getTranslations } from "next-intl/server";

export async function SupplierCard({
  supplier,
  locale,
  saved,
  comparing,
  score,
  showScore,
  context,
}: {
  supplier: CatalogSupplier;
  locale: string;
  saved: boolean;
  comparing: boolean;
  score: number | null;
  showScore: boolean;
  context?: { query: string; category: string; city: string; region: string };
}) {
  const t = await getTranslations("Catalog");
  const categoryLabel = locale === "en" ? "categoryNameEn" : "categoryNameRu";
  const categories = [
    ...new Set(supplier.products.map((product) => product[categoryLabel])),
  ];
  const productNames = supplier.products.slice(0, 2).map((product) => product.name);
  const delivery = supplier.products.find((product) => product.deliveryNotes)?.deliveryNotes;
  const price =
    supplier.minPrice == null
      ? t("priceUnavailable")
      : t("priceFrom", {
          value: formatMoney(supplier.minPrice, locale, supplier.products[0]?.currency ?? "RUB"),
        });
  const moq =
    supplier.minMoq == null
      ? t("moqUnavailable")
      : t("moqFrom", {
          value: formatQuantity(
            supplier.minMoq,
            supplier.products.find((product) => product.moq === supplier.minMoq)?.unit ?? null,
            locale,
          ),
        });

  return (
    <article className="flex h-full flex-col rounded-xl border bg-card p-4">
      <SupplierBadges supplier={supplier} />
      <h2 className="mt-3 text-base font-semibold tracking-tight">
        <Link href={`/suppliers/${supplier.slug}`} className="hover:text-primary">
          {supplier.name}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {[supplier.city, supplier.region].filter(Boolean).join(", ")}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <li key={category} className="rounded-md bg-muted px-2 py-0.5 text-xs">
            {category}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-6">{productNames.join(" · ")}</p>
      <dl className="mt-3 grid gap-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("price")}</dt>
          <dd className="text-right font-medium">{price}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("moq")}</dt>
          <dd className="text-right font-medium">{moq}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("certifications")}</dt>
          <dd className="text-right">
            {supplier.certifications.length
              ? t("certCount", { count: supplier.certifications.length })
              : t("noCerts")}
          </dd>
        </div>
      </dl>
      {delivery ? (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{delivery}</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">{t("deliveryUnavailable")}</p>
      )}
      {showScore ? (
        <p className="mt-3 text-xs font-medium text-primary" title={t("scoreHint")}>
          {score == null ? t("scoreUnavailable") : t("score", { score })}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/suppliers/${supplier.slug}`}
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
        >
          {t("view")}
        </Link>
        <FavoriteButton supplierId={supplier.id} saved={saved} />
        <CompareButton slug={supplier.slug} active={comparing} context={context} />
      </div>
    </article>
  );
}
