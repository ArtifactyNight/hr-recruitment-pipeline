"use client";

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
} from "@/components/ui/sidebar";
import { routeSegmentLabels } from "@/features/dashboard/lib/route-labels";
import { UserButton } from "@clerk/nextjs";
import {
  BriefcaseIcon,
  Building2Icon,
  CalendarDaysIcon,
  HomeIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

const mainNav: Array<{
  href: string;
  label: string;
  icon: typeof HomeIcon;
}> = [
  { href: "/", label: "ภาพรวม", icon: HomeIcon },
  {
    href: "/candidates",
    label: routeSegmentLabels.candidates,
    icon: UsersIcon,
  },
  { href: "/jobs", label: routeSegmentLabels.jobs, icon: BriefcaseIcon },
  {
    href: "/interviews",
    label: routeSegmentLabels.interviews,
    icon: CalendarDaysIcon,
  },
];

export function AppSidebar({
  variant = "inset",
  ...sidebarProps
}: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar variant={variant} {...sidebarProps}>
      <SidebarHeader>
        <div className="flex items-center gap-2 ">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2Icon className="size-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">รับสมัครงาน</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              แผงควบคุม HR
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {mainNav.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2">
        {/* <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={
                pathname === "/settings" || pathname.startsWith("/settings/")
              }
              tooltip="ตั้งค่า"
            >
              <Link href="/settings">
                <SettingsIcon />
                <span>{routeSegmentLabels.settings}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu> */}
        <div className="flex items-center gap-2 px-2 pb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
          <span className="truncate text-xs text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
            บัญชีของคุณ
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
