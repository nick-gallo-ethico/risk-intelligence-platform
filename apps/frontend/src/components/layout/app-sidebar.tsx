'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, PanelLeftClose, PanelLeft } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavMain } from './nav-main';
import { NavAdmin } from './nav-admin';
import { useAiPanel } from '@/contexts/ai-panel-context';

export function AppSidebar() {
  const { openPanel } = useAiPanel();

  return (
    <Sidebar collapsible="icon" className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link href="/dashboard">
                <Image
                  src="/ethico-logo.png"
                  alt="Ethico"
                  width={32}
                  height={32}
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Ethico</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Risk Intelligence
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
        <NavAdmin />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="AI Assistant" onClick={openPanel}>
              <Sparkles className="text-blue-500" />
              <span>AI Assistant</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarCollapseToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function SidebarCollapseToggle() {
  const { toggleSidebar, state } = useSidebar();

  return (
    <SidebarMenuButton onClick={toggleSidebar} tooltip="Toggle Sidebar">
      {state === 'expanded' ? (
        <>
          <PanelLeftClose />
          <span>Collapse</span>
        </>
      ) : (
        <>
          <PanelLeft />
          <span>Expand</span>
        </>
      )}
    </SidebarMenuButton>
  );
}
