"use client";

/**
 * useChatbot - Hook for chatbot WebSocket connection and message handling.
 *
 * Connects to the /chatbot WebSocket namespace for real-time chat with the
 * Employee Chatbot. Supports both anonymous (tenant slug) and authenticated
 * (JWT token) connections.
 *
 * Key features:
 * - WebSocket connection to /chatbot namespace
 * - Anonymous mode via tenantSlug, authenticated mode via JWT token
 * - Consent flow handling for anonymous users
 * - Streaming response support via text_delta events
 * - Message state management
 *
 * @example
 * ```tsx
 * // Anonymous mode (Ethics Portal)
 * const { messages, send, isConnected, consentRequired, acceptConsent } =
 *   useChatbot({ tenantSlug: 'acme-corp' });
 *
 * // Authenticated mode (Employee Portal)
 * const { messages, send, isConnected } =
 *   useChatbot({ mode: 'authenticated' });
 * ```
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { config } from "@/config/env";
import { useAuth } from "@/contexts/auth-context";

/**
 * Chat message structure.
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Message sender: 'user' or 'assistant' */
  role: "user" | "assistant";
  /** Message content */
  content: string;
  /** Message timestamp */
  timestamp: Date;
  /** Whether message is currently streaming */
  isStreaming?: boolean;
}

/**
 * Hook connection options.
 */
export interface UseChatbotOptions {
  /** Connection mode: 'anonymous' uses tenantSlug, 'authenticated' uses JWT */
  mode?: "anonymous" | "authenticated";
  /** Tenant slug for anonymous connections (required for anonymous mode) */
  tenantSlug?: string;
  /** Whether to enable the connection (default: true) */
  enabled?: boolean;
  /** Callback when connection is established */
  onConnect?: () => void;
  /** Callback when connection is lost */
  onDisconnect?: () => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
}

/**
 * Hook return type.
 */
export interface UseChatbotReturn {
  /** List of chat messages */
  messages: ChatMessage[];
  /** Send a message to the chatbot */
  send: (message: string) => void;
  /** Accept consent for anonymous chat */
  acceptConsent: () => void;
  /** Stop the current streaming response */
  stop: () => void;
  /** Reset chat (clear messages and start fresh) */
  reset: () => void;
  /** Whether connected to WebSocket */
  isConnected: boolean;
  /** Whether currently streaming a response */
  isStreaming: boolean;
  /** Whether consent is required before chatting */
  consentRequired: boolean;
  /** Error message if any */
  error: string | null;
  /** Session ID assigned by server */
  sessionId: string | null;
}

/**
 * Server events emitted by the chatbot WebSocket gateway.
 */
interface ServerEvents {
  /** Session established with session ID */
  session: { sessionId: string };
  /** Consent required before chatting */
  consent_required: { message: string };
  /** Consent accepted, ready to chat */
  consent_accepted: { sessionId: string };
  /** Streaming text delta */
  text_delta: { delta: string; messageId: string };
  /** Streaming complete */
  stream_complete: { messageId: string };
  /** Error occurred */
  error: { message: string };
}

/**
 * Generate a unique ID for messages.
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing chatbot WebSocket connection and messages.
 *
 * @param options - Connection options
 * @returns Chat state and control functions
 */
