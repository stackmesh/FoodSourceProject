"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contactStatuses } from "@/lib/contact-tracking";
import { freshnessStatuses } from "@/lib/freshness";
import { sortOptions, type DiscoveryQuery, type SupplierTypeFilter } from "@/lib/discovery-query";
import { usePathname, useRouter } from "@/i18n/navigation";

const types: SupplierTypeFilter[] = [
  "MANUFACTURER",
  "DISTRIBUTOR",
  "FARM",
  "IMPORTER",
  "PACKAGING",
  "WHOLESALER",
];

export function DiscoveryFilters({
  query,
  total,
  categories,
  cities,
  regions,
}: {
  query: DiscoveryQuery;
  total: number;
  categories: { slug: string; nameRu: string; nameEn: string }[];
  cities: string[];
  regions: string[];
}) {
  const t = useTranslations("Discovery");
  const catalog = useTranslations("Catalog");
  const freshness = useTranslations("Freshness");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const categoryName = (item: { nameRu: string; nameEn: string }) =>
    locale === "en" ? item.nameEn : item.nameRu;

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    const values: Record<string, string> = {
      q: String(formData.get("q") ?? "").trim(),
      category: String(formData.get("category") ?? ""),
      city: String(formData.get("city") ?? ""),
      region: String(formData.get("region") ?? ""),
      type: String(formData.get("type") ?? ""),
      contact: String(formData.get("contact") ?? ""),
      freshness: String(formData.get("freshness") ?? ""),
      maxPrice: String(formData.get("maxPrice") ?? "").trim(),
      maxMoq: String(formData.get("maxMoq") ?? "").trim(),
    };

    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }

    const sort = String(formData.get("sort") ?? "name");
    if (sort && sort !== "name") params.set("sort", sort);
    if (formData.get("certified") === "on") params.set("certified", "1");
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  const appliedKey = [
    query.q,
    query.scope,
    query.category,
    query.city,
    query.region,
    query.type,
    query.sort,
    query.certified ? "1" : "",
    query.maxPrice ?? "",
    query.maxMoq ?? "",
    query.contact,
    query.freshness,
  ].join("\n");

  return (
    <form
      key={appliedKey}
      onSubmit={(event) => {
        event.preventDefault();
        apply(new FormData(event.currentTarget));
      }}
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        {t("filtersTitle")}
      </button>
      <div className={open ? "mt-4 space-y-3" : "hidden"}>
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("search")}</span>
            <span className="flex h-10 items-center rounded-lg border bg-card focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <Search className="ml-3 size-4 shrink-0 text-muted-foreground" />
              <input
                name="q"
                defaultValue={query.q}
                placeholder={t("searchPlaceholder")}
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </span>
          </label>
          <Select name="category" label={t("category")} defaultValue={query.category}>
            <option value="">{t("any")}</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {categoryName(item)}
              </option>
            ))}
          </Select>
          <Select name="sort" label={t("sort")} defaultValue={query.sort}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select name="city" label={t("city")} defaultValue={query.city}>
            <option value="">{t("any")}</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
          <Select name="region" label={t("region")} defaultValue={query.region}>
            <option value="">{t("any")}</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
          <Select name="contact" label={t("contact")} defaultValue={query.contact}>
            <option value="">{t("any")}</option>
            {contactStatuses.map((status) => (
              <option key={status} value={status}>
                {catalog(`contactStatus.${status}`)}
              </option>
            ))}
          </Select>
          <Select name="freshness" label={freshness("filter")} defaultValue={query.freshness}>
            <option value="">{t("any")}</option>
            {freshnessStatuses.map((status) => (
              <option key={status} value={status}>
                {freshness(status)}
              </option>
            ))}
          </Select>
          <Select name="type" label={t("type")} defaultValue={query.type}>
            <option value="">{t("any")}</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {catalog(`types.${type}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("maxPrice")}</span>
            <Input
              name="maxPrice"
              inputMode="decimal"
              defaultValue={query.maxPrice ?? ""}
              placeholder={t("pricePlaceholder")}
              className="h-10 rounded-lg"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("maxMoq")}</span>
            <Input
              name="maxMoq"
              inputMode="decimal"
              defaultValue={query.maxMoq ?? ""}
              placeholder={t("moqPlaceholder")}
              className="h-10 rounded-lg"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <label className="mr-auto flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="certified"
              defaultChecked={query.certified}
              className="size-4 accent-primary"
            />
            {t("certified")}
            <Info className="size-3.5 text-muted-foreground" aria-label={t("certifiedHint")}>
              <title>{t("certifiedHint")}</title>
            </Info>
          </label>
          <Button type="submit">{t("applyCount", { count: total })}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(pathname)}>
            {t("clearAll")}
          </Button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            {t("collapseFilters")}
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

function Select({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {children}
      </select>
    </label>
  );
}
