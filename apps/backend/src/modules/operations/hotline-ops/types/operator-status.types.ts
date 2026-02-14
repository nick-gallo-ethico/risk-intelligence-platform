/**
 * Operator Status Types
 *
 * Types for tracking real-time operator status in the hotline operations module.
 * Used for skill-based routing and live operator status board.
 */

/**
 * Status states for hotline operators.
 * Used for real-time tracking and skill-based call routing.
 */
export enum OperatorStatus {
  /** Ready to take calls */
  AVAILABLE = "AVAILABLE",
  /** Currently on a call */
  ON_CALL = "ON_CALL",
  /** Taking a scheduled break */
  ON_BREAK = "ON_BREAK",
  /** Not available (end of shift, logged out) */
  OFFLINE = "OFFLINE",
}

/**
 * Operator status update payload stored in cache.
 * Includes operator ID, current status, language skills, and timestamp.
 */
export interface OperatorStatusUpdate {
  /** Internal user ID of the operator */
  operatorId: string;
  /** Current status */
  status: OperatorStatus;
  /** Languages operator can handle (ISO 639-1 codes) */
  languages?: string[];
  /** When status was last updated */
  updatedAt: Date;
}

/**
 * Operator performance metrics for dashboard display.
 * Aggregated from call records and real-time data.
 */
export interface OperatorMetrics {
  /** Internal user ID of the operator */
  operatorId: string;
  /** Display name of the operator */
  operatorName?: string;
  /** Number of calls handled today */
  callsToday: number;
  /** Average handle time in seconds */
  avgHandleTime: number;
  /** Current queue depth (calls waiting) */
  queueDepth: number;
}

/**
 * Status board summary for live dashboard display.
 * Shows counts by status and full operator list.
 */
export interface StatusBoardSummary {
  /** Count of operators available */
  available: number;
  /** Count of operators on calls */
  onCall: number;
  /** Count of operators on break */
  onBreak: number;
  /** Count of operators offline */
  offline: number;
  /** Full list of operator statuses */
  operators: OperatorStatusUpdate[];
}
