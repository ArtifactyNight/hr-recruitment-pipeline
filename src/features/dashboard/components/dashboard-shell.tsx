"use client";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { DashboardBreadcrumb } from "@/features/dashboard/components/dashboard-breadcrumb";
import type { CSSProperties, ReactNode } from "react";

type DashboardShellProps = {
  children: ReactNode;
};

const sidebarProviderStyles = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as CSSProperties;

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider style={sidebarProviderStyles}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader>
          <DashboardBreadcrumb />
        </SiteHeader>
        <div className="flex min-h-0 flex-1 flex-col bg-muted">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
