import { setRequestLocale } from "next-intl/server";
import { SectionPage, sectionMetadata } from "@/components/layout/section-page";
import { assertLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  return sectionMetadata("favorites", locale);
}

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  return <SectionPage page="favorites" />;
}
