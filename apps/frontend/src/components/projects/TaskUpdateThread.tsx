"use client";

/**
 * TaskUpdateThread Component
 *
 * Threaded conversation UI for task updates.
 * Monday.com-style "Updates Section" with @mentions, reactions, and replies.
 */

import React, { useState, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  ThumbsUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pin,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { MentionInput } from "./MentionInput";
import type { TaskUpdate, TaskReaction } from "@/types/project";
import {
  useTaskUpdates,
  useCreateTaskUpdate,
  useEditTaskUpdate,
  useDeleteTaskUpdate,
  useAddTaskUpdateReaction,
  useProjectMembers,
} from "@/hooks/use-project-detail";

interface TaskUpdateThreadProps {
  projectId: string;
  taskId: string;
  currentUserId?: string;
}

/**
 * TaskUpdateThread - Conversation thread for task updates.
 */
export function TaskUpdateThread({
  projectId,
  taskId,
  currentUserId,
}: TaskUpdateThreadProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set(),
  );

  // Fetch data
  const { data: updates, isLoading } = useTaskUpdates(projectId, taskId);
  const { data: members = [] } = useProjectMembers(projectId);

  // Mutations
  const createUpdate = useCreateTaskUpdate(projectId, taskId);
  const editUpdate = useEditTaskUpdate(projectId, taskId);
  const deleteUpdate = useDeleteTaskUpdate(projectId, taskId);
  const addReaction = useAddTaskUpdateReaction(projectId, taskId);

  // Handle new update submission
  const handleSubmit = useCallback(
    (content: string, mentionedUserIds: string[]) => {
      createUpdate.mutate({
        content,
        mentionedUserIds,
      });
    },
    [createUpdate],
  );

  // Handle reply submission
  const handleReply = useCallback(
    (parentId: string, content: string, mentionedUserIds: string[]) => {
      createUpdate.mutate(
        {
          content,
          mentionedUserIds,
          parentUpdateId: parentId,
        },
        {
          onSuccess: () => {
            setReplyingToId(null);
            setExpandedReplies((prev) => new Set(prev).add(parentId));
          },
        },
      );
    },
    [createUpdate],
  );

  // Handle edit save
  const handleEditSave = useCallback(
    (updateId: string) => {
      if (!editContent.trim()) return;
      editUpdate.mutate(
        { updateId, content: editContent },
        {
          onSuccess: () => {
            setEditingId(null);
            setEditContent("");
          },
        },
      );
    },
    [editUpdate, editContent],
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!deleteTargetId) return;
    deleteUpdate.mutate(deleteTargetId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
      },
    });
  }, [deleteUpdate, deleteTargetId]);

  // Handle reaction
  const handleReaction = useCallback(
    (updateId: string) => {
      addReaction.mutate({ updateId, emoji: "thumbsup" });
    },
    [addReaction],
  );

  // Toggle replies expansion
  const toggleReplies = useCallback((updateId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(updateId)) {
        next.delete(updateId);
      } else {
        next.add(updateId);
      }
      return next;
    });
  }, []);

  // Render a single update
  const renderUpdate = (
    update: TaskUpdate,
    isReply = false,
  ): React.ReactNode => {
    const isAuthor = currentUserId === update.authorId;
    const isEditing = editingId === update.id;
    const thumbsUpCount =
      update.reactions?.filter((r) => r.emoji === "thumbsup").length || 0;
    const hasReplies = update.replies && update.replies.length > 0;
    const repliesExpanded = expandedReplies.has(update.id);

    return (
      <div
        key={update.id}
        className={cn(
          "flex gap-3",
          isReply && "pl-8 border-l-2 border-gray-200",
        )}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {update.author?.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {update.author?.name || "Unknown"}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(update.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(update.createdAt), "PPpp")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {update.isPinned && (
              <Badge variant="outline" className="h-5 gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </Badge>
            )}
            {update.createdAt !== update.updatedAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded-md text-sm resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => handleEditSave(update.id)}
                  disabled={editUpdate.isPending}
                >
                  {editUpdate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {renderContentWithMentions(update.content)}
            </div>
          )}

          {/* Actions row */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-2">
              {/* Reaction button */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs",
                  thumbsUpCount > 0 && "bg-blue-50 text-blue-700",
                )}
                onClick={() => handleReaction(update.id)}
              >
                <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                {thumbsUpCount > 0 ? thumbsUpCount : "Like"}
              </Button>

              {/* Reply button (only for top-level updates) */}
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setReplyingToId(
                      replyingToId === update.id ? null : update.id,
                    )
                  }
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  Reply
                </Button>
              )}

              {/* Author actions menu */}
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingId(update.id);
                        setEditContent(update.content);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDeleteTargetId(update.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Replies section (only for top-level) */}
          {!isReply && hasReplies && (
            <div className="mt-3">
              <button
                onClick={() => toggleReplies(update.id)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                {repliesExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                {update.replies.length}{" "}
                {update.replies.length === 1 ? "reply" : "replies"}
              </button>

              {repliesExpanded && (
                <div className="mt-2 space-y-3">
                  {update.replies.map((reply) => renderUpdate(reply, true))}
                </div>
              )}
            </div>
          )}

          {/* Reply input (only for top-level) */}
          {!isReply && replyingToId === update.id && (
            <div className="mt-3 pl-8 border-l-2 border-blue-200">
              <MentionInput
                users={members}
                onSubmit={(content, mentionedUserIds) =>
                  handleReply(update.id, content, mentionedUserIds)
                }
                placeholder="Write a reply..."
                autoFocus
                isSubmitting={createUpdate.isPending}
                submitLabel="Reply"
                minHeight={60}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render content with @mentions highlighted
  const renderContentWithMentions = (content: string): React.ReactNode => {
    // Simple regex to find @mentions
    const mentionRegex = /@([A-Za-z]+\s[A-Za-z]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add mention span
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center px-1 py-0.5 rounded bg-blue-100 text-blue-800 text-sm font-medium"
        >
          @{match[1]}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Get top-level updates (no parentUpdateId)
  const topLevelUpdates = (updates || []).filter((u) => !u.parentUpdateId);

  return (
    <div className="flex flex-col h-full">
      {/* New update input at top */}
      <div className="p-4 border-b">
        <MentionInput
          users={members}
          onSubmit={handleSubmit}
          placeholder="Write an update... Use @ to mention someone"
          isSubmitting={createUpdate.isPending}
        />
      </div>

      {/* Updates list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {topLevelUpdates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No updates yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Start the conversation! Post an update to collaborate with your
                team.
              </p>
            </div>
          ) : (
            topLevelUpdates.map((update) => renderUpdate(update))
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this update? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUpdate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TaskUpdateThread;
