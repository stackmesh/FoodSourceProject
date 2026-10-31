"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DiscoveryQuery, SupplierTypeFilter } from "@/lib/discovery-query";
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
  categories,
  cities,
  regions,
}: {
  query: DiscoveryQuery;
  categories: { slug: string; nameRu: string; nameEn: string }[];
  cities: string[];
  regions: string[];
}) {
  const t = useTranslations("Discovery");
  const catalog = useTranslations("Catalog");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
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

  return (
    <form action={apply} className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="md:col-span-2 xl:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("search")}</span>
          <Input name="q" defaultValue={query.q} placeholder={t("searchPlaceholder")} />
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
          <option value="name">{t("sortName")}</option>
          <option value="relevance">{t("sortRelevance")}</option>
          <option value="price">{t("sortPrice")}</option>
          <option value="moq">{t("sortMoq")}</option>
        </Select>
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
        <Select name="type" label={t("type")} defaultValue={query.type}>
          <option value="">{t("any")}</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {catalog(`types.${type}`)}
            </option>
          ))}
        </Select>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("maxPrice")}</span>
          <Input name="maxPrice" inputMode="decimal" defaultValue={query.maxPrice ?? ""} />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("maxMoq")}</span>
          <Input name="maxMoq" inputMode="decimal" defaultValue={query.maxMoq ?? ""} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="certified"
            defaultChecked={query.certified}
            className="size-4 accent-primary"
          />
          {t("certified")}
        </label>
        <Button type="submit" size="sm">
          {t("apply")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
        >
          {t("clear")}
        </Button>
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
        className="h-9 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {children}
      </select>
    </label>
  );
}
