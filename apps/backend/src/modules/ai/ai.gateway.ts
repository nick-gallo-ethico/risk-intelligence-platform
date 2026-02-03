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
import { AgentRegistry } from "./agents/agent.registry";
import { ConversationService } from "./services/conversation.service";
import { SkillRegistry } from "./skills/skill.registry";
import { ActionExecutorService } from "./actions/action-executor.service";
import {
  ChatPayload,
  StopPayload,
  ConversationActionPayload,
  SkillExecutePayload,
  ActionExecutePayload,
  SocketContext,
} from "./dto/websocket.dto";

/**
 * AiGateway provides WebSocket connectivity for real-time AI streaming.
 *
 * Mounted at /ai namespace, this gateway handles:
 * - Streaming chat with agents
 * - Stop/pause/resume conversation control
 * - Real-time skill execution
 * - Real-time action execution
 *
 * Client connection requires auth handshake with:
 * - organizationId
 * - userId
 * - userRole
 * - permissions[]
 *
 * Events emitted to client:
 * - message_start: Streaming begins
 * - text_delta: Incremental text chunk
 * - tool_use: Agent invoked a tool
 * - message_complete: Streaming finished
 * - error: Error occurred
 * - stopped: Stream was stopped
 * - conversation_paused: Conversation paused
 * - conversation_resumed: Conversation resumed
 * - skill_result: Skill execution result
 * - action_result: Action execution result
 *
 * Usage (client-side):
 * ```javascript
 * const socket = io('/ai', {
 *   auth: {
 *     organizationId: 'org-123',
 *     userId: 'user-456',
 *     userRole: 'INVESTIGATOR',
 *     permissions: ['ai:skills:note-cleanup'],
 *   }
 * });
 *
 * socket.emit('chat', {
 *   message: 'Summarize this case',
 *   entityType: 'case',
 *   entityId: 'case-789',
 * });
 *
 * socket.on('text_delta', (event) => {
 *   console.log(event.text);
 * });
 * ```
 */
