import { factorGrade, leadingReason, matchQuality, type MatchReport } from "@/server/matching";
import { getTranslations } from "next-intl/server";

export async function MatchScore({
  report,
  basis,
}: {
  report: MatchReport | null;
  basis?: "search" | "catalog";
}) {
  const t = await getTranslations("Catalog");
  const compare = await getTranslations("Compare");
  const quality = matchQuality(report ?? { score: null, coverage: 0 });
  const reason = report ? leadingReason(report) : null;
  const coverage = Math.round((report?.coverage ?? 0) * 100);

  return (
    <section className="rounded-xl border bg-card p-4" aria-label={t("breakdown")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{compare("score")}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {report?.score == null ? t("scoreUnavailable") : t("score", { score: report.score })}
          </p>
          <p className={`mt-1 text-sm font-medium ${qualityTone(quality)}`}>{t(`quality.${quality}`)}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t("coverage", { percent: coverage })}</p>
      </div>
      {reason ? <p className="mt-3 text-sm leading-6">{compare(`reasons.${reason}`)}</p> : null}
      {report && report.score != null && report.coverage < 0.5 ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("coverageLimit")}</p>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("scoreDisclaimer")}</p>
      {basis ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t(basis === "catalog" ? "scoreBasisCatalog" : "scoreBasisSearch")}
        </p>
      ) : null}
      {report ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {report.factors.map((factor) => {
            const grade = factorGrade(factor);
            return (
              <div key={factor.key} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm font-medium">{compare(`factors.${factor.key}`)}</dt>
                  <dd className={`text-xs font-medium ${gradeTone(grade)}`}>{t(`grade.${grade}`)}</dd>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{compare(`reasons.${factor.reason}`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {factor.points == null ? compare("excluded") : compare("points", { points: factor.points })}
                </p>
              </div>
            );
          })}
        </dl>
      ) : null}
    </section>
  );
}

function qualityTone(quality: ReturnType<typeof matchQuality>) {
  if (quality === "strong") return "text-emerald-700";
  if (quality === "partial") return "text-amber-700";
  return "text-muted-foreground";
}

function gradeTone(grade: ReturnType<typeof factorGrade>) {
  if (grade === "exact") return "text-emerald-700";
  if (grade === "partial") return "text-amber-700";
  if (grade === "mismatch") return "text-red-700";
  return "text-muted-foreground";
}
