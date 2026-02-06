/**
 * OperatorStatusService - Real-Time Operator Status Tracking
 *
 * Tracks real-time operator status for the hotline operations dashboard.
 * Uses cache (Redis) for fast status updates and retrieval.
 *
 * Key features:
 * - Real-time status updates (AVAILABLE, ON_CALL, ON_BREAK, OFFLINE)
 * - Language skills for skill-based routing
 * - Live status board for supervisors
 *
 * Per CONTEXT.md:
 * - "Live operator status board" - available, on call, on break, offline in real-time
 * - "Skill-based language routing" - track operator languages for call routing
 */

import { Injectable, Logger, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import {
  OperatorStatus,
  OperatorStatusUpdate,
  StatusBoardSummary,
} from "./types/operator-status.types";

/** Cache key for all operator statuses */
const OPERATOR_STATUS_KEY = "hotline:operator_status";

/** TTL for status entries (5 minutes) - refreshed on each update */
const STATUS_TTL_MS = 300 * 1000;

@Injectable()
export class OperatorStatusService {
  private readonly logger = new Logger(OperatorStatusService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Update operator status.
   * Stores status in cache with operator's language skills.
   *
   * @param operatorId - Internal user ID of the operator
   * @param status - New status
   * @param languages - Languages operator can handle (ISO 639-1 codes)
   */
  async updateStatus(
    operatorId: string,
    status: OperatorStatus,
    languages?: string[],
  ): Promise<void> {
    const allStatuses = await this.getAllStatuses();

    allStatuses[operatorId] = {
      operatorId,
      status,
      languages,
      updatedAt: new Date(),
    };

    await this.cache.set(OPERATOR_STATUS_KEY, allStatuses, STATUS_TTL_MS);
    this.logger.debug(`Operator ${operatorId} status updated to ${status}`);
  }

  /**
   * Get all operator statuses from cache.
   *
   * @returns Map of operator ID to status update
   */
  async getAllStatuses(): Promise<Record<string, OperatorStatusUpdate>> {
    const statuses =
      await this.cache.get<Record<string, OperatorStatusUpdate>>(
        OPERATOR_STATUS_KEY,
      );
    return statuses || {};
  }

  /**
   * Get live operator status board for dashboard display.
   * Returns counts by status and full operator list.
   *
   * @returns Status board summary
   */
  async getStatusBoard(): Promise<StatusBoardSummary> {
    const statuses = await this.getAllStatuses();
    const operators = Object.values(statuses);

    // Clean up stale entries (older than TTL)
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STATUS_TTL_MS);
    const activeOperators = operators.filter(
      (o) => new Date(o.updatedAt) > staleThreshold,
    );

    return {
      available: activeOperators.filter(
        (o) => o.status === OperatorStatus.AVAILABLE,
      ).length,
      onCall: activeOperators.filter((o) => o.status === OperatorStatus.ON_CALL)
        .length,
      onBreak: activeOperators.filter(
        (o) => o.status === OperatorStatus.ON_BREAK,
      ).length,
      offline: activeOperators.filter(
        (o) => o.status === OperatorStatus.OFFLINE,
      ).length,
      operators: activeOperators,
    };
  }

  /**
   * Get operators by language for skill-based routing.
   * Returns only available operators who can handle the specified language.
   *
   * @param language - ISO 639-1 language code
   * @returns List of available operators with the language skill
   */
  async getOperatorsByLanguage(
    language: string,
  ): Promise<OperatorStatusUpdate[]> {
    const statuses = await this.getAllStatuses();
    return Object.values(statuses).filter(
      (o) =>
        o.status === OperatorStatus.AVAILABLE &&
        o.languages?.includes(language),
    );
  }

  /**
   * Get available operators for call routing.
   *
   * @returns List of currently available operators
   */
  async getAvailableOperators(): Promise<OperatorStatusUpdate[]> {
    const statuses = await this.getAllStatuses();
    return Object.values(statuses).filter(
      (o) => o.status === OperatorStatus.AVAILABLE,
    );
  }

  /**
   * Get a single operator's status.
   *
   * @param operatorId - Internal user ID
   * @returns Operator status or null if not found
   */
  async getOperatorStatus(
    operatorId: string,
  ): Promise<OperatorStatusUpdate | null> {
    const statuses = await this.getAllStatuses();
    return statuses[operatorId] || null;
  }

  /**
   * Remove operator from status board (e.g., on logout).
   *
   * @param operatorId - Internal user ID
   */
  async removeOperator(operatorId: string): Promise<void> {
    const allStatuses = await this.getAllStatuses();
    delete allStatuses[operatorId];
    await this.cache.set(OPERATOR_STATUS_KEY, allStatuses, STATUS_TTL_MS);
    this.logger.debug(`Operator ${operatorId} removed from status board`);
  }

  /**
   * Set operator to offline status (convenience method).
   *
   * @param operatorId - Internal user ID
   */
  async setOffline(operatorId: string): Promise<void> {
    await this.updateStatus(operatorId, OperatorStatus.OFFLINE);
  }

  /**
   * Set operator to on-call status (when taking a call).
   *
   * @param operatorId - Internal user ID
   */
  async setOnCall(operatorId: string): Promise<void> {
    await this.updateStatus(operatorId, OperatorStatus.ON_CALL);
  }

  /**
   * Set operator to available status (when ready for calls).
   *
   * @param operatorId - Internal user ID
   * @param languages - Languages operator can handle
   */
  async setAvailable(operatorId: string, languages?: string[]): Promise<void> {
    await this.updateStatus(operatorId, OperatorStatus.AVAILABLE, languages);
  }
}
