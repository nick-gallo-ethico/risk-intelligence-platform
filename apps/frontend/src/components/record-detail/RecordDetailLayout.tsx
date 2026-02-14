"use client";

import React, { ReactNode, useState, useEffect, useCallback } from "react";
import { PanelLeft, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebarDrawer } from "@/components/record-detail/MobileSidebarDrawer";
import type { RecordDetailConfig } from "@/types/record-detail";

interface RecordDetailLayoutProps {
  config: RecordDetailConfig;
  leftSidebar: ReactNode;
  centerColumn: ReactNode;
  rightSidebar: ReactNode;
  breadcrumb?: ReactNode;
}

/**
 * Hook to detect screen size breakpoints for responsive layout.
 *
 * Returns:
 * - isDesktop: >= 1280px (xl) - three-column grid
 * - isTablet: 768px - 1279px - single column with drawer sidebars
 * - isMobile: < 768px - single column with full-width drawer sidebars
 */
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  useEffect(() => {
    function getBreakpoint(): "desktop" | "tablet" | "mobile" {
      const width = window.innerWidth;
      if (width >= 1280) return "desktop";
      if (width >= 768) return "tablet";
      return "mobile";
    }

    setBreakpoint(getBreakpoint());

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isDesktop: breakpoint === "desktop",
    isTablet: breakpoint === "tablet",
    isMobile: breakpoint === "mobile",
    breakpoint,
  };
}

/**
 * Config-driven three-column layout for record detail pages.
 *
 * This component provides the structural foundation for case, investigation,
 * and disclosure detail pages. It renders:
 * - Optional breadcrumb area above columns
 * - Left sidebar (300px) - properties, info summary, quick actions
 * - Center column (flexible) - tabbed content area
 * - Right sidebar (300px) - connected entities, workflow, AI
 *
 * Responsive behavior:
 * - Desktop (>=1280px): Three-column grid layout
 * - Tablet (768-1279px): Center column full width, sidebars in slide-over drawers
 * - Mobile (<768px): Single column, drawers are full-width
 *
 * The config parameter is available for future enhancements such as:
 * - Conditional rendering based on moduleType
 * - Dynamic column widths
 * - Permission-based visibility
 *
 * @param config - RecordDetailConfig defining the page structure
 * @param leftSidebar - Content for the left column
 * @param centerColumn - Content for the center column
 * @param rightSidebar - Content for the right column
 * @param breadcrumb - Optional breadcrumb/header content
 */
export function RecordDetailLayout({
  config,
  leftSidebar,
  centerColumn,
  rightSidebar,
  breadcrumb,
}: RecordDetailLayoutProps) {
  const { isDesktop } = useBreakpoint();
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // Close drawers when switching to desktop
  useEffect(() => {
    if (isDesktop) {
      setLeftDrawerOpen(false);
      setRightDrawerOpen(false);
    }
  }, [isDesktop]);

  const handleOpenLeft = useCallback(() => {
    setRightDrawerOpen(false);
    setLeftDrawerOpen(true);
  }, []);

  const handleOpenRight = useCallback(() => {
    setLeftDrawerOpen(false);
    setRightDrawerOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {breadcrumb && (
        <div className="flex-shrink-0 border-b bg-white px-4 py-2">
          {breadcrumb}
        </div>
      )}

      {/* Toggle buttons for tablet/mobile - positioned above the content area */}
      {!isDesktop && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-gray-600 hover:text-gray-900"
            onClick={handleOpenLeft}
            aria-label="Open case details sidebar"
          >
            <PanelLeft className="h-4 w-4" />
            <span className="text-xs font-medium">Details</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-gray-600 hover:text-gray-900"
            onClick={handleOpenRight}
            aria-label="Open connected items sidebar"
          >
            <span className="text-xs font-medium">Related</span>
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main grid: three columns on desktop, single column otherwise */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] min-h-0">
        {/* Left sidebar - visible only on desktop */}
        {isDesktop && (
          <div className="border-r overflow-y-auto bg-white">{leftSidebar}</div>
        )}

        {/* Center column - always visible, takes full width on tablet/mobile */}
        <div className="overflow-y-auto bg-gray-50">{centerColumn}</div>

        {/* Right sidebar - visible only on desktop */}
        {isDesktop && (
          <div className="border-l overflow-y-auto bg-white">
            {rightSidebar}
          </div>
        )}
      </div>

      {/* Drawer sidebars for tablet/mobile */}
      {!isDesktop && (
        <>
          <MobileSidebarDrawer
            isOpen={leftDrawerOpen}
            onClose={() => setLeftDrawerOpen(false)}
            side="left"
            title="Case Details"
          >
            {leftSidebar}
          </MobileSidebarDrawer>
          <MobileSidebarDrawer
            isOpen={rightDrawerOpen}
            onClose={() => setRightDrawerOpen(false)}
            side="right"
            title="Related Items"
          >
            {rightSidebar}
          </MobileSidebarDrawer>
        </>
      )}
    </div>
  );
}
