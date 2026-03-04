import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { v4 as uuid } from "uuid";
import { AgentRegistry } from "./agents/agent.registry";
import { ConversationService } from "./services/conversation.service";
import {
  ConsentService,
  ConsentText,
} from "../chatbot/services/consent.service";
import { JwtKeyService } from "../auth/services/jwt-key.service";
import { PrismaService } from "../prisma/prisma.service";

// CORS_ORIGIN validation - must be set for WebSocket gateways
// SEC-02: No wildcard CORS fallback with credentials
const corsOriginChatbot = process.env.CORS_ORIGIN;
if (!corsOriginChatbot) {
  throw new Error(
    "CORS_ORIGIN environment variable is required for WebSocket gateway",
  );
}

/**
 * Chatbot-specific socket context.
 * Extends standard context with anonymous session support.
 */
interface ChatbotSocketContext {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  isAnonymous: boolean;
  sessionId: string;
  ipAddress?: string;
}

/**
 * Chat payload for chatbot messages.
 */
interface ChatbotChatPayload {
  message: string;
  sessionId?: string;
}

/**
 * Consent acceptance payload.
 */
interface AcceptConsentPayload {
  sessionId: string;
  consentVersion: string;
  consentTextShown: string;
}

/**
 * ChatbotGateway provides WebSocket connectivity for the employee chatbot.
 *
 * Supports two authentication modes:
 * 1. Anonymous (Ethics Portal): Tenant slug in query params, session-based tracking
 * 2. Authenticated (Employee Portal): JWT token, full user context
 *
 * Mounted at /chatbot namespace, separate from /ai to allow unauthenticated access.
 *
 * Events emitted to client:
 * - message_start: Streaming begins
 * - text_delta: Incremental text chunk
 * - message_complete: Streaming finished
 * - consent_required: User must accept consent before chatting
 * - consent_accepted: Consent was recorded successfully
 * - error: Error occurred
 * - stopped: Stream was stopped by client
 *
 * Client connection example (anonymous):
 * ```javascript
 * const socket = io('/chatbot', {
 *   query: { tenant: 'acme-corp' }
 * });
 * ```
 *
 * Client connection example (authenticated):
 * ```javascript
 * const socket = io('/chatbot', {
 *   auth: { token: 'jwt-token' }
 * });
 * ```
 */
