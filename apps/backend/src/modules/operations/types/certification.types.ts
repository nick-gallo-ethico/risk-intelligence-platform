/**
 * Certification System Types
 *
 * Per CONTEXT.md:
 * - Modular: Platform Fundamentals required, specialty tracks optional
 * - Short courses + quizzes
 * - 80% to pass
 * - PDF certificates
 * - Expiration tracking for major versions
 */

/**
 * CertificationLevel defines the difficulty/progression level of a certification track.
 * FOUNDATION is required for all users before accessing specialty tracks.
 */
export const CertificationLevel = {
  /** Platform Fundamentals (required for all) */
  FOUNDATION: 'FOUNDATION',
  /** Intermediate knowledge tracks */
  INTERMEDIATE: 'INTERMEDIATE',
  /** Advanced/specialized tracks */
  ADVANCED: 'ADVANCED',
} as const;

export type CertificationLevel =
  (typeof CertificationLevel)[keyof typeof CertificationLevel];

/**
 * TrackType defines the specific certification track categories.
 * PLATFORM_FUNDAMENTALS is required; all others are optional specialty tracks.
 */
export const TrackType = {
  /** Required for all - platform basics */
  PLATFORM_FUNDAMENTALS: 'PLATFORM_FUNDAMENTALS',
  /** Case management and investigations */
  CASE_MANAGEMENT: 'CASE_MANAGEMENT',
  /** Campaigns and disclosures module */
  CAMPAIGNS_DISCLOSURES: 'CAMPAIGNS_DISCLOSURES',
  /** Policy lifecycle management */
  POLICY_MANAGEMENT: 'POLICY_MANAGEMENT',
  /** Analytics and reporting */
  ANALYTICS_REPORTING: 'ANALYTICS_REPORTING',
  /** System administration and configuration */
  ADMIN_CONFIGURATION: 'ADMIN_CONFIGURATION',
} as const;

export type TrackType = (typeof TrackType)[keyof typeof TrackType];

/**
 * CourseType defines the content format of a course.
 */
export const CourseType = {
  /** Video-based learning content */
  VIDEO: 'VIDEO',
  /** Text/document-based learning content */
  TEXT: 'TEXT',
  /** Interactive exercises or simulations */
  INTERACTIVE: 'INTERACTIVE',
} as const;

export type CourseType = (typeof CourseType)[keyof typeof CourseType];

/**
 * QuizStatus tracks the state of a quiz attempt.
 */
export const QuizStatus = {
  /** Quiz not yet started */
  NOT_STARTED: 'NOT_STARTED',
  /** Quiz started but not completed */
  IN_PROGRESS: 'IN_PROGRESS',
  /** Quiz completed with passing score */
  PASSED: 'PASSED',
  /** Quiz completed but did not meet passing threshold */
  FAILED: 'FAILED',
} as const;

export type QuizStatus = (typeof QuizStatus)[keyof typeof QuizStatus];

/**
 * CertificateStatus tracks the lifecycle of an issued certificate.
 */
export const CertificateStatus = {
  /** Certificate is valid and active */
  ACTIVE: 'ACTIVE',
  /** Certificate has expired (major version update) */
  EXPIRED: 'EXPIRED',
  /** Certificate has been revoked */
  REVOKED: 'REVOKED',
} as const;

export type CertificateStatus =
  (typeof CertificateStatus)[keyof typeof CertificateStatus];

/**
 * QuestionType defines the format of quiz questions.
 */
export const QuestionType = {
  /** Single correct answer selection */
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  /** True or false answer */
  TRUE_FALSE: 'TRUE_FALSE',
  /** Multiple correct answers allowed */
  MULTI_SELECT: 'MULTI_SELECT',
} as const;

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

/**
 * Pass threshold per CONTEXT.md - 80% required to pass.
 */
export const QUIZ_PASS_THRESHOLD = 0.8;

/**
 * QuizQuestion structure for questions stored in Quiz.questions JSON.
 */
