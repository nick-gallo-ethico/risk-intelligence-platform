"use client";

import React, { ReactNode } from "react";
import type { RecordDetailConfig } from "@/types/record-detail";

interface RecordDetailLayoutProps {
  config: RecordDetailConfig;
  leftSidebar: ReactNode;
  centerColumn: ReactNode;
  rightSidebar: ReactNode;
  breadcrumb?: ReactNode;
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
  return (
    <div className="flex flex-col h-full">
      {breadcrumb && (
        <div className="flex-shrink-0 border-b bg-white px-4 py-2">
          {breadcrumb}
        </div>
      )}
      <div className="flex-1 grid grid-cols-[300px_1fr_300px] min-h-0">
        <div className="border-r overflow-y-auto bg-white">{leftSidebar}</div>
        <div className="overflow-y-auto bg-gray-50">{centerColumn}</div>
        <div className="border-l overflow-y-auto bg-white">{rightSidebar}</div>
      </div>
    </div>
  );
}
