"use client";

import { Wheat } from "lucide-react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { isNavItemActive, navigation } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={siteConfig.name}>
              <Link href="/">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wheat />
                </span>
                <span className="font-semibold tracking-tight">
                  {siteConfig.name}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const active = isNavItemActive(pathname, item.href);

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={t(item.key)}
                    >
                      <Link href={item.href} aria-current={active ? "page" : undefined}>
                        <item.icon />
                        <span>{t(item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="truncate px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {siteConfig.name}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
