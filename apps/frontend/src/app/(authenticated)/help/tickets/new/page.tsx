"use client";

/**
 * Submit Support Ticket Page
 *
 * Page for users to submit a new support ticket.
 * Features breadcrumb navigation and the TicketForm component.
 */

import Link from "next/link";
import { ChevronRight, Ticket } from "lucide-react";
import { TicketForm } from "@/components/help/ticket-form";

export default function NewTicketPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/help" className="hover:text-foreground transition-colors">
          Help & Support
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link
          href="/help/tickets"
          className="hover:text-foreground transition-colors"
        >
          My Tickets
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-foreground">Submit a Ticket</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Ticket className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Submit a Support Ticket
          </h1>
        </div>
        <p className="text-muted-foreground">
          Our team will review your request and respond as soon as possible.
        </p>
      </div>

      {/* Form */}
      <TicketForm />
    </div>
  );
}