export function useChatbot(options: UseChatbotOptions = {}): UseChatbotReturn {
  const {
    mode = "anonymous",
    tenantSlug,
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const { accessToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Track streaming message for accumulation
  const streamingMessageRef = useRef<{ id: string; content: string } | null>(
    null,
  );

  // Store callbacks in ref to prevent reconnection on callback change
  const callbacksRef = useRef({ onConnect, onDisconnect, onError });
  callbacksRef.current = { onConnect, onDisconnect, onError };

  // Connection effect
  useEffect(() => {
    // Validate connection requirements
    if (!enabled) {
      return;
    }

    if (mode === "anonymous" && !tenantSlug) {
      setError("Tenant slug is required for anonymous mode");
      return;
    }

    if (mode === "authenticated" && !accessToken) {
      // Wait for authentication
      return;
    }

    // Build connection options
    const socketOptions: Record<string, unknown> = {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    };

    if (mode === "anonymous") {
      socketOptions.query = { tenantSlug };
    } else {
      socketOptions.auth = { token: accessToken };
    }

    // Create socket connection
    const socket = io(`${config.wsUrl}/chatbot`, socketOptions);
    socketRef.current = socket;

    // Handle connection
    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      callbacksRef.current.onConnect?.();
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsStreaming(false);
      callbacksRef.current.onDisconnect?.();
    });

    // Handle connection error
    socket.on("connect_error", (err) => {
      setIsConnected(false);
      setError(err.message || "Connection failed");
      callbacksRef.current.onError?.(err.message || "Connection failed");
    });

    // Handle session established
    socket.on(
      "session" as keyof ServerEvents,
      (data: ServerEvents["session"]) => {
        setSessionId(data.sessionId);
      },
    );

    // Handle consent required
    socket.on("consent_required" as keyof ServerEvents, () => {
      setConsentRequired(true);
    });

    // Handle consent accepted
    socket.on(
      "consent_accepted" as keyof ServerEvents,
      (data: ServerEvents["consent_accepted"]) => {
        setConsentRequired(false);
        setSessionId(data.sessionId);
      },
    );

    // Handle streaming text delta
    socket.on(
      "text_delta" as keyof ServerEvents,
      (data: ServerEvents["text_delta"]) => {
        const { delta, messageId } = data;

        // If this is a new streaming message, create it
        if (
          !streamingMessageRef.current ||
          streamingMessageRef.current.id !== messageId
        ) {
          streamingMessageRef.current = { id: messageId, content: "" };
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              role: "assistant",
              content: "",
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);
          setIsStreaming(true);
        }

        // Accumulate content
        streamingMessageRef.current.content += delta;
        const newContent = streamingMessageRef.current.content;

        // Update message content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: newContent } : msg,
          ),
        );
      },
    );

    // Handle stream complete
    socket.on(
      "stream_complete" as keyof ServerEvents,
      (data: ServerEvents["stream_complete"]) => {
        const { messageId } = data;

        // Mark message as no longer streaming
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg,
          ),
        );

        streamingMessageRef.current = null;
        setIsStreaming(false);
      },
    );

    // Handle error
    socket.on("error" as keyof ServerEvents, (data: ServerEvents["error"]) => {
      setError(data.message);
      setIsStreaming(false);
      streamingMessageRef.current = null;
      callbacksRef.current.onError?.(data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mode, tenantSlug, accessToken, enabled]);

  /**
   * Send a message to the chatbot.
   */
  const send = useCallback(
    (message: string) => {
      if (!socketRef.current?.connected) {
        setError("Not connected to chatbot");
        return;
      }

      if (consentRequired) {
        setError("Consent required before sending messages");
        return;
      }

      if (!message.trim()) {
        return;
      }

      // Add user message to state
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: message.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to server
      socketRef.current.emit("chat", { message: message.trim() });
    },
    [consentRequired],
  );

  /**
   * Accept consent for anonymous chat.
   */
  const acceptConsent = useCallback(() => {
    if (!socketRef.current?.connected) {
      setError("Not connected to chatbot");
      return;
    }

    socketRef.current.emit("accept_consent");
  }, []);

  /**
   * Stop the current streaming response.
   */
  const stop = useCallback(() => {
    if (!socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit("stop");

    // Mark current streaming message as complete
    if (streamingMessageRef.current) {
      const messageId = streamingMessageRef.current.id;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isStreaming: false } : msg,
        ),
      );
      streamingMessageRef.current = null;
    }

    setIsStreaming(false);
  }, []);

  /**
   * Reset chat - clear messages and optionally reconnect.
   */
  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    streamingMessageRef.current = null;
    setIsStreaming(false);

    // Emit reset to server if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit("reset");
    }
  }, []);

  return {
    messages,
    send,
    acceptConsent,
    stop,
    reset,
    isConnected,
    isStreaming,
    consentRequired,
    error,
    sessionId,
  };
}

export default useChatbot;
