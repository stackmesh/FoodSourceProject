"use client";

import { Check, Minus, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CertificateMark } from "@/lib/certificate-mark";
import type { CatalogSupplier } from "@/server/catalog-types";

export function SupplierBadges({
  supplier,
  variant = "card",
}: {
  supplier: Pick<CatalogSupplier, "dataType" | "verificationStatus" | "supplierType">;
  variant?: "card" | "profile";
}) {
  const t = useTranslations("Catalog");
  const pill = variant === "profile" ? "rounded-full px-2.5 py-0.5" : "rounded-md px-2 py-0.5";

  return (
    <div className="flex flex-wrap gap-1.5">
      {supplier.dataType === "DEMO" ? (
        <span className={`${pill} border border-amber-200 bg-amber-50 text-xs font-medium text-amber-900`}>
          {t("demo")}
        </span>
      ) : null}
      <span className={`${pill} border text-xs text-muted-foreground`}>
        {t(`verification.${supplier.verificationStatus}`)}
      </span>
      <span
        className={
          variant === "profile"
            ? `${pill} border border-primary/30 text-xs font-medium text-primary`
            : `${pill} border text-xs text-muted-foreground`
        }
      >
        {t(`types.${supplier.supplierType}`)}
      </span>
    </div>
  );
}

const certificateMarks = {
  valid: {
    label: "VERIFIED",
    text: "text-emerald-600",
    bubble: "bg-emerald-600 text-white",
    icon: Check,
  },
  expired: {
    label: "EXPIRED",
    text: "text-amber-500",
    bubble: "bg-amber-400 text-white",
    icon: TriangleAlert,
  },
  unverified: {
    label: "UNVERIFIED",
    text: "text-red-500",
    bubble: "bg-red-500 text-white",
    icon: X,
  },
  none: {
    label: "NONE",
    text: "text-muted-foreground",
    bubble: "bg-muted-foreground/70 text-white",
    icon: Minus,
  },
} as const;

export function CertificateStatus({ mark }: { mark: CertificateMark }) {
  const t = useTranslations("Catalog");
  const item = certificateMarks[mark];
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${item.text}`}>
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${item.bubble}`}>
        <Icon className="size-3" strokeWidth={2.5} />
      </span>
      {t(`certStatus.${item.label}`)}
    </span>
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
      {t(`certRecord.${status}`)}
    </span>
  );
}
