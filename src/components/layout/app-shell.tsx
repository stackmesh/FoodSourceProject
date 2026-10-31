import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Shell");

  return (
    <SidebarProvider>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        {t("skipToContent")}
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <p className="border-b border-primary/15 bg-primary/10 px-4 py-2 text-center text-xs leading-5 text-foreground">
          {t("demoBanner")}
        </p>
        <Suspense fallback={<div className="h-16 border-b bg-card" />}>
          <AppHeader />
        </Suspense>
        <div id="content" className="flex flex-1 flex-col px-4 py-6 md:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
