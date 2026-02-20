"use client";

/**
 * TicketList Component
 *
 * Displays a list of the current user's support tickets with filtering.
 * Shows ticket number, subject, status badge, priority badge, and created date.
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2, Plus, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { helpApi, SupportTicket } from "@/services/help.service";

// ============================================================================
// Types
// ============================================================================

type StatusFilter = "ALL" | SupportTicket["status"];

// ============================================================================
// Constants
// ============================================================================

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_COLORS: Record<SupportTicket["status"], string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  WAITING_ON_CUSTOMER:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  RESOLVED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CLOSED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_ON_CUSTOMER: "Waiting on You",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PRIORITY_COLORS: Record<SupportTicket["priority"], string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300",
};

const PRIORITY_LABELS: Record<SupportTicket["priority"], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

// ============================================================================
// Component
// ============================================================================

export function TicketList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Fetch tickets
  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["help", "tickets", statusFilter],
    queryFn: () =>
      helpApi.getMyTickets(statusFilter === "ALL" ? undefined : statusFilter),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" />
        <span className="text-muted-foreground">Loading tickets...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive mb-4">Failed to load tickets</p>
        <Button asChild variant="outline">
          <Link href="/help">Back to Help Center</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(value) => setStatusFilter(value as StatusFilter)}
      >
        <TabsList>
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Empty State */}
      {(!tickets || tickets.length === 0) && (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-muted mb-4">
            <Ticket className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No tickets found</h3>
          <p className="text-muted-foreground mb-6">
            {statusFilter === "ALL"
              ? "You haven't submitted any tickets yet."
              : `No ${STATUS_LABELS[statusFilter as SupportTicket["status"]].toLowerCase()} tickets.`}
          </p>
          <Button asChild>
            <Link href="/help/tickets/new">
              <Plus className="h-4 w-4 mr-2" />
              Submit a Ticket
            </Link>
          </Button>
        </div>
      )}

      {/* Tickets Table */}
      {tickets && tickets.length > 0 && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Ticket #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[140px] text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                      {ticket.ticketNumber}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{ticket.subject}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[ticket.status]}
                    >
                      {STATUS_LABELS[ticket.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={PRIORITY_COLORS[ticket.priority]}
                    >
                      {PRIORITY_LABELS[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    <span title={format(new Date(ticket.createdAt), "PPpp")}>
                      {formatDistanceToNow(new Date(ticket.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