@WebSocketGateway({
  namespace: "/ai",
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AiGateway.name);

  /** Track active streams per client for stop functionality */
  private readonly activeStreams = new Map<string, boolean>();

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly conversationService: ConversationService,
    private readonly skillRegistry: SkillRegistry,
    private readonly actionExecutor: ActionExecutorService,
  ) {}

  /**
   * Handle new WebSocket connection.
   * Extracts auth context from handshake and validates.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const context = this.extractContext(client);
      if (!context) {
        this.logger.warn(`Connection rejected: missing auth context`);
        client.disconnect(true);
        return;
      }

      client.data.context = context;
      this.logger.debug(
        `Client connected: ${client.id} (org: ${context.organizationId}, user: ${context.userId})`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  /**
   * Handle WebSocket disconnection.
   * Cleans up active streams.
   */
  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.activeStreams.delete(client.id);
  }

  /**
   * Handle chat message from client.
   * Streams AI response back via text_delta events.
   */
  @SubscribeMessage("chat")
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatPayload,
  ): Promise<void> {
    const context: SocketContext = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    const { message, entityType, entityId, agentType } = payload;

    // Determine agent type based on entity or explicit type
    const resolvedAgentType =
      agentType ||
      this.agentRegistry.getAgentTypeForEntity(entityType || "") ||
      "compliance-manager";

    try {
      const agent = this.agentRegistry.getAgent(resolvedAgentType, {
        organizationId: context.organizationId,
        userId: context.userId,
        userRole: context.userRole,
        permissions: context.permissions,
        entityType,
        entityId,
      });

      // Initialize agent with context
      await agent.initialize({
        organizationId: context.organizationId,
        userId: context.userId,
        userRole: context.userRole,
        permissions: context.permissions,
        entityType,
        entityId,
      });

      // Get conversation ID for events
      const conversation = await this.conversationService.getOrCreate({
        organizationId: context.organizationId,
        userId: context.userId,
        entityType,
        entityId,
        agentType: resolvedAgentType,
      });

      const conversationId = conversation.id;

      // Mark stream as active
      this.activeStreams.set(client.id, true);

      // Emit start event
      client.emit("message_start", { conversationId });

      // Stream response from agent
      const stream = agent.chat(message, {
        organizationId: context.organizationId,
        userId: context.userId,
        userRole: context.userRole,
        permissions: context.permissions,
        entityType,
        entityId,
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
        } else if (event.type === "tool_use" && event.toolCall) {
          client.emit("tool_use", {
            conversationId,
            toolName: event.toolCall.name,
            input: event.toolCall.input,
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
      this.logger.error(`Chat error: ${(error as Error).message}`, (error as Error).stack);
      client.emit("error", {
        message: (error as Error).message || "Chat failed",
      });
    } finally {
      this.activeStreams.delete(client.id);
    }
  }

  /**
   * Handle stop request from client.
   * Terminates active stream.
   */
  @SubscribeMessage("stop")
  async handleStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StopPayload,
  ): Promise<void> {
    this.activeStreams.set(client.id, false);
    client.emit("stopped", { conversationId: payload.conversationId });
    this.logger.debug(`Stream stopped for conversation: ${payload.conversationId}`);
  }

  /**
   * Handle pause conversation request.
   * Pauses conversation for later resume.
   */
  @SubscribeMessage("pause")
  async handlePause(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ConversationActionPayload,
  ): Promise<void> {
    const context: SocketContext = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    try {
      await this.conversationService.pause(
        payload.conversationId,
        context.organizationId,
      );
      client.emit("conversation_paused", {
        conversationId: payload.conversationId,
      });
    } catch (error) {
      client.emit("error", { message: (error as Error).message });
    }
  }

  /**
   * Handle resume conversation request.
   * Resumes a paused conversation.
   */
  @SubscribeMessage("resume")
  async handleResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ConversationActionPayload,
  ): Promise<void> {
    const context: SocketContext = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    try {
      await this.conversationService.resume(
        payload.conversationId,
        context.organizationId,
      );
      client.emit("conversation_resumed", {
        conversationId: payload.conversationId,
      });
    } catch (error) {
      client.emit("error", { message: (error as Error).message });
    }
  }

  /**
   * Handle skill execution request.
   * Executes a skill and returns result.
   */
  @SubscribeMessage("skill_execute")
  async handleSkillExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SkillExecutePayload,
  ): Promise<void> {
    const context: SocketContext = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    try {
      const result = await this.skillRegistry.executeSkill(
        payload.skillId,
        payload.input,
        {
          organizationId: context.organizationId,
          userId: context.userId,
          entityType: payload.entityType,
          entityId: payload.entityId,
          permissions: context.permissions,
        },
      );

      client.emit("skill_result", {
        skillId: payload.skillId,
        result,
      });
    } catch (error) {
      client.emit("error", { message: (error as Error).message });
    }
  }

  /**
   * Handle action execution request.
   * Executes an action and returns result.
   */
  @SubscribeMessage("action_execute")
  async handleActionExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ActionExecutePayload,
  ): Promise<void> {
    const context: SocketContext = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    try {
      const result = await this.actionExecutor.execute(
        payload.actionId,
        payload.input,
        {
          organizationId: context.organizationId,
          userId: context.userId,
          userRole: context.userRole,
          permissions: context.permissions,
          entityType: payload.entityType,
          entityId: payload.entityId,
        },
        payload.skipPreview,
      );

      client.emit("action_result", {
        actionId: payload.actionId,
        result,
      });
    } catch (error) {
      client.emit("error", { message: (error as Error).message });
    }
  }

  /**
   * Extract authentication context from WebSocket handshake.
   * In production, this would verify a JWT token.
   *
   * @param client - Socket client
   * @returns SocketContext or null if invalid
   */
  private extractContext(client: Socket): SocketContext | null {
    const auth = client.handshake.auth;

    // Require organizationId and userId at minimum
    if (!auth?.organizationId || !auth?.userId) {
      return null;
    }

    return {
      organizationId: auth.organizationId,
      userId: auth.userId,
      userRole: auth.userRole || "EMPLOYEE",
      permissions: auth.permissions || [],
    };
  }
}
