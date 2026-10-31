import { CertificationBadge, SupplierBadges } from "@/components/catalog/badges";
import { CompareButton, FavoriteButton } from "@/components/catalog/supplier-actions";
import {
  ContactStatusForm,
  DeleteNoteButton,
  NoteEditor,
} from "@/components/catalog/workspace-forms";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import type { CatalogSupplier, WorkspaceEntry } from "@/server/catalog-types";
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <Link href="/suppliers" className="text-sm text-muted-foreground hover:text-foreground">
        {t("back")}
      </Link>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <SupplierBadges supplier={supplier} />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{supplier.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[supplier.city, supplier.region, supplier.country].filter(Boolean).join(", ")}
          </p>
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
          ) : null}
          {primarySource ? (
            <a
              href={primarySource.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              {t("source")}
            </a>
          ) : null}
        </div>
      </div>
      {supplier.description ? (
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{supplier.description}</p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("products")}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">{t("product")}</th>
                    <th className="py-2 pr-3 font-medium">{t("category")}</th>
                    <th className="py-2 pr-3 font-medium">{catalog("price")}</th>
                    <th className="py-2 pr-3 font-medium">{catalog("moq")}</th>
                    <th className="py-2 font-medium">{t("updated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.products.map((product) => (
                    <tr key={product.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{product.name}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{product[categoryKey]}</td>
                      <td className="py-3 pr-3">
                        {product.price == null
                          ? catalog("priceUnavailable")
                          : `${formatMoney(product.price, locale, product.currency)}${product.unit ? ` / ${product.unit}` : ""}`}
                      </td>
                      <td className="py-3 pr-3">
                        {product.moq == null
                          ? catalog("moqUnavailable")
                          : formatQuantity(product.moq, product.unit, locale)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {product.priceUpdatedAt ? formatDate(product.priceUpdatedAt, locale) : catalog("unavailable")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("delivery")}</h2>
            {deliveryNotes.length ? (
              <ul className="mt-3 space-y-2 text-sm leading-6">
                {deliveryNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{catalog("deliveryUnavailable")}</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{catalog("certifications")}</h2>
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
                      {item.documentUrl ? item.documentUrl : t("noDocument")}
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
                <dd>{supplier.address ?? catalog("unavailable")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{catalog("verificationLabel")}</dt>
                <dd>{catalog(`verification.${supplier.verificationStatus}`)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-base font-semibold">{t("contacts")}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {supplier.contacts.map((contact) => (
                <li key={contact.id}>
                  <p className="text-xs text-muted-foreground">
                    {contact.label ?? catalog(`contactType.${contact.type}`)}
                  </p>
                  {contact.type === "EMAIL" ? (
                    <a className="hover:text-primary" href={`mailto:${contact.value}`}>
                      {contact.value}
                    </a>
                  ) : contact.type === "PHONE" ? (
                    <a className="hover:text-primary" href={`tel:${contact.value.replace(/[^\d+]/g, "")}`}>
                      {contact.value}
                    </a>
                  ) : (
                    <a className="hover:text-primary" href={contact.value} target="_blank" rel="noreferrer">
                      {contact.value}
                    </a>
                  )}
                </li>
              ))}
            </ul>
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
