"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  Sparkles,
  Send,
  Square,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bot,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authStorage } from "@/lib/auth-storage";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AiChatPanelProps {
  entityType: string;
  entityId: string;
  onActionComplete?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  isToolUse?: boolean;
  timestamp: Date;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const SUGGESTED_PROMPTS = [
  "Summarize this case",
  "What are the key risk factors?",
  "Suggest next steps",
  "Draft an investigation plan",
  "What similar cases exist?",
  "Help me write a closing summary",
];

/**
 * AiChatPanel - AI chat assistant for case analysis
 *
 * Connects to WebSocket /ai namespace for streaming chat responses.
 * Supports AI-executed actions that can modify case data.
 */
export function AiChatPanel({
  entityType,
  entityId,
  onActionComplete,
}: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isConnectedRef = useRef(false); // Prevents double connection in React StrictMode

  // Generate unique message IDs
  const generateId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch conversation history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // First, find the conversation for this entity
        const listResponse = await apiClient.get<{
          conversations: Array<{ id: string }>;
          total: number;
        }>("/ai/conversations", {
          params: {
            entityType,
            entityId,
            status: "ACTIVE",
            limit: 1,
          },
        });

        if (listResponse?.conversations?.[0]?.id) {
          const conversationId = listResponse.conversations[0].id;

          // Then fetch the conversation with messages
          const convResponse = await apiClient.get<{
            id: string;
            messages: Array<{
              id: string;
              role: "user" | "assistant";
              content: string;
              createdAt: string;
            }>;
          }>(`/ai/conversations/${conversationId}`, {
            params: { messageLimit: 50 },
          });

          if (convResponse?.messages && convResponse.messages.length > 0) {
            const historyMessages: ChatMessage[] = convResponse.messages.map(
              (msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.createdAt),
              }),
            );
            setMessages(historyMessages);
          }
        }
      } catch (err) {
        // Conversation history not available - not critical, start fresh
        console.debug("No conversation history available:", err);
      }
    };

    fetchHistory();
  }, [entityType, entityId]);

  // Connect to WebSocket on mount
  useEffect(() => {
    // Prevent double connection in React StrictMode
    if (isConnectedRef.current) {
      return;
    }

    const token = authStorage.getAccessToken();
    const user = authStorage.getUser<{
      id: string;
      organizationId: string;
      role: string;
      permissions?: string[];
    }>();

    if (!token || !user) {
      setError("Please log in to use AI assistant");
      setConnectionStatus("error");
      return;
    }

    setConnectionStatus("connecting");
    setError(null);
    isConnectedRef.current = true;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const socket = io(`${apiUrl}/ai`, {
      auth: {
        token,
        organizationId: user.organizationId,
        userId: user.id,
        userRole: user.role,
        permissions: user.permissions || [],
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setError(null);
    });

    socket.on("disconnect", (reason) => {
      setConnectionStatus("disconnected");
      if (reason === "io server disconnect") {
        // Server disconnected, might need to reconnect manually
        setError("Disconnected from AI service");
      }
    });

    socket.on("connect_error", (err) => {
      console.error("AI WebSocket connection error:", err);
      setConnectionStatus("error");
      setError("AI service unavailable. Please try again later.");
    });

    // Handle streaming text chunks
    socket.on("text_delta", (data: { text: string }) => {
      setMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (
          lastMessage &&
          lastMessage.role === "assistant" &&
          lastMessage.isStreaming
        ) {
          lastMessage.content += data.text;
        }
        return updated;
      });
    });

    // Handle message completion
    socket.on("message_complete", () => {
      setMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.isStreaming = false;
        }
        return updated;
      });
      setIsStreaming(false);
    });

    // Handle tool use indicators
    socket.on("tool_use", (data: { toolName: string; input?: unknown }) => {
      const toolMessage: ChatMessage = {
        id: generateId(),
        role: "system",
        content: `Using tool: ${data.toolName}`,
        isToolUse: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, toolMessage]);
    });

    // Handle action execution (refresh case data)
    socket.on(
      "action_executed",
      (data: { action: string; success: boolean }) => {
        if (data.success && onActionComplete) {
          onActionComplete();
        }
      },
    );

    // Handle errors
    socket.on("error", (data: { message: string }) => {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "system",
        content: `Error: ${data.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsStreaming(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    };
  }, [entityType, entityId, onActionComplete, generateId]);

  // Send a message
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming || connectionStatus !== "connected") {
        return;
      }

      const socket = socketRef.current;
      if (!socket) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      // Add empty assistant message for streaming
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      setIsStreaming(true);

      // Send to WebSocket
      socket.emit("chat", {
        message: text.trim(),
        entityType,
        entityId,
      });
    },
    [isStreaming, connectionStatus, entityType, entityId, generateId],
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("stop");
    }
    setIsStreaming(false);
    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        lastMessage.isStreaming = false;
      }
      return updated;
    });
  }, []);

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  // Retry connection
  const retryConnection = useCallback(() => {
    setError(null);
    setConnectionStatus("connecting");
    socketRef.current?.connect();
  }, []);

  // Handle suggested prompt click
  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      if (connectionStatus === "connected") {
        sendMessage(prompt);
      } else {
        setInput(prompt);
      }
    },
    [connectionStatus, sendMessage],
  );

  const isInputDisabled =
    isStreaming || connectionStatus !== "connected" || !input.trim();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h2 className="font-semibold text-gray-900">AI Assistant</h2>
        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant={connectionStatus === "connected" ? "default" : "secondary"}
            className={cn(
              "text-xs",
              connectionStatus === "connected" && "bg-green-100 text-green-700",
              connectionStatus === "connecting" &&
                "bg-yellow-100 text-yellow-700",
              connectionStatus === "error" && "bg-red-100 text-red-700",
            )}
          >
            {connectionStatus === "connected" && "Connected"}
            {connectionStatus === "connecting" && "Connecting..."}
            {connectionStatus === "disconnected" && "Disconnected"}
            {connectionStatus === "error" && "Error"}
          </Badge>
        </div>
      </div>

      {/* Error State */}
      {error && connectionStatus === "error" && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                AI Service Unavailable
              </p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={retryConnection}
                className="mt-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        {messages.length === 0 && connectionStatus === "connected" && (
          <div className="py-8 text-center">
            <Bot className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-6">
              Ask me anything about this case. I can help you analyze details,
              suggest next steps, or draft summaries.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Suggested prompts
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-gray-50 p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connectionStatus === "connected"
                ? "Ask a question... (Enter to send, Shift+Enter for newline)"
                : "Waiting for connection..."
            }
            disabled={connectionStatus !== "connected"}
            className="min-h-[60px] max-h-[150px] resize-none"
            rows={2}
          />
          <div className="flex flex-col gap-2">
            {isStreaming ? (
              <Button
                onClick={stopStreaming}
                variant="outline"
                size="icon"
                className="h-[60px] w-10"
                title="Stop generating"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => sendMessage(input)}
                disabled={isInputDisabled}
                size="icon"
                className="h-[60px] w-10"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {connectionStatus !== "connected" && connectionStatus !== "error" && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Connecting to AI service...
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Individual message bubble component
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.isToolUse) {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 text-xs text-gray-500 italic bg-gray-100 px-3 py-1.5 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
          {message.content}
        </p>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-100" : "bg-purple-100",
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-600" />
        ) : (
          <Bot className="w-4 h-4 text-purple-600" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] px-3 py-2 rounded-lg text-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-bl-sm",
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}
