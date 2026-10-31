import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  SectionFallback,
  SectionPage,
  sectionMetadata,
} from "@/components/layout/section-page";
import { assertLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  return sectionMetadata("suppliers", locale);
}

export default async function SuppliersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <Suspense fallback={<SectionFallback />}>
      <SupplierResults searchParams={searchParams} />
    </Suspense>
  );
}

async function SupplierResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const resolved = await searchParams;
  const raw = resolved.q;
  const query = Array.isArray(raw) ? raw[0] : raw;

  return <SectionPage page="suppliers" query={query} />;
}
