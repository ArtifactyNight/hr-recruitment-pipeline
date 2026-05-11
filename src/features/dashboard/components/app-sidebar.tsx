"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { routeSegmentLabels } from "@/features/dashboard/utils";
import { authClient } from "@/lib/auth-client";
import {
  BriefcaseIcon,
  Building2Icon,
  CalendarDaysIcon,
  HomeIcon,
  LogOutIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";

const mainNav: Array<{
  href: string;
  label: string;
  icon: typeof HomeIcon;
}> = [
  { href: "/", label: "แดชบอร์ด", icon: HomeIcon },
  {
    href: "/candidates",
    label: routeSegmentLabels.candidates,
    icon: UsersIcon,
  },
  {
    href: "/interviews",
    label: routeSegmentLabels.interviews,
    icon: CalendarDaysIcon,
  },
  { href: "/jobs", label: routeSegmentLabels.jobs, icon: BriefcaseIcon },
];

export function AppSidebar({
  variant = "inset",
  ...sidebarProps
}: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  function handleSignOut() {
    authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/sign-in") },
    });
  }

  const userName = session?.user?.name ?? session?.user?.email ?? "บัญชีของคุณ";
  const initials = (session?.user?.name ?? session?.user?.email ?? "?")
    .charAt(0)
    .toUpperCase();

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
                      className="data-active:bg-white! data-active:text-black! data-active:shadow-sm! hover:bg-black/10 text-muted-foreground hover:text-black transition-all active:bg-black/10 active:text-black!"
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
        <div className="flex items-center gap-2 px-2 pb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden flex-1">
            {userName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 group-data-[collapsible=icon]:hidden"
            onClick={handleSignOut}
            title="ออกจากระบบ"
          >
            <LogOutIcon className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
