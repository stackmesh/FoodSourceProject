import { CertificateStatus } from "@/components/catalog/badges";
import { SupplierLogo } from "@/components/catalog/catalog-media";
import { FreshnessIndicator } from "@/components/catalog/freshness-indicator";
import { MatchScore } from "@/components/catalog/match-score";
import { CompareButton, FavoriteButton } from "@/components/catalog/supplier-actions";
import { ContactStatusForm } from "@/components/catalog/workspace-forms";
import { moqLine, placeLine, priceLine } from "@/components/catalog/supplier-facts";
import { supplierCertificateMark } from "@/lib/certificate-mark";
import { Link } from "@/i18n/navigation";
import type { CatalogSupplier, WorkspaceEntry } from "@/server/catalog-types";
import type { MatchReport } from "@/server/matching";
import { getTranslations } from "next-intl/server";
import {
  Apple,
  Award,
  Beef,
  Building2,
  Coins,
  CupSoda,
  Factory,
  FileText,
  Fish,
  Info,
  Leaf,
  MapPin,
  Milk,
  Package,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Ship,
  Sprout,
  Store,
  Truck,
  Warehouse,
  Wheat,
  Snowflake,
  type LucideIcon,
} from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = {
  meat: Beef,
  fish: Fish,
  produce: Leaf,
  dairy: Milk,
  grocery: Wheat,
  frozen: Snowflake,
  drinks: CupSoda,
  packaging: Package,
};

const typeIcons: Record<CatalogSupplier["supplierType"], LucideIcon> = {
  MANUFACTURER: Factory,
  DISTRIBUTOR: Store,
  FARM: Sprout,
  IMPORTER: Ship,
  PACKAGING: Package,
  WHOLESALER: Warehouse,
  OTHER: Building2,
};

export async function SupplierCard({
  supplier,
  locale,
  saved,
  comparing,
  showScore,
  report,
  context,
  profileHref,
  tracking,
  today,
  observedAt,
  timeZone,
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
  tracking: WorkspaceEntry | null;
  today: string;
  observedAt: string;
  timeZone: string;
}) {
  const t = await getTranslations("Catalog");
  const categories = [
    ...new Map(
      supplier.products.map((product) => [
        product.categorySlug,
        locale === "en" ? product.categoryNameEn : product.categoryNameRu,
      ]),
    ),
  ];
  const place = placeLine(supplier);
  const price = priceLine(supplier, locale, (value) => t("priceFrom", { value }));
  const moq = moqLine(supplier, locale, (value) => t("moqFrom", { value }));
  const certificate = supplierCertificateMark(supplier);
  const delivery = supplier.products.find((product) => product.deliveryNotes)?.deliveryNotes;
  const TypeIcon = typeIcons[supplier.supplierType];
  const verificationTone =
    supplier.verificationStatus === "EXPIRED"
      ? "border-amber-200 text-amber-800"
      : supplier.verificationStatus === "UNVERIFIED"
        ? "border-border text-muted-foreground"
        : "border-primary/30 text-primary";

  return (
    <article className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <SupplierLogo
          supplier={supplier}
          size={48}
          demoAlt={t("logoAlt", { name: supplier.name })}
          realAlt={t("logoAltReal", { name: supplier.name })}
          missingAlt={t("logoMissing", { name: supplier.name })}
        />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight">
            <Link href={profileHref} className="truncate hover:text-primary">
              {supplier.name}
            </Link>
            <NameShield status={supplier.verificationStatus} />
          </h2>
          <FavoriteButton supplierId={supplier.id} saved={saved} appearance="icon" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground md:col-start-1 md:row-start-1">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="truncate">{place || t("unavailable")}</span>
        </p>
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          <ContactStatusForm
            supplierId={supplier.id}
            status={tracking?.contactStatus ?? "NOT_CONTACTED"}
            appearance="card"
            followUpOn={tracking?.nextFollowUpOn ?? null}
            lastContactOn={tracking?.lastContactOn ?? null}
            contactPerson={tracking?.contactPerson ?? null}
            today={today}
            locale={locale}
          />
        </div>
        <div className="flex flex-wrap gap-2 md:col-start-1 md:row-start-2">
          {supplier.dataType === "DEMO" ? (
            <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
              {t("demo")}
            </span>
          ) : null}
          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${verificationTone}`}>
            <NameShield status={supplier.verificationStatus} compact />
            {t(`verification.${supplier.verificationStatus}`)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs text-muted-foreground">
            <TypeIcon className="size-3.5" />
            {t(`types.${supplier.supplierType}`)}
          </span>
          {categories.map(([slug, name]) => {
            const Icon = categoryIcons[slug] ?? Apple;
            return (
              <span key={slug} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary">
                <Icon className="size-3.5" />
                {name}
              </span>
            );
          })}
        </div>
      </div>

      <dl className="mt-4 overflow-hidden rounded-lg border text-sm">
        <Fact
          icon={Coins}
          label={t("price")}
          value={price.kind === "missing" ? t("priceUnavailable") : price.text}
          missing={price.kind === "missing"}
        />
        <Fact
          icon={Package}
          label={t("moq")}
          value={moq.kind === "missing" ? t("moqUnavailable") : moq.text}
          missing={moq.kind === "missing"}
        />
        <div className="flex items-center justify-between gap-3 border-t px-3 py-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <span className="grid size-7 place-items-center rounded-md border">
              <Award className="size-3.5" />
            </span>
            {t("certifications")}
          </dt>
          <dd>
            <CertificateStatus mark={certificate} />
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {delivery ? (
          <>
            <div className="flex gap-2 rounded-lg bg-primary/5 px-3 py-3 text-sm leading-6">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{delivery}</p>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3.5" />
              {t("deliveryStated")}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t("deliveryUnavailable")}</p>
        )}
      </div>
      <FreshnessIndicator
        supplier={supplier}
        locale={locale}
        observedAt={observedAt}
        timeZone={timeZone}
        variant="card"
      />
      {showScore ? (
        <div className="mt-4" title={t("scoreHint")}>
          <MatchScore report={report} />
        </div>
      ) : null}
      <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
        <Link
          href={profileHref}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-accent"
        >
          <FileText className="size-4" />
          {t("view")}
        </Link>
        <FavoriteButton supplierId={supplier.id} saved={saved} appearance="labeled" className="h-10 rounded-lg" />
        <CompareButton slug={supplier.slug} active={comparing} context={context} className="h-10 w-full rounded-lg" showIcon />
      </div>
    </article>
  );
}

function NameShield({
  status,
  compact = false,
}: {
  status: CatalogSupplier["verificationStatus"];
  compact?: boolean;
}) {
  const size = compact ? "size-3.5 shrink-0" : "size-5 shrink-0";
  if (status === "VERIFIED" || status === "PARTIALLY_VERIFIED") {
    return <ShieldCheck className={`${size} text-primary`} aria-hidden />;
  }
  if (status === "EXPIRED") {
    return <ShieldAlert className={`${size} text-amber-600`} aria-hidden />;
  }
  return <ShieldQuestion className={`${size} text-muted-foreground`} aria-hidden />;
}

function Fact({
  icon: Icon,
  label,
  value,
  missing,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  missing: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t px-3 py-3 first:border-t-0">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-md border">
          <Icon className="size-3.5" />
        </span>
        {label}
      </dt>
      <dd className={missing ? "text-muted-foreground" : "font-medium"}>{value}</dd>
    </div>
  );
}
