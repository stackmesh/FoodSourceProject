"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

export function HeroSearch() {
  const t = useTranslations("Header");
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    router.push(
      nextQuery ? `/suppliers?q=${encodeURIComponent(nextQuery)}` : "/suppliers",
    );
  }

  return (
    <form
      role="search"
      onSubmit={onSearch}
      className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
    >
      <label className="sr-only" htmlFor="landing-search">
        {t("searchLabel")}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="landing-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 bg-card pl-9"
        />
      </div>
      <Button type="submit" className="h-11">
        {t("searchSubmit")}
      </Button>
    </form>
  );
}
