"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

function pathnameWithoutLocale(pathname: string) {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return pathname.slice(3) || "/";
  }

  return pathname || "/";
}

export function LanguageSwitcher() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    const pathname = pathnameWithoutLocale(window.location.pathname);
    const query = window.location.search.replace(/^\?/, "");
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
