import { setRequestLocale } from "next-intl/server";
import { SectionPage, sectionMetadata } from "@/components/layout/section-page";
import { assertLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  return sectionMetadata("compare", locale);
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  return <SectionPage page="compare" />;
}
