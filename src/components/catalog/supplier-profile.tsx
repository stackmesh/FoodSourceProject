import { CertificationBadge, SupplierBadges } from "@/components/catalog/badges";
import { MatchScore } from "@/components/catalog/match-score";
import { CompareButton, FavoriteButton } from "@/components/catalog/supplier-actions";
import { moqLine, placeLine, priceLine } from "@/components/catalog/supplier-facts";
import { SourceMenu } from "@/components/catalog/source-menu";
import {
  ContactStatusForm,
  NoteEditor,
} from "@/components/catalog/workspace-forms";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import type { CatalogContact, CatalogSupplier, WorkspaceEntry } from "@/server/catalog-types";
import type { MatchReport } from "@/server/matching";
import { getTranslations } from "next-intl/server";
import {
  Apple,
  Beef,
  Building2,
  ChevronLeft,
  Coins,
  CupSoda,
  ExternalLink,
  FileText,
  Fish,
  MapPin,
  Milk,
  Package,
  Phone,
  Shield,
  Snowflake,
  Star,
  Tag,
  TriangleAlert,
  Truck,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export async function SupplierProfile({
  supplier,
  locale,
  saved,
  comparing,
  workspace,
  report,
  listHref,
  matchContext,
  scoreBasis,
}: {
  supplier: CatalogSupplier;
  locale: string;
  saved: boolean;
  comparing: boolean;
  workspace: WorkspaceEntry | null;
  report: MatchReport | null;
  listHref: string;
  scoreBasis: "search" | "catalog";
  matchContext?: {
    query: string;
    category: string;
    city: string;
    region: string;
    maxPrice?: string;
    maxMoq?: string;
    certified?: boolean;
  };
}) {
  const t = await getTranslations("Profile");
  const catalog = await getTranslations("Catalog");
  const categoryKey = locale === "en" ? "categoryNameEn" : "categoryNameRu";
  const deliveryNotes = [
    ...new Set(supplier.products.flatMap((product) => (product.deliveryNotes ? [product.deliveryNotes] : []))),
  ];
  const place = [placeLine(supplier), supplier.country].filter(Boolean).join(", ");
  const price = priceLine(supplier, locale, (value) => catalog("priceFrom", { value }));
  const moq = moqLine(supplier, locale, (value) => catalog("moqFrom", { value }));
  const categories = [...new Set(supplier.products.map((product) => product[categoryKey]))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <Link href={listHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {t("back")}
      </Link>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{supplier.name}</h1>
            <FavoriteButton supplierId={supplier.id} saved={saved} appearance="icon" />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-primary" />
            <span>{place || catalog("unavailable")}</span>
          </p>
          <div className="mt-3">
            <SupplierBadges supplier={supplier} variant="profile" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <FavoriteButton supplierId={supplier.id} saved={saved} appearance="bookmark" />
          <CompareButton slug={supplier.slug} active={comparing} showIcon context={matchContext} />
          {supplier.website ? (
            <a
              href={supplier.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium hover:bg-accent"
            >
              {t("website")}
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <span className="inline-flex h-8 items-center rounded-md border px-3 text-sm text-muted-foreground">
              {t("website")}
            </span>
          )}
          <SourceMenu
            label={t("source")}
            sources={supplier.sources.map((source) => ({
              id: source.id,
              url: source.url,
              title: source.title,
            }))}
          />
        </div>
      </div>
      {supplier.description ? (
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{supplier.description}</p>
      ) : null}

      <dl className="mt-4 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x">
        <Metric
          icon={Coins}
          label={catalog("price")}
          caption={t("priceRange")}
          value={price.kind === "missing" ? catalog("priceUnavailable") : price.text}
          missing={price.kind === "missing"}
        />
        <Metric
          icon={Package}
          label={catalog("moq")}
          caption={t("minimumOrder")}
          value={moq.kind === "missing" ? catalog("moqUnavailable") : moq.text}
          missing={moq.kind === "missing"}
        />
        <div className="flex gap-3 lg:px-4">
          <Shield className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{catalog("certifications")}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {supplier.certifications.length ? (
                supplier.certifications.map((item) => <CertificationBadge key={item.id} status={item.status} />)
              ) : (
                <span className="text-sm text-muted-foreground">{catalog("noCerts")}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("certCheck")}</p>
          </div>
        </div>
        <Metric
          icon={Truck}
          label={t("delivery")}
          caption={t("deliveryPromise")}
          value={deliveryNotes.length ? t("deliveryUnconfirmed") : catalog("deliveryUnavailable")}
          missing={!deliveryNotes.length}
          caution={deliveryNotes.length > 0}
        />
      </dl>

      <div className="mt-4">
        <MatchScore report={report} basis={scoreBasis} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Tag className="size-4 text-muted-foreground" />
                {t("products")}
              </h2>
              {categories.length ? (
                <ul className="flex flex-wrap justify-end gap-1.5">
                  {categories.map((category) => (
                    <li key={category} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {category}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {supplier.products.length ? (
              <ul className="mt-2 divide-y">
                {supplier.products.map((product) => {
                  const thumb = categoryThumb(product.categorySlug);
                  const ThumbIcon = thumb.icon;
                  return (
                    <li key={product.id} className="flex gap-3 py-4">
                      <span className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${thumb.tone}`}>
                        <ThumbIcon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{product.name}</p>
                          <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                            {product[categoryKey]}
                          </span>
                        </div>
                        <dl className="mt-2 grid gap-2 sm:grid-cols-3">
                          <ProductFact
                            label={catalog("price")}
                            value={
                              product.price == null
                                ? catalog("priceUnavailable")
                                : `${formatMoney(product.price, locale, product.currency)}${product.unit ? ` / ${product.unit}` : ""}`
                            }
                            missing={product.price == null}
                          />
                          <ProductFact
                            label={catalog("moq")}
                            value={
                              product.moq == null
                                ? catalog("moqUnavailable")
                                : formatQuantity(product.moq, product.unit, locale)
                            }
                            missing={product.moq == null}
                          />
                          <ProductFact
                            label={t("updated")}
                            value={
                              product.price != null && product.priceUpdatedAt
                                ? formatDate(product.priceUpdatedAt, locale)
                                : catalog("unavailable")
                            }
                            missing={product.price == null || !product.priceUpdatedAt}
                          />
                        </dl>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("unavailable")}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Truck className="size-4 text-muted-foreground" />
              {t("delivery")}
            </h2>
            {deliveryNotes.length ? (
              <>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {deliveryNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">{catalog("deliveryStated")}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("deliveryUnavailable")}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Shield className="size-4 text-muted-foreground" />
              {catalog("certifications")}
            </h2>
            {supplier.dataType === "DEMO" && supplier.certifications.length ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-700">
                <TriangleAlert className="size-4 shrink-0" />
                {catalog("demoCerts")}
              </p>
            ) : null}
            {supplier.certifications.length ? (
              <ul className="mt-3 space-y-3">
                {supplier.certifications.map((item) => (
                  <li key={item.id} className="rounded-lg border px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <CertificationBadge status={item.status} />
                    </div>
                    {item.issuer ? (
                      <p className="mt-1 text-xs text-muted-foreground">{item.issuer}</p>
                    ) : null}
                    {item.verificationNotes ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.verificationNotes}</p>
                    ) : null}
                    <p className="mt-2 text-xs leading-5">
                      {item.documentUrl ? (
                        <>
                          <span className="text-muted-foreground">{t("document")}: </span>
                          <a href={item.documentUrl} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                            {item.documentUrl}
                          </a>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t("noDocument")}</span>
                      )}
                    </p>
                    {item.sourceUrl ? (
                      <p className="mt-1 text-xs leading-5">
                        <span className="text-muted-foreground">{t("source")}: </span>
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                          {item.sourceUrl}
                        </a>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("noCerts")}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <FileText className="size-4 text-muted-foreground" />
              {t("sources")}
            </h2>
            {supplier.sources.length ? (
              <ul className="mt-3 space-y-3">
                {supplier.sources.map((source) => (
                  <li key={source.id} className="text-sm leading-6">
                    <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                      {source.title ?? source.url}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {source.sourceType === "DEMO" ? catalog("demoSource") : catalog("officialSource")}
                    </p>
                    {source.evidence ? <p className="mt-1 text-muted-foreground">{source.evidence}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("unavailable")}</p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="size-4 text-muted-foreground" />
              {t("company")}
            </h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">{t("type")}</dt>
                <dd className="mt-0.5 font-medium">{catalog(`types.${supplier.supplierType}`)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("address")}</dt>
                <dd className={`mt-0.5 ${supplier.address ? "font-medium" : "text-muted-foreground"}`}>
                  {supplier.address ?? catalog("unavailable")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{catalog("verificationLabel")}</dt>
                <dd className="mt-0.5 font-medium">{catalog(`verification.${supplier.verificationStatus}`)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Phone className="size-4 text-muted-foreground" />
              {t("contacts")}
            </h2>
            {supplier.contacts.length ? (
              <ul className="mt-3 space-y-3 text-sm">
                {supplier.contacts.map((contact) => (
                  <li key={contact.id}>
                    <p className="text-xs text-muted-foreground">
                      {contact.label ?? catalog(`contactType.${contact.type}`)}
                    </p>
                    <ContactValue contact={contact} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("unavailable")}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Star className="size-4 text-muted-foreground" />
              {t("workspace")}
            </h2>
            {workspace ? (
              <div className="mt-3 space-y-4">
                <ContactStatusForm supplierId={supplier.id} status={workspace.contactStatus} />
                {workspace.notes.map((note) => (
                  <NoteEditor key={note.id} supplierId={supplier.id} note={note} />
                ))}
                <NoteEditor supplierId={supplier.id} />
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{t("saveFirst")}</p>
                <NoteEditor supplierId={supplier.id} />
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  caption,
  value,
  missing,
  caution = false,
}: {
  icon: LucideIcon;
  label: string;
  caption: string;
  value: string;
  missing: boolean;
  caution?: boolean;
}) {
  const valueClass = missing ? "text-muted-foreground" : caution ? "text-amber-600" : "";
  return (
    <div className="flex gap-3 lg:px-4 lg:first:pl-0 lg:last:pr-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</dd>
        <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

function ProductFact({ label, value, missing }: { label: string; value: string; missing: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-sm ${missing ? "text-muted-foreground" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

function categoryThumb(slug: string): { icon: LucideIcon; tone: string } {
  const icons: Record<string, { icon: LucideIcon; tone: string }> = {
    meat: { icon: Beef, tone: "bg-rose-50 text-rose-600" },
    fish: { icon: Fish, tone: "bg-sky-50 text-sky-600" },
    produce: { icon: Apple, tone: "bg-emerald-50 text-emerald-600" },
    dairy: { icon: Milk, tone: "bg-violet-50 text-violet-600" },
    grocery: { icon: Wheat, tone: "bg-amber-50 text-amber-700" },
    frozen: { icon: Snowflake, tone: "bg-cyan-50 text-cyan-600" },
    drinks: { icon: CupSoda, tone: "bg-orange-50 text-orange-600" },
    packaging: { icon: Package, tone: "bg-stone-100 text-stone-600" },
  };
  return icons[slug] ?? { icon: Package, tone: "bg-muted text-muted-foreground" };
}

function ContactValue({ contact }: { contact: CatalogContact }) {
  if (contact.type === "EMAIL") {
    return (
      <a className="text-primary hover:underline" href={`mailto:${contact.value}`}>
        {contact.value}
      </a>
    );
  }
  if (contact.type === "PHONE") {
    return (
      <a className="text-primary hover:underline" href={`tel:${contact.value.replace(/[^\d+]/g, "")}`}>
        {contact.value}
      </a>
    );
  }
  if (/^https?:\/\//.test(contact.value)) {
    return (
      <a className="inline-flex items-center gap-1 text-primary hover:underline" href={contact.value} target="_blank" rel="noreferrer">
        {contact.value}
        <ExternalLink className="size-3.5" />
      </a>
    );
  }
  return <span>{contact.value}</span>;
}
