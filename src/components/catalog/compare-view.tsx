import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatQuantity } from "@/lib/format";
import type { CatalogSupplier } from "@/server/catalog-types";
import { removeFromComparison } from "@/server/actions";
import { getTranslations } from "next-intl/server";

type Cell = { text: string; best: boolean; note?: string };
type Row = { key: string; label: string; cells: Cell[] };

export async function CompareView({
  suppliers,
  locale,
}: {
  suppliers: CatalogSupplier[];
  locale: string;
}) {
  const t = await getTranslations("Compare");
  const catalog = await getTranslations("Catalog");
  const rows = buildRows(suppliers, locale, catalog, t);

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("legend")}</p>
      <div className="space-y-4 md:hidden">
        {suppliers.map((supplier, index) => (
          <article key={supplier.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">
                <Link href={`/suppliers/${supplier.slug}`} className="hover:text-primary">
                  {supplier.name}
                </Link>
              </h2>
              <RemoveForm slug={supplier.slug} label={t("remove")} />
            </div>
            <dl className="mt-4 grid gap-3">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className={`rounded-md px-2 py-1.5 ${row.cells[index]?.best ? "bg-primary/10" : ""}`}
                >
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm">{row.cells[index]?.text}</dd>
                  {row.cells[index]?.note ? (
                    <p className="text-xs font-medium text-primary">{row.cells[index]?.note}</p>
                  ) : null}
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="w-40 px-4 py-3 text-left font-medium text-muted-foreground">{t("field")}</th>
              {suppliers.map((supplier) => (
                <th key={supplier.id} className="min-w-52 px-4 py-3 text-left align-top font-semibold">
                  <Link href={`/suppliers/${supplier.slug}`} className="hover:text-primary">
                    {supplier.name}
                  </Link>
                  <div className="mt-2">
                    <RemoveForm slug={supplier.slug} label={t("remove")} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-b-0">
                <th className="px-4 py-3 text-left align-top font-medium text-muted-foreground">
                  {row.label}
                </th>
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.key}-${suppliers[index]?.id}`}
                    className={`px-4 py-3 align-top ${cell.best ? "bg-primary/10" : ""}`}
                  >
                    <div className="whitespace-pre-line">{cell.text}</div>
                    {cell.note ? <p className="mt-1 text-xs font-medium text-primary">{cell.note}</p> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RemoveForm({ slug, label }: { slug: string; label: string }) {
  return (
    <form action={removeFromComparison}>
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" variant="outline" size="sm">
        {label}
      </Button>
    </form>
  );
}

function buildRows(
  suppliers: CatalogSupplier[],
  locale: string,
  catalog: Awaited<ReturnType<typeof getTranslations>>,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Row[] {
  const prices = suppliers.flatMap((supplier) => (supplier.minPrice == null ? [] : [supplier.minPrice]));
  const moqs = suppliers.flatMap((supplier) => (supplier.minMoq == null ? [] : [supplier.minMoq]));
  const certs = suppliers.map((supplier) => supplier.certifications.length);
  const bestPrice = distinct(prices) ? Math.min(...prices) : null;
  const bestMoq = distinct(moqs) ? Math.min(...moqs) : null;
  const bestCerts = distinct(certs) ? Math.max(...certs) : null;
  const deliveryValues = suppliers.map((supplier) =>
    supplier.products.some((product) => product.deliveryNotes),
  );
  const deliveryDiffers = new Set(deliveryValues).size > 1;
  const categoryKey = locale === "en" ? "categoryNameEn" : "categoryNameRu";

  return [
    {
      key: "type",
      label: t("type"),
      cells: suppliers.map((supplier) => ({
        text: catalog(`types.${supplier.supplierType}`),
        best: false,
      })),
    },
    {
      key: "location",
      label: t("location"),
      cells: suppliers.map((supplier) => ({
        text: [supplier.city, supplier.region].filter(Boolean).join(", ") || catalog("unavailable"),
        best: false,
      })),
    },
    {
      key: "products",
      label: t("products"),
      cells: suppliers.map((supplier) => ({
        text:
          supplier.products
            .slice(0, 3)
            .map((product) => `${product.name} · ${product[categoryKey]}`)
            .join("\n") || catalog("unavailable"),
        best: false,
      })),
    },
    {
      key: "price",
      label: t("price"),
      cells: suppliers.map((supplier) => ({
        text:
          supplier.minPrice == null
            ? catalog("priceUnavailable")
            : catalog("priceFrom", {
                value: formatMoney(supplier.minPrice, locale),
              }),
        best: bestPrice != null && supplier.minPrice === bestPrice,
        note: bestPrice != null && supplier.minPrice === bestPrice ? t("lowerPrice") : undefined,
      })),
    },
    {
      key: "moq",
      label: t("moq"),
      cells: suppliers.map((supplier) => {
        const unit = supplier.products.find((product) => product.moq === supplier.minMoq)?.unit ?? null;
        return {
          text:
            supplier.minMoq == null
              ? catalog("moqUnavailable")
              : catalog("moqFrom", { value: formatQuantity(supplier.minMoq, unit, locale) }),
          best: bestMoq != null && supplier.minMoq === bestMoq,
          note: bestMoq != null && supplier.minMoq === bestMoq ? t("lowerMoq") : undefined,
        };
      }),
    },
    {
      key: "certs",
      label: t("certs"),
      cells: suppliers.map((supplier) => ({
        text: supplier.certifications.length
          ? supplier.certifications.map((item) => item.name).join("\n")
          : catalog("noCerts"),
        best: bestCerts != null && supplier.certifications.length === bestCerts && bestCerts > 0,
        note:
          bestCerts != null && supplier.certifications.length === bestCerts && bestCerts > 0
            ? t("moreCerts")
            : undefined,
      })),
    },
    {
      key: "delivery",
      label: t("delivery"),
      cells: suppliers.map((supplier) => {
        const notes = [
          ...new Set(supplier.products.flatMap((product) => (product.deliveryNotes ? [product.deliveryNotes] : []))),
        ];
        const present = notes.length > 0;
        return {
          text: present ? notes.join("\n") : catalog("deliveryUnavailable"),
          best: deliveryDiffers && present,
          note: deliveryDiffers && present ? t("hasDelivery") : undefined,
        };
      }),
    },
    {
      key: "verification",
      label: t("verification"),
      cells: suppliers.map((supplier) => ({
        text: `${catalog(`verification.${supplier.verificationStatus}`)}${supplier.dataType === "DEMO" ? `\n${catalog("demo")}` : ""}`,
        best: false,
      })),
    },
    {
      key: "contacts",
      label: t("contacts"),
      cells: suppliers.map((supplier) => ({
        text:
          supplier.contacts.map((contact) => contact.value).join("\n") || catalog("unavailable"),
        best: false,
      })),
    },
  ];
}

function distinct(values: number[]) {
  return values.length > 1 && new Set(values).size > 1;
}
