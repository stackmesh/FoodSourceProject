import { formatDate } from "@/lib/format";
import { freshnessFacts, type FreshnessStatus } from "@/lib/freshness";
import type { CatalogSupplier } from "@/server/catalog-types";
import { getTranslations } from "next-intl/server";

const tones: Record<FreshnessStatus, string> = {
  fresh: "border-primary/30 bg-primary/10 text-primary",
  aging: "border-amber-200 bg-amber-50 text-amber-900",
  stale: "border-border bg-muted text-muted-foreground",
  unknown: "border-dashed text-muted-foreground",
};

export async function FreshnessIndicator({
  supplier,
  locale,
  observedAt,
  timeZone,
  variant,
}: {
  supplier: CatalogSupplier;
  locale: string;
  observedAt: string;
  timeZone: string;
  variant: "card" | "detail";
}) {
  const t = await getTranslations("Freshness");
  const catalog = await getTranslations("Catalog");
  const observed = new Date(observedAt);
  const facts = freshnessFacts(supplier, observed, timeZone);
  const unavailable = catalog("unavailable");
  const updated = dateText(facts.recordUpdatedAt, locale) ?? unavailable;
  const verified = dateText(facts.verifiedAt, locale);
  const created = dateText(facts.createdAt, locale) ?? unavailable;
  const checked = dateText(facts.sourceCheckedAt, locale);

  if (variant === "card") {
    return (
      <section className="mt-4 rounded-lg border px-3 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${tones[facts.status]}`}>
            {t(facts.status)}
          </span>
          <p className="text-muted-foreground">
            {t("recordUpdated")}: <span className="text-foreground">{updated}</span>
          </p>
        </div>
        {verified ? (
          <p className="mt-2 text-muted-foreground">
            {t("verified")}: <span className="text-foreground">{verified}</span>
          </p>
        ) : null}
        <p className="mt-2 text-muted-foreground">
          {t("source")}: <SourceLine facts={facts} unavailable={unavailable} demoLabel={catalog("demoSource")} />
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("disclaimer")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${tones[facts.status]}`}>
          {t(facts.status)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("disclaimer")}</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <Fact label={t("created")} value={created} />
        <Fact label={t("recordUpdated")} value={updated} />
        <Fact label={t("verified")} value={verified ?? unavailable} />
        <Fact label={t("externalSync")} value={unavailable} note={t("noSyncRecord")} />
        <Fact label={t("verification")} value={catalog(`verification.${supplier.verificationStatus}`)} />
        <Fact label={t("sourceChecked")} value={checked ?? unavailable} />
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("source")}: <SourceLine facts={facts} unavailable={unavailable} demoLabel={catalog("demoSource")} />
      </p>
    </section>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
      {note ? <dd className="mt-0.5 text-xs leading-5 text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

function SourceLine({
  facts,
  unavailable,
  demoLabel,
}: {
  facts: ReturnType<typeof freshnessFacts>;
  unavailable: string;
  demoLabel: string;
}) {
  if (!facts.sourceUrl && !facts.sourceTitle) return <span className="text-foreground">{unavailable}</span>;
  const label = facts.sourceTitle || facts.sourceUrl || unavailable;
  return (
    <span className="text-foreground">
      {facts.sourceUrl ? (
        <a href={facts.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
          {label}
        </a>
      ) : (
        label
      )}
      {facts.sourceType === "DEMO" ? <span className="mt-1 block text-xs text-amber-800">{demoLabel}</span> : null}
    </span>
  );
}

function dateText(iso: string | null, locale: string) {
  if (!iso) return null;
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  return formatDate(iso, locale);
}
