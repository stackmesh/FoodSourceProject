"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale: nextLocale });
  }

  return (
    <div
      className="flex items-center rounded-lg border bg-card p-0.5"
      role="group"
      aria-label={t("language")}
    >
      {routing.locales.map((code) => {
        const selected = locale === code;

        return (
          <Button
            key={code}
            type="button"
            size="xs"
            variant={selected ? "default" : "ghost"}
            aria-pressed={selected}
            onClick={() => switchLocale(code)}
          >
            {code.toUpperCase()}
          </Button>
        );
      })}
    </div>
  );
}
