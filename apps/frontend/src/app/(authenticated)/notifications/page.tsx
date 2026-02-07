"use client";

/**
 * Notifications Page
 *
 * Full notifications list with pagination, mark as read functionality,
 * and navigation to related entities.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  FileText,
  Search,
  Shield,
  User,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  url?: string;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

/**
 * Get icon based on notification category
 */
function getNotificationIcon(category: string) {
  switch (category) {
    case "ASSIGNMENT":
      return <FileText className="h-5 w-5" />;
    case "DEADLINE":
    case "SLA_WARNING":
    case "SLA_BREACH":
      return <Clock className="h-5 w-5" />;
    case "STATUS_CHANGE":
      return <Info className="h-5 w-5" />;
    case "COMMENT":
    case "MENTION":
      return <User className="h-5 w-5" />;
    case "APPROVAL":
      return <CheckCircle className="h-5 w-5" />;
    case "ESCALATION":
      return <AlertTriangle className="h-5 w-5" />;
    case "INVESTIGATION":
      return <Search className="h-5 w-5" />;
    case "SECURITY":
    case "COMPLIANCE":
      return <Shield className="h-5 w-5" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
}

/**
 * Get icon background color based on priority
 */
function getPriorityColor(priority: string) {
  switch (priority) {
    case "HIGH":
      return "bg-destructive/10 text-destructive";
    case "MEDIUM":
      return "bg-orange-500/10 text-orange-600";
    default:
      return "bg-primary/10 text-primary";
  }
}

/**
 * Loading skeleton for notification items
 */
function NotificationSkeleton() {
  return (
    <div className="p-4 border-b">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // Fetch notifications
  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", { page, limit: PAGE_SIZE }],
    queryFn: async (): Promise<NotificationsResponse> => {
      try {
        const response = await api.get("/notifications", {
          params: { page, limit: PAGE_SIZE },
        });
        // Handle various response shapes
        if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data;
        }
        // If it's a flat array, wrap it
        if (Array.isArray(response.data)) {
          return {
            data: response.data,
            total: response.data.length,
            page: 1,
            limit: PAGE_SIZE,
            totalPages: 1,
          };
        }
        return { data: [], total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 };
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        return { data: [], total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 };
      }
    },
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  /**
   * Handle notification click - mark as read and navigate
   */
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // Mark as read if unread
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id);
      }
      // Navigate to the entity if URL is provided
      if (notification.url) {
        router.push(notification.url);
      } else if (notification.entityType && notification.entityId) {
        // Fallback: construct URL from entity type and ID
        const entityPath = notification.entityType.toLowerCase() + "s";
        router.push(`/${entityPath}/${notification.entityId}`);
      }
    },
    [router, markAsReadMutation],
  );

  const notifications = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || Math.ceil(total / PAGE_SIZE);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Stay updated on cases, investigations, and tasks that need your
                attention.
              </p>
            </div>
            {hasUnread && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all as read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                // Loading state
                <>
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                  <NotificationSkeleton />
                </>
              ) : error ? (
                // Error state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-lg font-medium">
                    Failed to load notifications
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please try again later.
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No notifications</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You&apos;re all caught up! New notifications will appear
                    here.
                  </p>
                </div>
              ) : (
                // Notifications list
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                        !notification.isRead ? "bg-primary/5" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${getPriorityColor(
                            notification.priority,
                          )}`}
                        >
                          {getNotificationIcon(notification.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p
                              className={`text-sm truncate ${
                                !notification.isRead
                                  ? "font-semibold"
                                  : "font-medium"
                              }`}
                            >
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-sm line-clamp-2 ${
                              !notification.isRead
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              {
                                addSuffix: true,
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(page * PAGE_SIZE, total)} of {total} notifications
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
