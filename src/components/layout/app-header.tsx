"use client";

import { Bell, Building2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { isNavItemActive, navigation } from "@/config/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

export function AppHeader() {
  const t = useTranslations("Header");
  const nav = useTranslations("Nav");
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const current = navigation.find((item) => isNavItemActive(pathname, item.href));

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    router.push(
      nextQuery ? `/suppliers?q=${encodeURIComponent(nextQuery)}` : "/suppliers",
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3 md:px-5">
        <SidebarTrigger className="-ml-1" />
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:flex-none">
          {current ? nav(current.key) : nav("overview")}
        </h1>
        <form
          role="search"
          onSubmit={onSearch}
          className="order-last flex w-full items-center gap-2 md:order-none md:mx-auto md:max-w-md md:flex-1"
        >
          <label className="sr-only" htmlFor="global-search">
            {t("searchLabel")}
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="global-search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm" className="shrink-0">
            {t("searchSubmit")}
          </Button>
        </form>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("notifications")}
              >
                <Bell />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>{t("notifications")}</DropdownMenuLabel>
              <p className="px-2 py-3 text-sm text-muted-foreground">
                {t("noNotifications")}
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Building2 />
                <span className="hidden sm:inline">{t("workspace")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>{t("workspace")}</DropdownMenuLabel>
              <p className="px-2 py-1.5 text-xs leading-5 text-muted-foreground">
                {t("workspaceHint")}
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