@WebSocketGateway({
  namespace: "/chatbot",
  cors: {
    origin: corsOriginChatbot,
    credentials: true,
  },
})
export class ChatbotGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatbotGateway.name);

  /** Track active streams per client for stop functionality */
  private readonly activeStreams = new Map<string, boolean>();

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly conversationService: ConversationService,
    private readonly consentService: ConsentService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly jwtKeyService: JwtKeyService,
  ) {}

  /**
   * Handle new WebSocket connection.
   * Supports both anonymous (tenant slug) and authenticated (JWT) connections.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const context = await this.extractContext(client);
      if (!context) {
        this.logger.warn("Chatbot connection rejected: invalid context");
        client.disconnect(true);
        return;
      }

      client.data.context = context;
      this.logger.debug(
        `Chatbot connected: ${client.id} (org: ${context.organizationId}, anonymous: ${context.isAnonymous})`,
      );
    } catch (error) {
      this.logger.error(
        `Chatbot connection error: ${(error as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  /**
   * Handle WebSocket disconnection.
   * Cleans up active streams.
   */
  handleDisconnect(client: Socket): void {
    this.logger.debug(`Chatbot disconnected: ${client.id}`);
    this.activeStreams.delete(client.id);
  }

  /**
   * Handle chat message from client.
   * Streams AI response back via text_delta events.
   */
  @SubscribeMessage("chat")
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatbotChatPayload,
  ): Promise<void> {
    const context: ChatbotSocketContext = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not connected" });
      return;
    }

    // Check consent for anonymous users
    if (context.isAnonymous) {
      const consentCheck = await this.consentService.checkConsent(
        context.sessionId,
        context.organizationId,
      );

      if (!consentCheck.hasConsent) {
        const consentText: ConsentText = this.consentService.getConsentText(
          context.organizationId,
        );
        client.emit("consent_required", {
          sessionId: context.sessionId,
          consentText: consentText.text,
          consentVersion: consentText.version,
        });
        return;
      }
    }

    const { message } = payload;

    try {
      // Get chatbot agent
      const agent = this.agentRegistry.getAgent("employee-chatbot", {
        organizationId: context.organizationId,
        userId: context.userId,
        userRole: context.userRole,
        permissions: context.permissions,
        entityType: "chatbot",
        entityId: context.sessionId,
      });

      // Initialize agent
      await agent.initialize({
        organizationId: context.organizationId,
        userId: context.userId,
        userRole: context.userRole,
        permissions: context.permissions,
        entityType: "chatbot",
        entityId: context.sessionId,
      });

      // Get or create conversation
      const conversation = await this.conversationService.getOrCreate({
        organizationId: context.organizationId,
        userId: context.userId,
        entityType: "chatbot",
        entityId: context.sessionId,
        agentType: "employee-chatbot",
      });

      const conversationId = conversation.id;

      // Mark stream as active
      this.activeStreams.set(client.id, true);

      // Emit start event
      client.emit("message_start", {
        conversationId,
        sessionId: context.sessionId,
      });

      // Stream response from agent
      const stream = agent.chat(message, {
        organizationId: context.organizationId,
        userId: context.userId,
        userRole: context.userRole,
        permissions: context.permissions,
        entityType: "chatbot",
        entityId: context.sessionId,
      });

      for await (const event of stream) {
        // Check if stream was stopped
        if (!this.activeStreams.get(client.id)) {
          this.logger.debug(`Stream stopped by client: ${client.id}`);
          break;
        }

        if (event.type === "text_delta" && event.text) {
          client.emit("text_delta", {
            conversationId,
            text: event.text,
          });
        } else if (event.type === "error") {
          client.emit("error", {
            conversationId,
            message: event.error,
          });
        }
      }

      // Emit complete event if stream wasn't stopped
      if (this.activeStreams.get(client.id)) {
        client.emit("message_complete", { conversationId });
      }
    } catch (error) {
      this.logger.error(`Chatbot error: ${(error as Error).message}`);
      client.emit("error", {
        message: (error as Error).message || "Chat failed",
      });
    } finally {
      this.activeStreams.delete(client.id);
    }
  }

  /**
   * Handle consent acceptance from client.
   */
  @SubscribeMessage("accept_consent")
  async handleAcceptConsent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AcceptConsentPayload,
  ): Promise<void> {
    const context: ChatbotSocketContext = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not connected" });
      return;
    }

    try {
      await this.consentService.recordConsent(context.organizationId, {
        sessionId: payload.sessionId,
        consentType: "AI_USE",
        consentVersion: payload.consentVersion,
        consentTextShown: payload.consentTextShown,
        consentGiven: true,
        ipAddress: context.ipAddress,
        userAgent: client.handshake.headers["user-agent"] as string | undefined,
      });

      client.emit("consent_accepted", { sessionId: payload.sessionId });
    } catch (error) {
      this.logger.error(
        `Consent recording failed: ${(error as Error).message}`,
      );
      client.emit("error", { message: "Failed to record consent" });
    }
  }

  /**
   * Handle stop request from client.
   * Terminates active stream.
   */
  @SubscribeMessage("stop")
  async handleStop(@ConnectedSocket() client: Socket): Promise<void> {
    this.activeStreams.set(client.id, false);
    client.emit("stopped", {});
    this.logger.debug(`Stream stopped by client: ${client.id}`);
  }

  /**
   * Extract context from connection.
   * Supports both anonymous (tenant slug) and authenticated (JWT) modes.
   */
  private async extractContext(
    client: Socket,
  ): Promise<ChatbotSocketContext | null> {
    // First try JWT authentication (Employee Portal)
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace("Bearer ", "");

    if (token) {
      return this.extractAuthenticatedContext(client, token);
    }

    // Fall back to anonymous mode (Ethics Portal)
    const tenantSlug = client.handshake.query?.tenant as string;
    if (tenantSlug) {
      return this.extractAnonymousContext(client, tenantSlug);
    }

    this.logger.warn("No token or tenant slug provided");
    return null;
  }

  /**
   * Extract context from JWT token for authenticated users.
   */
  private async extractAuthenticatedContext(
    client: Socket,
    token: string,
  ): Promise<ChatbotSocketContext | null> {
    try {
      const verificationKey = this.jwtKeyService.getVerificationKey();
      const algorithm = this.jwtKeyService.getAlgorithm();

      const payload = await this.jwtService.verifyAsync(token, {
        secret: verificationKey,
        algorithms: [algorithm],
      });

      // Verify this is an access token (not a refresh token)
      if (payload.type && payload.type !== "access") {
        this.logger.warn("Chatbot connection rejected: not an access token");
        return null;
      }

      // Verify required claims exist
      if (!payload.organizationId || !payload.sub) {
        this.logger.warn(
          "Chatbot connection rejected: missing required JWT claims",
        );
        return null;
      }

      return {
        organizationId: payload.organizationId,
        userId: payload.sub,
        userRole: payload.role || "EMPLOYEE",
        permissions: this.getPermissionsForRole(payload.role || "EMPLOYEE"),
        isAnonymous: false,
        sessionId: `auth:${payload.sub}`,
        ipAddress: this.getClientIp(client),
      };
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Extract context from tenant slug for anonymous users.
   */
  private async extractAnonymousContext(
    client: Socket,
    tenantSlug: string,
  ): Promise<ChatbotSocketContext | null> {
    try {
      // Look up organization by slug
      const org = await this.prisma.organization.findFirst({
        where: { slug: tenantSlug },
        select: { id: true },
      });

      if (!org) {
        this.logger.warn(`Unknown tenant slug: ${tenantSlug}`);
        return null;
      }

      // Generate anonymous session ID
      const sessionId = uuid();

      return {
        organizationId: org.id,
        userId: `anonymous:${sessionId}`,
        userRole: "ANONYMOUS",
        permissions: [], // Anonymous users have no permissions
        isAnonymous: true,
        sessionId,
        ipAddress: this.getClientIp(client),
      };
    } catch (error) {
      this.logger.error(`Tenant lookup failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get client IP address from socket connection.
   * Handles proxied connections via X-Forwarded-For header.
   */
  private getClientIp(client: Socket): string {
    // Check X-Forwarded-For header (for proxied connections)
    const forwarded = client.handshake.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(
        ",",
      );
      return ips[0].trim();
    }

    // Fall back to direct connection address
    return client.handshake.address || "unknown";
  }

  /**
   * Get permissions for a role (chatbot has limited permissions).
   * Chatbot users only get chatbot-related permissions.
   */
  private getPermissionsForRole(role: string): string[] {
    // Chatbot users get minimal permissions for chatbot functionality
    switch (role) {
      case "SYSTEM_ADMIN":
      case "COMPLIANCE_OFFICER":
        return ["chatbot:use", "chatbot:status-check", "chatbot:escalate"];
      case "INVESTIGATOR":
      case "TRIAGE_LEAD":
        return ["chatbot:use", "chatbot:status-check"];
      default:
        return ["chatbot:use", "chatbot:status-check"];
    }
  }
}
