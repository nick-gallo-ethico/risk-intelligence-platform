'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ReportStatus,
  ReporterMessage,
  StatusCheckResponse,
  AccessCodeValidation,
  RateLimitError,
  SendMessageRequest,
} from '@/types/ethics-portal.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Auto-refresh interval for status (60 seconds) */
const STATUS_REFRESH_INTERVAL = 60000;
/** Auto-refresh interval for messages (30 seconds) */
const MESSAGE_REFRESH_INTERVAL = 30000;

export interface UseReportStatusReturn {
  /** Current report status */
  status: ReportStatus | null;
  /** Message thread */
  messages: ReporterMessage[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the user is locked out due to rate limiting */
  isLocked: boolean;
  /** Seconds remaining in lockout */
  lockoutRemaining: number;
  /** Check status for an access code */
  checkStatus: (accessCode: string) => Promise<boolean>;
  /** Send a message */
  sendMessage: (content: string, attachmentIds?: string[]) => Promise<boolean>;
  /** Mark messages as read */
  markMessagesRead: () => Promise<void>;
  /** Refresh messages only (for polling) */
  refreshMessages: () => Promise<void>;
  /** Clear state (on logout/code change) */
  clear: () => void;
}

/**
 * Hook for managing report status and messaging.
 *
 * Features:
 * - Fetch status by access code
 * - Handle rate limiting (429) with lockout timer
 * - Auto-refresh status when page is visible
 * - Two-way message management
 * - Mark messages as read
 */
export function useReportStatus(): UseReportStatusReturn {
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [messages, setMessages] = useState<ReporterMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Store access code for refresh operations
  const accessCodeRef = useRef<string | null>(null);
  // Interval refs for auto-refresh
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lockoutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Lockout countdown effect
  useEffect(() => {
    if (lockoutRemaining > 0) {
      lockoutIntervalRef.current = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (lockoutIntervalRef.current) {
          clearInterval(lockoutIntervalRef.current);
        }
      };
    }
  }, [lockoutRemaining]);

  // Handle rate limit error
  const handleRateLimitError = useCallback((retryAfterSeconds: number) => {
    setIsLocked(true);
    setLockoutRemaining(retryAfterSeconds);
    setError(`Too many attempts. Please try again in ${retryAfterSeconds} seconds.`);
  }, []);

  // Fetch status (internal - no side effects like starting intervals)
  const fetchStatusInternal = useCallback(async (
    accessCode: string,
    showLoading = true
  ): Promise<StatusCheckResponse | null> => {
    if (showLoading) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/public/access/${encodeURIComponent(accessCode)}/status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 429) {
        // Rate limited
        const data = (await response.json()) as RateLimitError;
        handleRateLimitError(data.retryAfterSeconds || 900); // Default to 15 min
        return null;
      }

      if (response.status === 404) {
        setError('Invalid access code. Please check and try again.');
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        setError(errorData.message || 'Failed to check status');
        return null;
      }

      const data = (await response.json()) as StatusCheckResponse;
      setStatus(data.status);
      setMessages(data.messages || []);
      return data;
    } catch (err) {
      console.error('Failed to check status:', err);
      setError('Network error. Please check your connection and try again.');
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [handleRateLimitError]);

  // Check status for an access code (public API - starts intervals)
  const checkStatus = useCallback(async (accessCode: string): Promise<boolean> => {
    if (isLocked) {
      return false;
    }

    const result = await fetchStatusInternal(accessCode, true);
    if (result) {
      accessCodeRef.current = accessCode;
      return true;
    }
    return false;
  }, [isLocked, fetchStatusInternal]);

  // Refresh messages only (internal implementation) - defined before sendMessage uses it
  const refreshMessagesInternal = useCallback(async () => {
    const accessCode = accessCodeRef.current;
    if (!accessCode) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/public/access/${encodeURIComponent(accessCode)}/messages`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = (await response.json()) as { messages: ReporterMessage[] };
        setMessages(data.messages || []);

        // Update unread count in status
        const newUnreadCount = (data.messages || []).filter(
          (m) => m.direction === 'inbound' && !m.readAt
        ).length;

        setStatus((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            hasUnreadMessages: newUnreadCount > 0,
            unreadCount: newUnreadCount,
          };
        });
      }
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
  }, []);

  // Public API for refreshing messages
  const refreshMessages = useCallback(async () => {
    await refreshMessagesInternal();
  }, [refreshMessagesInternal]);

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    attachmentIds?: string[]
  ): Promise<boolean> => {
    const accessCode = accessCodeRef.current;
    if (!accessCode || !status?.canMessage) {
      return false;
    }

    setIsLoading(true);

    try {
      const body: SendMessageRequest = {
        content,
        attachmentIds,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/v1/public/access/${encodeURIComponent(accessCode)}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (response.status === 429) {
        const data = (await response.json()) as RateLimitError;
        handleRateLimitError(data.retryAfterSeconds || 60);
        return false;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        setError(errorData.message || 'Failed to send message');
        return false;
      }

      // Refresh messages to get the sent message
      await refreshMessagesInternal();
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [status?.canMessage, handleRateLimitError, refreshMessagesInternal]);

  // Mark messages as read
  const markMessagesRead = useCallback(async () => {
    const accessCode = accessCodeRef.current;
    if (!accessCode) {
      return;
    }

    try {
      await fetch(
        `${API_BASE_URL}/api/v1/public/access/${encodeURIComponent(accessCode)}/messages/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Update local state
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          readAt: m.direction === 'inbound' && !m.readAt ? new Date().toISOString() : m.readAt,
        }))
      );

      setStatus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hasUnreadMessages: false,
          unreadCount: 0,
        };
      });
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, []);

  // Set up auto-refresh intervals when accessCode changes
  useEffect(() => {
    const accessCode = accessCodeRef.current;
    if (!accessCode || !status) {
      return;
    }

    // Clear existing intervals
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
    }
    if (messageIntervalRef.current) {
      clearInterval(messageIntervalRef.current);
    }

    // Only refresh when page is visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && accessCodeRef.current) {
        // Refresh immediately on becoming visible
        fetchStatusInternal(accessCodeRef.current, false);
      }
    };

    // Status refresh (every 60 seconds)
    statusIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && accessCodeRef.current) {
        fetchStatusInternal(accessCodeRef.current, false);
      }
    }, STATUS_REFRESH_INTERVAL);

    // Message refresh (every 30 seconds)
    messageIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshMessagesInternal();
      }
    }, MESSAGE_REFRESH_INTERVAL);

    // Add visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [status, fetchStatusInternal, refreshMessagesInternal]);

  // Clear state
  const clear = useCallback(() => {
    setStatus(null);
    setMessages([]);
    setError(null);
    accessCodeRef.current = null;

    // Clear intervals
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    if (messageIntervalRef.current) {
      clearInterval(messageIntervalRef.current);
      messageIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
      if (lockoutIntervalRef.current) {
        clearInterval(lockoutIntervalRef.current);
      }
    };
  }, []);

  return {
    status,
    messages,
    isLoading,
    error,
    isLocked,
    lockoutRemaining,
    checkStatus,
    sendMessage,
    markMessagesRead,
    refreshMessages,
    clear,
  };
}
