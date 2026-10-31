"use client";

import { useTranslations } from "next-intl";
import type { CatalogSupplier } from "@/server/catalog-types";

export function SupplierBadges({
  supplier,
}: {
  supplier: Pick<CatalogSupplier, "dataType" | "verificationStatus" | "supplierType">;
}) {
  const t = useTranslations("Catalog");

  return (
    <div className="flex flex-wrap gap-1.5">
      {supplier.dataType === "DEMO" ? (
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
          {t("demo")}
        </span>
      ) : null}
      <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
        {t(`verification.${supplier.verificationStatus}`)}
      </span>
      <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
        {t(`types.${supplier.supplierType}`)}
      </span>
    </div>
  );
}

export function CertificationBadge({
  status,
}: {
  status: CatalogSupplier["certifications"][number]["status"];
}) {
  const t = useTranslations("Catalog");
  const tone =
    status === "EXPIRED"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-border bg-background text-muted-foreground";

  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs ${tone}`}>
      {t(`certStatus.${status}`)}
    </span>
  );
}
