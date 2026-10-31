import { ArrowLeftRight, Search, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HeroSearch } from "./hero-search";

const categoryKeys = [
  "meat",
  "fish",
  "produce",
  "dairy",
  "grocery",
  "frozen",
  "drinks",
  "packaging",
] as const;

export async function HomePage() {
  const t = await getTranslations("Landing");

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          {t("subtitle")}
        </p>
        <HeroSearch />
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/suppliers" className="font-medium text-primary hover:underline">
            {t("browseSuppliers")}
          </Link>
          <Link href="/categories" className="text-muted-foreground hover:text-foreground">
            {t("browseCategories")}
          </Link>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <Feature icon={<Search className="size-4" />} title={t("searchTitle")} text={t("searchText")} />
          <Feature
            icon={<ArrowLeftRight className="size-4" />}
            title={t("compareTitle")}
            text={t("compareText")}
          />
          <Feature icon={<Star className="size-4" />} title={t("saveTitle")} text={t("saveText")} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold tracking-tight">{t("categoriesTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t("categoriesText")}
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {categoryKeys.map((key) => (
            <li key={key}>
              <Link
                href={`/suppliers?q=${encodeURIComponent(t(`categories.${key}`))}`}
                className="inline-flex rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary/40 hover:bg-accent"
              >
                {t(`categories.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
