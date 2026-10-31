import { CertificateStatus } from "@/components/catalog/badges";
import { FavoriteButton } from "@/components/catalog/supplier-actions";
import { supplierCertificateMark, type CertificateMark } from "@/lib/certificate-mark";
import { ContactStatusForm, DeleteNoteButton, NoteEditor } from "@/components/catalog/workspace-forms";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatQuantity } from "@/lib/format";
import type { CatalogSupplier, WorkspaceEntry } from "@/server/catalog-types";
import { matchSuppliers, type FactorStatus, type MatchContext, type MatchReport } from "@/server/matching";
import { removeFromComparison } from "@/server/actions";
import { getTranslations } from "next-intl/server";

type Cell = {
  text: string;
  best: boolean;
  note?: string;
  noteTone?: "positive" | "caution" | "neutral";
  certificate?: CertificateMark;
  status?: FactorStatus;
  points?: number | null;
  statusLabel?: string;
};
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
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("statusLegend")}</p>
      <ComparisonBasis suppliers={suppliers} context={context} locale={locale} t={t} />
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
                  <dd className="text-sm">
                    {row.cells[index] ? <CellBody cell={row.cells[index]} /> : null}
                  </dd>
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
                    <CellBody cell={cell} />
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

function CellBody({ cell }: { cell: Cell }) {
  const noteClass =
    cell.noteTone === "caution"
      ? "mt-1 text-xs font-medium text-amber-950"
      : cell.noteTone === "positive"
        ? "mt-1 text-xs font-medium text-primary"
        : "mt-1 text-xs leading-5 text-muted-foreground";

  return (
    <>
      {cell.certificate ? (
        <div className="mb-1">
          <CertificateStatus mark={cell.certificate} />
        </div>
      ) : null}
      {cell.text ? <div className="whitespace-pre-line">{cell.text}</div> : null}
      {cell.status && cell.statusLabel ? (
        <div className="mt-1">
          <FactorChip status={cell.status} points={cell.points ?? null} label={cell.statusLabel} />
        </div>
      ) : null}
      {cell.note ? <p className={noteClass}>{cell.note}</p> : null}
    </>
  );
}

function FactorChip({
  status,
  points,
  label,
}: {
  status: FactorStatus;
  points: number | null;
  label: string;
}) {
  const tone =
    status === "scored"
      ? points
        ? "border-primary/30 bg-primary/10 text-foreground"
        : "border-border bg-muted text-muted-foreground"
      : status === "not_comparable"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : status === "not_requested"
          ? "border-dashed border-border bg-background text-muted-foreground"
          : "border-border bg-background text-muted-foreground";

  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

function ComparisonBasis({
  suppliers,
  context,
  locale,
  t,
}: {
  suppliers: CatalogSupplier[];
  context?: MatchContext;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const category = context?.category
    ? categoryName(suppliers, context.category, locale)
    : "";
  const details = [
    context?.query ? t("basisQuery", { query: context.query }) : "",
    category ? t("basisCategory", { category }) : "",
    context?.city ? t("basisCity", { city: context.city }) : "",
    context?.region ? t("basisRegion", { region: context.region }) : "",
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        {details.length ? t("basisFromSearch") : t("basisAmongSelection")}
      </p>
      {details.length ? (
        <ul className="flex flex-wrap gap-2">
          {details.map((detail) => (
            <li key={detail} className="rounded-md border bg-card px-2 py-0.5 text-xs">
              {detail}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function geographyReason(
  report: MatchReport | undefined,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  const reason = report?.factors.find((factor) => factor.key === "geography")?.reason;
  return reason ? t(`reasons.${reason}`) : undefined;
}

function categoryName(suppliers: CatalogSupplier[], slug: string, locale: string) {
  for (const supplier of suppliers) {
    const product = supplier.products.find((item) => item.categorySlug === slug);
    if (product) return locale === "en" ? product.categoryNameEn : product.categoryNameRu;
  }
  return slug;
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
  const statusFor = (supplierId: string, key: MatchReport["factors"][number]["key"]) => {
    const factor = byId.get(supplierId)?.factors.find((item) => item.key === key);
    if (!factor) return {};
    const statusLabel =
      factor.status === "scored"
        ? t("points", { points: factor.points ?? 0 })
        : t(`status.${factor.status}`);
    return { status: factor.status, points: factor.points, statusLabel };
  };

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
          noteTone: "neutral",
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
          noteTone: "neutral",
          ...statusFor(supplier.id, "product"),
        };
      }),
    },
    {
      key: "location",
      label: t("location"),
      cells: suppliers.map((supplier) => ({
        text: [supplier.city, supplier.region].filter(Boolean).join(", ") || unavailable,
        best: false,
        note: geographyReason(byId.get(supplier.id), t),
        noteTone: "neutral",
        ...statusFor(supplier.id, "geography"),
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
          note: price?.lowest ? t("lowerPrice") : undefined,
          noteTone: price?.lowest ? "positive" : undefined,
          ...statusFor(supplier.id, "price"),
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
          note: moq?.lowest ? t("lowerMoq") : undefined,
          noteTone: moq?.lowest ? "positive" : undefined,
          ...statusFor(supplier.id, "moq"),
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
          text: supplier.certifications.map((item) => item.name).join("\n"),
          certificate: supplierCertificateMark(supplier),
          best: false,
          note: supplier.certifications.length && !counted ? t("unverifiedCert") : undefined,
          noteTone: supplier.certifications.length && !counted ? "caution" : undefined,
          ...statusFor(supplier.id, "certification"),
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
          noteTone: notes.length ? "caution" : undefined,
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
          ...statusFor(supplier.id, "delivery"),
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
                  <div className="flex items-center justify-between gap-3">
                    <span>{t(`factors.${factor.key}`)}</span>
                    <FactorChip
                      status={factor.status}
                      points={factor.points}
                      label={
                        factor.status === "scored"
                          ? t("points", { points: factor.points ?? 0 })
                          : t(`status.${factor.status}`)
                      }
                    />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t("weight", { percent: Math.round(factor.weight * 100) })}
                    {" · "}
                    {t(`reasons.${factor.reason}`)}
                  </p>
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
