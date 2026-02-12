"use client";

/**
 * TaskSubscriberList Component
 *
 * Watchers/subscribers management for tasks.
 * Monday.com's subscriber system - controls who gets notified about task changes.
 */

import React, { useState, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  Plus,
  X,
  Search,
  Users,
  Bot,
  Loader2,
} from "lucide-react";
import type { TaskSubscriber } from "@/types/project";
import {
  useTaskSubscribers,
  useSubscribeToTask,
  useUnsubscribeFromTask,
  useProjectMembers,
} from "@/hooks/use-project-detail";

interface TaskSubscriberListProps {
  projectId: string;
  taskId: string;
  currentUserId?: string;
  compact?: boolean;
}

/**
 * TaskSubscriberList - Watchers/subscribers management for tasks.
 */
export function TaskSubscriberList({
  projectId,
  taskId,
  currentUserId,
  compact = false,
}: TaskSubscriberListProps) {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch subscribers and members
  const { data: subscribers, isLoading } = useTaskSubscribers(
    projectId,
    taskId,
  );
  const { data: members = [] } = useProjectMembers(projectId);

  // Mutations
  const subscribe = useSubscribeToTask(projectId, taskId);
  const unsubscribe = useUnsubscribeFromTask(projectId, taskId);

  // Check if current user is subscribed
  const currentUserSubscription = subscribers?.find(
    (s) => s.userId === currentUserId,
  );
  const isCurrentUserSubscribed = !!currentUserSubscription;

  // Filter members for add popover (exclude already subscribed)
  const subscriberUserIds = new Set(subscribers?.map((s) => s.userId) || []);
  const availableMembers = members.filter(
    (m) =>
      !subscriberUserIds.has(m.id) &&
      (searchQuery === "" ||
        `${m.firstName} ${m.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Handle subscribe
  const handleSubscribe = useCallback(
    (userId: string) => {
      subscribe.mutate(userId, {
        onSuccess: () => {
          setSearchQuery("");
          setAddPopoverOpen(false);
        },
      });
    },
    [subscribe],
  );

  // Handle unsubscribe
  const handleUnsubscribe = useCallback(
    (subscriberId: string) => {
      unsubscribe.mutate(subscriberId);
    },
    [unsubscribe],
  );

  // Handle self-subscribe toggle
  const handleSelfSubscribeToggle = useCallback(() => {
    if (isCurrentUserSubscribed && currentUserSubscription) {
      unsubscribe.mutate(currentUserSubscription.id);
    } else if (currentUserId) {
      subscribe.mutate(currentUserId);
    }
  }, [
    isCurrentUserSubscribed,
    currentUserSubscription,
    currentUserId,
    subscribe,
    unsubscribe,
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    );
  }

  // Compact mode - just avatar stack
  if (compact) {
    const displayCount = 4;
    const displaySubscribers = subscribers?.slice(0, displayCount) || [];
    const remainingCount = (subscribers?.length || 0) - displayCount;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center -space-x-2 hover:opacity-80 transition-opacity">
            {displaySubscribers.length === 0 ? (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4" />
                <span>No watchers</span>
              </div>
            ) : (
              <>
                {displaySubscribers.map((sub) => (
                  <Avatar
                    key={sub.id}
                    className="h-7 w-7 border-2 border-white"
                  >
                    <AvatarFallback className="text-[10px]">
                      {sub.user?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {remainingCount > 0 && (
                  <div className="h-7 w-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                    +{remainingCount}
                  </div>
                )}
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <TaskSubscriberList
            projectId={projectId}
            taskId={taskId}
            currentUserId={currentUserId}
            compact={false}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {subscribers?.length || 0} watching
          </span>
        </div>

        {/* Add subscriber button */}
        <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="max-h-48">
              <div className="p-1">
                {availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery
                      ? "No members found"
                      : "All members are already subscribed"}
                  </p>
                ) : (
                  availableMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSubscribe(member.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-left"
                      disabled={subscribe.isPending}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {member.firstName.charAt(0)}
                          {member.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {member.firstName} {member.lastName}
                        </div>
                        {member.role && (
                          <div className="text-xs text-muted-foreground truncate">
                            {member.role}
                          </div>
                        )}
                      </div>
                      {subscribe.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Self-subscribe toggle */}
      {currentUserId && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 mx-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Watch this task</span>
          </div>
          <Switch
            checked={isCurrentUserSubscribed}
            onCheckedChange={handleSelfSubscribeToggle}
            disabled={subscribe.isPending || unsubscribe.isPending}
          />
        </div>
      )}

      {/* Subscriber list */}
      <ScrollArea className="max-h-64">
        <div className="px-4 pb-4 space-y-2">
          {!subscribers || subscribers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Users className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-muted-foreground">
                No one is watching this task yet
              </p>
            </div>
          ) : (
            subscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {subscriber.user?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {subscriber.user?.name || "Unknown"}
                    </span>
                    {subscriber.isAutoSubscribed && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="h-5 text-[10px] px-1.5"
                            >
                              <Bot className="h-3 w-3 mr-0.5" />
                              Auto
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Auto-subscribed (assignee or creator)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {subscriber.userId === currentUserId && (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        You
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {subscriber.user?.email || ""}
                  </span>
                </div>

                {/* Remove button (not for auto-subscribed users) */}
                {!subscriber.isAutoSubscribed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleUnsubscribe(subscriber.id)}
                    disabled={unsubscribe.isPending}
                  >
                    {unsubscribe.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default TaskSubscriberList;