export interface QuizQuestion {
  /** Unique identifier for the question */
  id: string;
  /** Question text */
  question: string;
  /** Question type (multiple choice, true/false, multi-select) */
  type: QuestionType;
  /** Available answer options */
  options: QuizOption[];
  /** IDs of correct options (supports multi-select) */
  correctOptionIds: string[];
  /** Optional explanation shown after answering */
  explanation?: string;
}

/**
 * QuizOption represents an answer choice for a quiz question.
 */
export interface QuizOption {
  /** Unique identifier for the option */
  id: string;
  /** Option text */
  text: string;
}

/**
 * QuizAnswers structure for storing user's answers in QuizAttempt.answers JSON.
 */
export interface QuizAnswers {
  [questionId: string]: string[]; // Array of selected option IDs
}

/**
 * CertificateData for PDF generation.
 */
export interface CertificateData {
  /** Name of the certificate recipient */
  recipientName: string;
  /** Name of the certification track */
  trackName: string;
  /** Date the certification was completed */
  completedDate: Date;
  /** Expiration date (if applicable) */
  expiresDate?: Date;
  /** Unique certificate identifier */
  certificateId: string;
  /** Human-readable certificate number (CERT-YYYY-NNNNN) */
  certificateNumber: string;
  /** Organization name (for client certifications) */
  organizationName?: string;
}

/**
 * TrackProgress summarizes a user's progress in a certification track.
 */
export interface TrackProgress {
  /** Track ID */
  trackId: string;
  /** Track name */
  trackName: string;
  /** Track type */
  trackType: TrackType;
  /** Total courses in the track */
  totalCourses: number;
  /** Courses completed */
  completedCourses: number;
  /** Courses with passed quizzes */
  passedQuizzes: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Whether the track is completed */
  isCompleted: boolean;
  /** Certificate ID if completed and issued */
  certificateId?: string;
  /** Certificate expiration date */
  expiresAt?: Date;
}

/**
 * CourseWithProgress represents a course with the user's progress.
 */
export interface CourseWithProgress {
  /** Course ID */
  courseId: string;
  /** Course title */
  title: string;
  /** Course type */
  type: CourseType;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  /** Whether the course content has been completed */
  contentCompleted: boolean;
  /** Quiz status for this course */
  quizStatus: QuizStatus;
  /** Best quiz score achieved (0-1) */
  bestScore?: number;
  /** Number of quiz attempts */
  attemptCount: number;
}

/**
 * Human-readable descriptions for certification levels.
 */
export const LEVEL_DESCRIPTIONS: Record<CertificationLevel, string> = {
  [CertificationLevel.FOUNDATION]:
    'Foundation - Essential platform knowledge for all users',
  [CertificationLevel.INTERMEDIATE]:
    'Intermediate - Module-specific expertise',
  [CertificationLevel.ADVANCED]:
    'Advanced - Deep specialization and advanced workflows',
};

/**
 * Human-readable descriptions for track types.
 */
export const TRACK_DESCRIPTIONS: Record<TrackType, string> = {
  [TrackType.PLATFORM_FUNDAMENTALS]:
    'Platform Fundamentals - Required for all users',
  [TrackType.CASE_MANAGEMENT]:
    'Case Management - Investigations and case workflow',
  [TrackType.CAMPAIGNS_DISCLOSURES]:
    'Campaigns & Disclosures - Attestations and COI management',
  [TrackType.POLICY_MANAGEMENT]:
    'Policy Management - Policy lifecycle and attestations',
  [TrackType.ANALYTICS_REPORTING]:
    'Analytics & Reporting - Dashboards and reports',
  [TrackType.ADMIN_CONFIGURATION]:
    'Administration - System configuration and setup',
};

/**
 * Check if a track type is required (Platform Fundamentals).
 */
export function isRequiredTrack(trackType: TrackType): boolean {
  return trackType === TrackType.PLATFORM_FUNDAMENTALS;
}

/**
 * Calculate if a score passes the quiz threshold.
 */
export function isPassingScore(score: number): boolean {
  return score >= QUIZ_PASS_THRESHOLD;
}
