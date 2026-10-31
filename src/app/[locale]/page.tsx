import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { HomePage } from "@/components/landing/home-page";
import { assertLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Landing" });

  return { title: t("title") };
}

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  return <HomePage />;
}
