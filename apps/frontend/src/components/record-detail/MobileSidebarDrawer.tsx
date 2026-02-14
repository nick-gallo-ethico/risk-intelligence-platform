"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side: "left" | "right";
  title?: string;
  children: React.ReactNode;
}

/**
 * MobileSidebarDrawer - Slide-over drawer for tablet/mobile sidebar access.
 *
 * Used by RecordDetailLayout to render left/right sidebar content
 * in a Sheet drawer on screens below 1280px (xl breakpoint).
 *
 * Features:
 * - Uses shadcn Sheet (Radix Dialog) for slide-over behavior
 * - 320px width on tablet, full-width on mobile (<768px)
 * - Overlay darkens background
 * - Close button (X) built into Sheet
 * - Independent scrolling within the drawer
 * - Closes on overlay click or close button
 *
 * @param isOpen - Whether the drawer is open
 * @param onClose - Callback to close the drawer
 * @param side - Which side the drawer opens from ('left' or 'right')
 * @param title - Optional title displayed in the drawer header
 * @param children - Sidebar content to render inside the drawer
 */
export function MobileSidebarDrawer({
  isOpen,
  onClose,
  side,
  title,
  children,
}: MobileSidebarDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={side}
        className={cn(
          "p-0 overflow-y-auto",
          // 320px on tablet, full-width on mobile
          "w-[320px] max-sm:w-full",
        )}
      >
        {title && (
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle className="text-sm font-semibold text-gray-700">
              {title}
            </SheetTitle>
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
