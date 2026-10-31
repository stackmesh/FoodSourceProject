import { SupplierBadges } from "@/components/catalog/badges";
import { CompareButton, FavoriteButton } from "@/components/catalog/supplier-actions";
import {
  certificationSummary,
  moqLine,
  placeLine,
  priceLine,
} from "@/components/catalog/supplier-facts";
import { Link } from "@/i18n/navigation";
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
  const categories = [...new Set(supplier.products.map((product) => product[categoryLabel]))];
  const productNames = supplier.products.slice(0, 2).map((product) => product.name);
  const place = placeLine(supplier);
  const price = priceLine(supplier, locale, (value) => t("priceFrom", { value }));
  const moq = moqLine(supplier, locale, (value) => t("moqFrom", { value }));
  const certs = certificationSummary(supplier);
  const certText =
    certs.kind === "demo"
      ? t("demoCerts")
      : certs.kind === "verified"
        ? t("verifiedCerts", { count: certs.count })
        : certs.kind === "unverified"
          ? t("unverifiedCerts")
          : certs.kind === "expired"
            ? t("expiredCerts")
            : t("noCerts");
  const delivery = supplier.products.find((product) => product.deliveryNotes)?.deliveryNotes;

  return (
    <article className="flex h-full flex-col rounded-xl border bg-card p-4">
      <h2 className="text-base font-semibold tracking-tight">
        <Link href={`/suppliers/${supplier.slug}`} className="hover:text-primary">
          {supplier.name}
        </Link>
      </h2>
      <p className={`mt-1 text-sm ${place ? "text-foreground" : "text-muted-foreground"}`}>
        {place || t("unavailable")}
      </p>
      <div className="mt-2">
        <SupplierBadges supplier={supplier} />
      </div>
      {categories.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <li key={category} className="rounded-md bg-muted px-2 py-0.5 text-xs">
              {category}
            </li>
          ))}
        </ul>
      ) : null}
      {productNames.length ? <p className="mt-3 text-sm leading-6">{productNames.join(" · ")}</p> : null}
      <dl className="mt-3 grid gap-2 text-sm">
        <Fact label={t("price")} value={price.kind === "missing" ? t("priceUnavailable") : price.text} missing={price.kind === "missing"} />
        <Fact label={t("moq")} value={moq.kind === "missing" ? t("moqUnavailable") : moq.text} missing={moq.kind === "missing"} />
        <Fact label={t("certifications")} value={certText} missing={certs.kind === "none"} caution={certs.kind === "demo" || certs.kind === "unverified" || certs.kind === "expired"} />
      </dl>
      <div className="mt-3">
        {delivery ? (
          <>
            <p className="line-clamp-2 text-xs leading-5">{delivery}</p>
            <p className="mt-1 text-xs text-amber-950">{t("deliveryStated")}</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t("deliveryUnavailable")}</p>
        )}
      </div>
      {showScore ? (
        <p className="mt-3 text-xs text-muted-foreground" title={t("scoreHint")}>
          {score == null ? t("scoreUnavailable") : t("score", { score })}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
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

function Fact({
  label,
  value,
  missing,
  caution = false,
}: {
  label: string;
  value: string;
  missing: boolean;
  caution?: boolean;
}) {
  const valueClass = missing ? "text-muted-foreground" : caution ? "text-amber-950" : "font-medium";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${valueClass}`}>{value}</dd>
    </div>
  );
}
