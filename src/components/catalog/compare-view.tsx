import { FavoriteButton } from "@/components/catalog/supplier-actions";
import { ContactStatusForm, DeleteNoteButton, NoteEditor } from "@/components/catalog/workspace-forms";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatQuantity } from "@/lib/format";
import type { CatalogSupplier, WorkspaceEntry } from "@/server/catalog-types";
import { matchSuppliers, type MatchContext, type MatchReport } from "@/server/matching";
import { removeFromComparison } from "@/server/actions";
import { getTranslations } from "next-intl/server";

type Cell = { text: string; best: boolean; note?: string };
type Row = { key: string; label: string; cells: Cell[] };

export async function CompareView({
  suppliers,
  workspace,
  locale,
  context,
}: {
  suppliers: CatalogSupplier[];
  workspace: WorkspaceEntry[];
  locale: string;
  context?: MatchContext;
}) {
  const t = await getTranslations("Compare");
  const catalog = await getTranslations("Catalog");
  const profile = await getTranslations("Profile");
  const reports = matchSuppliers(suppliers, context);
  const rows = buildRows(suppliers, reports, locale, catalog, t);

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("disclaimer")}</p>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("legend")}</p>
      <ScoreBreakdown suppliers={suppliers} reports={reports} unavailable={catalog("scoreUnavailable")} t={t} />
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
      <DecisionList
        suppliers={suppliers}
        workspace={workspace}
        decision={t("decision")}
        websiteLabel={t("website")}
        sourceLabel={t("source")}
        unavailable={catalog("unavailable")}
        saveFirst={profile("saveFirst")}
      />
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
  reports: MatchReport[],
  locale: string,
  catalog: Awaited<ReturnType<typeof getTranslations>>,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Row[] {
  const byId = new Map(reports.map((report) => [report.supplierId, report]));
  const categoryKey = locale === "en" ? "categoryNameEn" : "categoryNameRu";
  const unavailable = catalog("unavailable");

  return [
    {
      key: "score",
      label: t("score"),
      cells: suppliers.map((supplier) => {
        const report = byId.get(supplier.id);
        return {
          text: report?.score == null ? catalog("scoreUnavailable") : catalog("score", { score: report.score }),
          best: false,
          note: report ? t("coverage", { percent: Math.round(report.coverage * 100) }) : undefined,
        };
      }),
    },
    {
      key: "products",
      label: t("products"),
      cells: suppliers.map((supplier) => {
        const reason = byId.get(supplier.id)?.factors.find((factor) => factor.key === "product")?.reason;
        return {
          text:
            supplier.products
              .slice(0, 4)
              .map((product) => `${product.name} · ${product[categoryKey]}`)
              .join("\n") || unavailable,
          best: false,
          note: reason ? t(`reasons.${reason}`) : undefined,
        };
      }),
    },
    {
      key: "location",
      label: t("location"),
      cells: suppliers.map((supplier) => ({
        text: [supplier.city, supplier.region].filter(Boolean).join(", ") || unavailable,
        best: false,
      })),
    },
    {
      key: "price",
      label: t("price"),
      cells: suppliers.map((supplier) => {
        const price = byId.get(supplier.id)?.price;
        return {
          text:
            price?.amount == null
              ? catalog("priceUnavailable")
              : `${formatMoney(price.amount, locale, price.currency ?? "RUB")}${price.unit ? ` / ${price.unit}` : ""}`,
          best: Boolean(price?.lowest),
          note: price?.mixedUnits ? t("mixedUnits") : price?.lowest ? t("lowerPrice") : undefined,
        };
      }),
    },
    {
      key: "moq",
      label: t("moq"),
      cells: suppliers.map((supplier) => {
        const moq = byId.get(supplier.id)?.moq;
        return {
          text: moq?.amount == null ? catalog("moqUnavailable") : formatQuantity(moq.amount, moq.unit, locale),
          best: Boolean(moq?.lowest),
          note: moq?.mixedUnits ? t("mixedUnits") : moq?.lowest ? t("lowerMoq") : undefined,
        };
      }),
    },
    {
      key: "certs",
      label: t("certs"),
      cells: suppliers.map((supplier) => {
        const report = byId.get(supplier.id);
        const counted = (report?.verifiedCertifications ?? 0) > 0;
        return {
          text: supplier.certifications.length
            ? supplier.certifications.map((item) => item.name).join("\n")
            : catalog("noCerts"),
          best: false,
          note: supplier.certifications.length && !counted ? t("unverifiedCert") : undefined,
        };
      }),
    },
    {
      key: "delivery",
      label: t("delivery"),
      cells: suppliers.map((supplier) => {
        const notes = [
          ...new Set(supplier.products.flatMap((product) => (product.deliveryNotes ? [product.deliveryNotes] : []))),
        ];
        return {
          text: notes.join("\n") || catalog("deliveryUnavailable"),
          best: false,
          note: notes.length ? t("deliveryUnverified") : undefined,
        };
      }),
    },
    {
      key: "coverage",
      label: t("coverageRow"),
      cells: suppliers.map((supplier) => {
        const reason = byId.get(supplier.id)?.factors.find((factor) => factor.key === "delivery")?.reason;
        return {
          text: reason ? t(`reasons.${reason}`) : unavailable,
          best: false,
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
  ];
}

function ScoreBreakdown({
  suppliers,
  reports,
  unavailable,
  t,
}: {
  suppliers: CatalogSupplier[];
  reports: MatchReport[];
  unavailable: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const byId = new Map(reports.map((report) => [report.supplierId, report]));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {suppliers.map((supplier) => {
        const report = byId.get(supplier.id);
        return (
          <article key={supplier.id} className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">{supplier.name}</h2>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {report?.score == null ? unavailable : report.score}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("coverage", { percent: Math.round((report?.coverage ?? 0) * 100) })}
            </p>
            <ul className="mt-3 space-y-2">
              {report?.factors.map((factor) => (
                <li key={factor.key} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{t(`factors.${factor.key}`)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("weight", { percent: Math.round(factor.weight * 100) })}
                      {factor.points == null ? ` · ${t("excluded")}` : ` · ${t("points", { points: Math.round(factor.points) })}`}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{t(`reasons.${factor.reason}`)}</p>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

function DecisionList({
  suppliers,
  workspace,
  decision,
  websiteLabel,
  sourceLabel,
  unavailable,
  saveFirst,
}: {
  suppliers: CatalogSupplier[];
  workspace: WorkspaceEntry[];
  decision: string;
  websiteLabel: string;
  sourceLabel: string;
  unavailable: string;
  saveFirst: string;
}) {
  const bySupplier = new Map(workspace.map((entry) => [entry.supplierId, entry]));

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{decision}</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {suppliers.map((supplier) => {
          const entry = bySupplier.get(supplier.id) ?? null;
          const source = supplier.sources[0]?.url ?? supplier.sourceUrl;
          return (
            <article key={supplier.id} className="space-y-3 rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">{supplier.name}</h3>
              <div className="flex flex-wrap gap-2">
                <FavoriteButton supplierId={supplier.id} saved={entry != null} />
                {supplier.website ? (
                  <a href={supplier.website} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent">
                    {websiteLabel}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">{websiteLabel}: {unavailable}</span>
                )}
                {source ? (
                  <a href={source} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent">
                    {sourceLabel}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">{sourceLabel}: {unavailable}</span>
                )}
              </div>
              {entry ? (
                <div className="space-y-3">
                  <ContactStatusForm supplierId={supplier.id} status={entry.contactStatus} />
                  {entry.notes.map((note) => (
                    <div key={note.id} className="space-y-1">
                      <NoteEditor supplierId={supplier.id} note={note} />
                      <DeleteNoteButton noteId={note.id} />
                    </div>
                  ))}
                  <NoteEditor supplierId={supplier.id} />
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">{saveFirst}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
