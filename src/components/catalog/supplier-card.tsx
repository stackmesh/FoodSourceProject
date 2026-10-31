import { CertificateStatus, SupplierBadges } from "@/components/catalog/badges";
import { MatchScore } from "@/components/catalog/match-score";
import { CompareButton, FavoriteButton } from "@/components/catalog/supplier-actions";
import { moqLine, placeLine, priceLine } from "@/components/catalog/supplier-facts";
import { supplierCertificateMark } from "@/lib/certificate-mark";
import { Link } from "@/i18n/navigation";
import type { CatalogSupplier } from "@/server/catalog-types";
import type { MatchReport } from "@/server/matching";
import { getTranslations } from "next-intl/server";
import { Award, Coins, FileText, MapPin, Package, Truck, type LucideIcon } from "lucide-react";

export async function SupplierCard({
  supplier,
  locale,
  saved,
  comparing,
  showScore,
  report,
  context,
  profileHref,
}: {
  supplier: CatalogSupplier;
  locale: string;
  saved: boolean;
  comparing: boolean;
  showScore: boolean;
  report: MatchReport | null;
  context?: {
    query: string;
    category: string;
    city: string;
    region: string;
    maxPrice?: string;
    maxMoq?: string;
    certified?: boolean;
  };
  profileHref: string;
}) {
  const t = await getTranslations("Catalog");
  const categoryLabel = locale === "en" ? "categoryNameEn" : "categoryNameRu";
  const categories = [...new Set(supplier.products.map((product) => product[categoryLabel]))];
  const place = placeLine(supplier);
  const price = priceLine(supplier, locale, (value) => t("priceFrom", { value }));
  const moq = moqLine(supplier, locale, (value) => t("moqFrom", { value }));
  const certificate = supplierCertificateMark(supplier);
  const delivery = supplier.products.find((product) => product.deliveryNotes)?.deliveryNotes;

  return (
    <article className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">
            <Link href={profileHref} className="hover:text-primary">
              {supplier.name}
            </Link>
          </h2>
          <p className={`mt-1 flex items-center gap-1 text-sm ${place ? "text-muted-foreground" : "text-muted-foreground"}`}>
            <MapPin className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{place || t("unavailable")}</span>
          </p>
        </div>
        <FavoriteButton supplierId={supplier.id} saved={saved} appearance="icon" />
      </div>
      <div className="mt-3">
        <SupplierBadges supplier={supplier} />
      </div>
      {categories.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <li key={category} className="rounded-md border border-primary/15 bg-primary/5 px-2 py-0.5 text-xs text-primary">
              {category}
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="mt-3 grid gap-2 text-sm">
        <Fact icon={Coins} label={t("price")} value={price.kind === "missing" ? t("priceUnavailable") : price.text} missing={price.kind === "missing"} />
        <Fact icon={Package} label={t("moq")} value={moq.kind === "missing" ? t("moqUnavailable") : moq.text} missing={moq.kind === "missing"} />
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <Award className="size-3.5 shrink-0" />
            {t("certifications")}
          </dt>
          <dd>
            <CertificateStatus mark={certificate} />
          </dd>
        </div>
      </dl>
      <div className="mt-3">
        {delivery ? (
          <>
            <div className="flex gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs leading-5">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{delivery}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("deliveryStated")}</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t("deliveryUnavailable")}</p>
        )}
      </div>
      {showScore ? (
        <div className="mt-3" title={t("scoreHint")}>
          <MatchScore report={report} />
        </div>
      ) : null}
      <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
        <Link
          href={profileHref}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-medium hover:bg-accent"
        >
          <FileText className="size-4" />
          {t("view")}
        </Link>
        <FavoriteButton supplierId={supplier.id} saved={saved} appearance="labeled" />
        <CompareButton slug={supplier.slug} active={comparing} context={context} className="w-full" showIcon />
      </div>
    </article>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  missing,
  caution = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  missing: boolean;
  caution?: boolean;
}) {
  const valueClass = missing ? "text-muted-foreground" : caution ? "font-medium text-red-700" : "font-medium";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </dt>
      <dd className={`text-right ${valueClass}`}>{value}</dd>
    </div>
  );
}
