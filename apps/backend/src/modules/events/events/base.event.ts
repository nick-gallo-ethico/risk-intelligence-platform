/**
 * Actor types for event sources.
 */
export type ActorType = "USER" | "SYSTEM" | "AI" | "INTEGRATION" | "ANONYMOUS";

/**
 * Base event class with common fields required by all domain events.
 *
 * All events MUST include organizationId for tenant isolation.
 * Events are immutable once created - store all context at emission time.
 *
 * @example
 * class CaseCreatedEvent extends BaseEvent {
 *   static readonly eventName = 'case.created';
 *   readonly caseId: string;
 *   readonly referenceNumber: string;
 *
 *   constructor(data: Partial<CaseCreatedEvent>) {
 *     super(data);
 *     this.caseId = data.caseId!;
 *     this.referenceNumber = data.referenceNumber!;
 *   }
 * }
 */
export abstract class BaseEvent {
  /**
   * Organization ID for tenant isolation.
   * CRITICAL: Every event MUST have this set.
   */
  readonly organizationId: string;

  /**
   * User who triggered the event.
   * Null for system-generated or anonymous events.
   */
  readonly actorUserId: string | null;

  /**
   * Type of actor that triggered the event.
   * USER = human user action
   * SYSTEM = automated system process (scheduled tasks, triggers)
   * AI = AI-initiated action
   * INTEGRATION = external system via API
   * ANONYMOUS = anonymous reporter action
   */
  readonly actorType: ActorType;

  /**
   * Timestamp when the event occurred.
   * Defaults to now if not provided.
   */
  readonly timestamp: Date;

  /**
   * Correlation ID for request tracing.
   * Links related events across services.
   */
  readonly correlationId?: string;

  constructor(data: Partial<BaseEvent>) {
    if (!data.organizationId) {
      throw new Error("BaseEvent requires organizationId for tenant isolation");
    }

    this.organizationId = data.organizationId;
    this.actorUserId = data.actorUserId ?? null;
    this.actorType = data.actorType ?? "SYSTEM";
    this.timestamp = data.timestamp ?? new Date();
    this.correlationId = data.correlationId;
  }
}
