import { CertificationBadge, SupplierBadges } from "@/components/catalog/badges";
import { CompareButton, FavoriteButton } from "@/components/catalog/supplier-actions";
import {
  certificationSummary,
  moqLine,
  placeLine,
  priceLine,
} from "@/components/catalog/supplier-facts";
import {
  ContactStatusForm,
  DeleteNoteButton,
  NoteEditor,
} from "@/components/catalog/workspace-forms";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import type { CatalogContact, CatalogSupplier, WorkspaceEntry } from "@/server/catalog-types";
import { getTranslations } from "next-intl/server";

export async function SupplierProfile({
  supplier,
  locale,
  saved,
  comparing,
  workspace,
}: {
  supplier: CatalogSupplier;
  locale: string;
  saved: boolean;
  comparing: boolean;
  workspace: WorkspaceEntry | null;
}) {
  const t = await getTranslations("Profile");
  const catalog = await getTranslations("Catalog");
  const categoryKey = locale === "en" ? "categoryNameEn" : "categoryNameRu";
  const deliveryNotes = [
    ...new Set(supplier.products.flatMap((product) => (product.deliveryNotes ? [product.deliveryNotes] : []))),
  ];
  const primarySource = supplier.sources[0];
  const place = placeLine(supplier);
  const price = priceLine(supplier, locale, (value) => catalog("priceFrom", { value }));
  const moq = moqLine(supplier, locale, (value) => catalog("moqFrom", { value }));
  const certs = certificationSummary(supplier);
  const certText =
    certs.kind === "demo"
      ? catalog("demoCerts")
      : certs.kind === "verified"
        ? catalog("verifiedCerts", { count: certs.count })
        : certs.kind === "unverified"
          ? catalog("unverifiedCerts")
          : certs.kind === "expired"
            ? catalog("expiredCerts")
            : catalog("noCerts");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <Link href="/suppliers" className="text-sm text-muted-foreground hover:text-foreground">
        {t("back")}
      </Link>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{supplier.name}</h1>
          <p className={`mt-1 text-sm ${place ? "text-foreground" : "text-muted-foreground"}`}>
            {[place, supplier.country].filter(Boolean).join(", ") || catalog("unavailable")}
          </p>
          <div className="mt-2">
            <SupplierBadges supplier={supplier} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FavoriteButton supplierId={supplier.id} saved={saved} />
          <CompareButton slug={supplier.slug} active={comparing} />
          {supplier.website ? (
            <a
              href={supplier.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              {t("website")}
            </a>
          ) : (
            <span className="inline-flex h-8 items-center text-sm text-muted-foreground">
              {t("website")}: {catalog("unavailable")}
            </span>
          )}
          {primarySource ? (
            <a
              href={primarySource.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              {t("source")}
            </a>
          ) : (
            <span className="inline-flex h-8 items-center text-sm text-muted-foreground">
              {t("source")}: {catalog("unavailable")}
            </span>
          )}
        </div>
      </div>
      {supplier.description ? (
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{supplier.description}</p>
      ) : null}
      <dl className="mt-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryFact
          label={catalog("price")}
          value={price.kind === "missing" ? catalog("priceUnavailable") : price.text}
          missing={price.kind === "missing"}
        />
        <SummaryFact
          label={catalog("moq")}
          value={moq.kind === "missing" ? catalog("moqUnavailable") : moq.text}
          missing={moq.kind === "missing"}
        />
        <SummaryFact
          label={catalog("certifications")}
          value={certText}
          missing={certs.kind === "none"}
          caution={certs.kind !== "none" && certs.kind !== "verified"}
        />
        <SummaryFact
          label={t("delivery")}
          value={deliveryNotes.length ? catalog("deliveryStated") : catalog("deliveryUnavailable")}
          missing={!deliveryNotes.length}
          caution={deliveryNotes.length > 0}
        />
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("products")}</h2>
            <ul className="mt-1 divide-y">
              {supplier.products.map((product) => (
                <li key={product.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product[categoryKey]}</p>
                  </div>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-3">
                    <SummaryFact
                      label={catalog("price")}
                      value={
                        product.price == null
                          ? catalog("priceUnavailable")
                          : `${formatMoney(product.price, locale, product.currency)}${product.unit ? ` / ${product.unit}` : ""}`
                      }
                      missing={product.price == null}
                    />
                    <SummaryFact
                      label={catalog("moq")}
                      value={
                        product.moq == null
                          ? catalog("moqUnavailable")
                          : formatQuantity(product.moq, product.unit, locale)
                      }
                      missing={product.moq == null}
                    />
                    <SummaryFact
                      label={t("updated")}
                      value={
                        product.price != null && product.priceUpdatedAt
                          ? formatDate(product.priceUpdatedAt, locale)
                          : catalog("unavailable")
                      }
                      missing={product.price == null || !product.priceUpdatedAt}
                    />
                  </dl>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("delivery")}</h2>
            {deliveryNotes.length ? (
              <>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {deliveryNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-950">{catalog("deliveryStated")}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("deliveryUnavailable")}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{catalog("certifications")}</h2>
            {supplier.dataType === "DEMO" && supplier.certifications.length ? (
              <p className="mt-3 text-sm text-amber-950">{catalog("demoCerts")}</p>
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.documentUrl ? (
                        <a href={item.documentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {t("document")}
                        </a>
                      ) : (
                        t("noDocument")
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("noCerts")}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("sources")}</h2>
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
            <h2 className="text-base font-semibold">{t("company")}</h2>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">{t("type")}</dt>
                <dd>{catalog(`types.${supplier.supplierType}`)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("address")}</dt>
                <dd className={supplier.address ? undefined : "text-muted-foreground"}>
                  {supplier.address ?? catalog("unavailable")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{catalog("verificationLabel")}</dt>
                <dd>{catalog(`verification.${supplier.verificationStatus}`)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("contacts")}</h2>
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
            <h2 className="text-base font-semibold">{t("workspace")}</h2>
            {workspace ? (
              <div className="mt-3 space-y-4">
                <ContactStatusForm supplierId={supplier.id} status={workspace.contactStatus} />
                {workspace.notes.map((note) => (
                  <div key={note.id} className="space-y-1">
                    <NoteEditor supplierId={supplier.id} note={note} />
                    <DeleteNoteButton noteId={note.id} />
                  </div>
                ))}
                <NoteEditor supplierId={supplier.id} />
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("saveFirst")}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryFact({
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
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-sm ${valueClass}`}>{value}</dd>
    </div>
  );
}

function ContactValue({ contact }: { contact: CatalogContact }) {
  if (contact.type === "EMAIL") {
    return (
      <a className="hover:text-primary" href={`mailto:${contact.value}`}>
        {contact.value}
      </a>
    );
  }
  if (contact.type === "PHONE") {
    return (
      <a className="hover:text-primary" href={`tel:${contact.value.replace(/[^\d+]/g, "")}`}>
        {contact.value}
      </a>
    );
  }
  if (/^https?:\/\//.test(contact.value)) {
    return (
      <a className="hover:text-primary" href={contact.value} target="_blank" rel="noreferrer">
        {contact.value}
      </a>
    );
  }
  return <span>{contact.value}</span>;
}
