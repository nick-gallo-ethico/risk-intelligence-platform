"use client";

/**
 * My Support Tickets Page
 *
 * Displays the current user's support tickets with filtering.
 * Features breadcrumb navigation and a link to submit new tickets.
 */

import Link from "next/link";
import { ChevronRight, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketList } from "@/components/help/ticket-list";

export default function TicketsPage() {
  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/help" className="hover:text-foreground transition-colors">
          Help & Support
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-foreground">My Tickets</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Ticket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              My Support Tickets
            </h1>
            <p className="text-sm text-muted-foreground">
              View and track your support requests
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href="/help/tickets/new">
            <Plus className="h-4 w-4 mr-2" />
            Submit New Ticket
          </Link>
        </Button>
      </div>

      {/* Ticket List */}
      <TicketList />
    </div>
  );
}
