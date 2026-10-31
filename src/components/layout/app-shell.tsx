import { getTranslations } from "next-intl/server";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Shell");

  return (
    <div className="flex min-h-svh w-full flex-1 flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        {t("skipToContent")}
      </a>
      <p className="border-b border-primary/15 bg-primary/10 px-4 py-2 text-center text-xs leading-5 text-foreground">
        {t("demoBanner")}
      </p>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
