import { cookies } from 'next/headers';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { AiPanel } from '@/components/layout/ai-panel';
import { AiPanelProvider } from '@/contexts/ai-panel-context';

/**
 * Authenticated Layout
 *
 * Layout wrapper for all authenticated routes.
 * Provides:
 * - Sidebar navigation (desktop) via SidebarProvider
 * - Mobile bottom navigation (< 768px)
 * - AI panel slide-over (accessible from both desktop and mobile)
 *
 * The layout uses cookies to persist sidebar state across page loads,
 * ensuring a consistent experience.
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read sidebar state from cookie for SSR-safe initialization
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get('sidebar_state');
  // Default to collapsed (icon rail mode) - matches CONTEXT.md preference
  const defaultOpen = sidebarCookie?.value === 'true';

  return (
    <AiPanelProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header with sidebar trigger */}
          <div className="flex items-center gap-2 p-2 md:hidden border-b">
            <SidebarTrigger />
            <span className="font-semibold text-sm">Ethico</span>
          </div>
          {/* Desktop top navigation bar - hidden on mobile */}
          <div className="hidden md:block">
            <TopNav />
          </div>
          {/* Page content with bottom padding for mobile nav */}
          <div className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </div>
        </main>
        {/* Mobile bottom navigation - hidden on desktop */}
        <MobileBottomNav />
        {/* AI Assistant panel - slides in from right */}
        <AiPanel />
      </SidebarProvider>
    </AiPanelProvider>
  );
}
