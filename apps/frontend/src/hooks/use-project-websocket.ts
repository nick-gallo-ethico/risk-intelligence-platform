"use client";

/**
 * useProjectWebSocket - Real-time project collaboration hook.
 *
 * Connects to the project WebSocket namespace and handles real-time updates
 * for task changes, user presence, and comments.
 *
 * Key features:
 * - Automatic connection/disconnection on projectId change
 * - React Query cache invalidation on events
 * - User presence tracking (who's viewing the project)
 * - Connection state management
 *
 * @example
 * ```tsx
 * const { isConnected, activeUsers, error } = useProjectWebSocket(projectId);
 *
 * return (
 *   <div>
 *     {isConnected ? 'Connected' : 'Connecting...'}
 *     <p>Active users: {activeUsers.length}</p>
 *   </div>
 * );
 * ```
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

/**
 * WebSocket connection state.
 */
export interface ProjectWebSocketState {
  /** Whether the WebSocket is connected */
  isConnected: boolean;
  /** Whether the connection is being established */
  isConnecting: boolean;
  /** Array of user IDs currently viewing the project */
  activeUsers: string[];
  /** Error message if connection failed */
  error: string | null;
}

/**
 * Events emitted by the WebSocket server.
 */
interface ServerEvents {
  "user-joined": { userId: string; projectId: string; timestamp: string };
  "user-left": { userId: string; projectId: string; timestamp: string };
  "room-users": { projectId: string; users: string[]; timestamp: string };
  "task-created": { task: Record<string, unknown>; timestamp: string };
  "task-updated": { task: Record<string, unknown>; timestamp: string };
  "task-deleted": { taskId: string; timestamp: string };
  "task-moved": {
    taskId: string;
    oldStatus: string;
    newStatus: string;
    timestamp: string;
  };
  "update-created": { update: Record<string, unknown>; timestamp: string };
  "group-created": { group: Record<string, unknown>; timestamp: string };
  "group-updated": { group: Record<string, unknown>; timestamp: string };
  "group-deleted": { groupId: string; timestamp: string };
  error: { message: string };
}

/**
 * Hook options.
 */
interface UseProjectWebSocketOptions {
  /** Whether to enable the WebSocket connection (default: true) */
  enabled?: boolean;
  /** Callback when a user joins the project */
  onUserJoined?: (userId: string) => void;
  /** Callback when a user leaves the project */
  onUserLeft?: (userId: string) => void;
  /** Callback when a task is created */
  onTaskCreated?: (task: Record<string, unknown>) => void;
  /** Callback when a task is updated */
  onTaskUpdated?: (task: Record<string, unknown>) => void;
  /** Callback when a task is deleted */
  onTaskDeleted?: (taskId: string) => void;
}

/**
 * Hook for managing WebSocket connection to a project room.
 *
 * @param projectId - The project ID to connect to (undefined disables connection)
 * @param options - Optional configuration and callbacks
 * @returns Connection state and active users
 */
export function useProjectWebSocket(
  projectId: string | undefined,
  options: UseProjectWebSocketOptions = {},
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const [state, setState] = useState<ProjectWebSocketState>({
    isConnected: false,
    isConnecting: false,
    activeUsers: [],
    error: null,
  });

  const {
    enabled = true,
    onUserJoined,
    onUserLeft,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
  } = options;

  // Create stable refs for callbacks to avoid reconnection on callback change
  const callbacksRef = useRef({
    onUserJoined,
    onUserLeft,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
  });
  callbacksRef.current = {
    onUserJoined,
    onUserLeft,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
  };

  // Invalidate queries helper
  const invalidateProjectQueries = useCallback(
    (queryKey: string[]) => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, ...queryKey],
        });
      }
    },
    [projectId, queryClient],
  );

  useEffect(() => {
    // Don't connect if disabled, no projectId, or no token
    if (!enabled || !projectId || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setState({
          isConnected: false,
          isConnecting: false,
          activeUsers: [],
          error: null,
        });
      }
      return;
    }

    // Set connecting state
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    // Determine WebSocket URL
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;

    // Create socket connection
    const socket = io(`${wsUrl}/projects`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Handle connection
    socket.on("connect", () => {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));

      // Join the project room
      socket.emit("join-project", projectId);
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: reason === "io server disconnect" ? false : true,
      }));
    });

    // Handle connection error
    socket.on("connect_error", (error) => {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message || "Connection failed",
      }));
    });

    // Handle server errors
    socket.on("error" as keyof ServerEvents, (data: { message: string }) => {
      setState((prev) => ({ ...prev, error: data.message }));
    });

    // Handle room users update
    socket.on(
      "room-users" as keyof ServerEvents,
      (data: ServerEvents["room-users"]) => {
        setState((prev) => ({ ...prev, activeUsers: data.users }));
      },
    );

    // Handle user joined
    socket.on(
      "user-joined" as keyof ServerEvents,
      (data: ServerEvents["user-joined"]) => {
        setState((prev) => ({
          ...prev,
          activeUsers: [...new Set([...prev.activeUsers, data.userId])],
        }));
        callbacksRef.current.onUserJoined?.(data.userId);
      },
    );

    // Handle user left
    socket.on(
      "user-left" as keyof ServerEvents,
      (data: ServerEvents["user-left"]) => {
        setState((prev) => ({
          ...prev,
          activeUsers: prev.activeUsers.filter((id) => id !== data.userId),
        }));
        callbacksRef.current.onUserLeft?.(data.userId);
      },
    );

    // Handle task events - invalidate React Query cache
    socket.on(
      "task-created" as keyof ServerEvents,
      (data: ServerEvents["task-created"]) => {
        invalidateProjectQueries(["tasks"]);
        callbacksRef.current.onTaskCreated?.(data.task);
      },
    );

    socket.on(
      "task-updated" as keyof ServerEvents,
      (data: ServerEvents["task-updated"]) => {
        invalidateProjectQueries(["tasks"]);
        callbacksRef.current.onTaskUpdated?.(data.task);
      },
    );

    socket.on(
      "task-deleted" as keyof ServerEvents,
      (data: ServerEvents["task-deleted"]) => {
        invalidateProjectQueries(["tasks"]);
        callbacksRef.current.onTaskDeleted?.(data.taskId);
      },
    );

    socket.on("task-moved" as keyof ServerEvents, () => {
      invalidateProjectQueries(["tasks"]);
    });

    // Handle update/comment events
    socket.on("update-created" as keyof ServerEvents, () => {
      invalidateProjectQueries(["updates"]);
    });

    // Handle group events
    socket.on("group-created" as keyof ServerEvents, () => {
      invalidateProjectQueries(["groups"]);
    });

    socket.on("group-updated" as keyof ServerEvents, () => {
      invalidateProjectQueries(["groups"]);
    });

    socket.on("group-deleted" as keyof ServerEvents, () => {
      invalidateProjectQueries(["groups"]);
      invalidateProjectQueries(["tasks"]); // Tasks may move when group is deleted
    });

    // Cleanup on unmount or projectId change
    return () => {
      if (socket.connected) {
        socket.emit("leave-project", projectId);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, accessToken, enabled, invalidateProjectQueries]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));
      socketRef.current.connect();
    }
  }, []);

  return {
    ...state,
    reconnect,
  };
}

export default useProjectWebSocket;
