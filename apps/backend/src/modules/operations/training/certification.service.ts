/**
 * CertificationService - Course Progress and Quiz Management
 *
 * Per CONTEXT.md:
 * - Modular: Platform Fundamentals required, specialty tracks optional
 * - Short courses + quizzes
 * - 80% to pass (QUIZ_PASS_THRESHOLD)
 * - PDF certificates with CERT-YYYY-NNNNN format
 * - Expiration tracking for major versions
 *
 * @see CONTEXT.md for certification requirements
 * @see certification.types.ts for constants and types
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  QUIZ_PASS_THRESHOLD,
  QuizStatus,
  CertificateStatus,
  QuizQuestion,
} from "../types/certification.types";
import {
  QuizStartResponse,
  QuizSubmitResponse,
  TrackWithProgressResponse,
  CertificateResponse,
} from "./dto/training.dto";

/**
 * Certificate number prefix and format.
 * Format: CERT-YYYY-NNNNN (e.g., CERT-2026-00001)
 */
const CERT_PREFIX = "CERT";

@Injectable()
export class CertificationService {
  private readonly logger = new Logger(CertificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all certification tracks with user progress.
   *
   * @param userId - User ID (either tenant user or internal user)
   * @param isInternalUser - Whether this is an internal Ethico user
   * @returns Tracks with progress information
   */
  async getTracksWithProgress(
    userId: string,
    isInternalUser: boolean,
  ): Promise<TrackWithProgressResponse[]> {
    // Get all active tracks with their courses
    const tracks = await this.prisma.certificationTrack.findMany({
      where: { isActive: true },
      include: {
        courses: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            quiz: { select: { id: true } },
          },
        },
      },
      orderBy: [{ isRequired: "desc" }, { sortOrder: "asc" }],
    });

    // Get user's certifications for progress info
    const userCerts = await this.prisma.userCertification.findMany({
      where: isInternalUser ? { internalUserId: userId } : { userId },
    });

    return tracks.map((track) => ({
      id: track.id,
      name: track.name,
      slug: track.slug,
      description: track.description,
      type: track.type as TrackWithProgressResponse["type"],
      level: track.level as TrackWithProgressResponse["level"],
      isRequired: track.isRequired,
      estimatedMinutes: track.estimatedMinutes,
      version: track.version,
      courses: track.courses.map((course) => ({
        id: course.id,
        title: course.title,
        type: course.type as TrackWithProgressResponse["courses"][0]["type"],
        sortOrder: course.sortOrder,
        estimatedMinutes: course.estimatedMinutes,
        hasQuiz: !!course.quiz,
      })),
      userProgress: userCerts.find((c) => c.trackId === track.id)
        ? {
            id: userCerts.find((c) => c.trackId === track.id)!.id,
            startedAt: userCerts.find((c) => c.trackId === track.id)!.createdAt,
            completedAt: userCerts.find((c) => c.trackId === track.id)!
              .completedAt,
            certificateId: userCerts.find((c) => c.trackId === track.id)!
              .certificateId,
            completedVersion: userCerts.find((c) => c.trackId === track.id)!
              .completedVersion,
          }
        : undefined,
      isCompleted: userCerts.some(
        (c) => c.trackId === track.id && c.completedAt !== null,
      ),
    }));
  }

  /**
   * Start a quiz attempt.
   *
   * @param quizId - Quiz to attempt
   * @param userId - User ID
   * @param isInternalUser - Whether this is an internal Ethico user
   * @returns Quiz attempt with questions (without correct answers)
   */
  async startQuizAttempt(
    quizId: string,
    userId: string,
    isInternalUser: boolean,
  ): Promise<QuizStartResponse> {
    // Get quiz with course and track info
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: { include: { track: true } } },
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    // Ensure user has a certification record for this track
    await this.ensureUserCertification(
      quiz.course.trackId,
      userId,
      isInternalUser,
    );

    // Create a new quiz attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId: isInternalUser ? null : userId,
        internalUserId: isInternalUser ? userId : null,
        status: QuizStatus.IN_PROGRESS,
      },
    });

    // Parse questions and strip correct answers
    const questions = (quiz.questions as unknown as QuizQuestion[]).map(
      (q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        // Do NOT include correctOptionIds - that's the secret sauce
      }),
    );

    this.logger.log(
      `Quiz attempt ${attempt.id} started for user ${userId} (quiz: ${quizId})`,
    );

    return {
      attemptId: attempt.id,
      questions,
    };
  }

  /**
   * Submit quiz answers and grade.
   *
   * @param attemptId - Quiz attempt ID
   * @param answers - User's answers
   * @returns Grading result
   */
  async submitQuizAttempt(
    attemptId: string,
    answers: { questionId: string; selectedOptionIds: string[] }[],
  ): Promise<QuizSubmitResponse> {
    // Get attempt with quiz details
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { course: { include: { track: true } } },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException("Quiz attempt not found");
    }

    if (attempt.status !== QuizStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Quiz attempt already completed. Start a new attempt to retry.",
      );
    }

    // Grade the quiz
    const questions = attempt.quiz.questions as unknown as QuizQuestion[];
    let correctCount = 0;

    for (const answer of answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      if (this.checkAnswer(question, answer.selectedOptionIds)) {
        correctCount++;
      }
    }

    // Calculate score (0.0 to 1.0)
    const score = questions.length > 0 ? correctCount / questions.length : 0;
    const passed = score >= QUIZ_PASS_THRESHOLD;
    const status = passed ? QuizStatus.PASSED : QuizStatus.FAILED;

    // Update attempt with results
    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        status,
        score,
        answers: answers as unknown as object,
      },
    });

    this.logger.log(
      `Quiz attempt ${attemptId} completed: ${Math.round(score * 100)}% (${passed ? "PASSED" : "FAILED"})`,
    );

    // If passed, check if the entire track is now complete
    if (passed) {
      const userId = attempt.userId ?? attempt.internalUserId;
      if (userId) {
        await this.checkTrackCompletion(
          attempt.quiz.course.trackId,
          userId,
          !attempt.userId,
        );
      }
    }

    return {
      score: Math.round(score * 100),
      passed,
      requiredScore: Math.round(QUIZ_PASS_THRESHOLD * 100),
      correctCount,
      totalQuestions: questions.length,
    };
  }

  /**
   * Issue a certificate for a completed track.
   *
   * @param trackId - Track to issue certificate for
   * @param userId - User ID
   * @param isInternalUser - Whether this is an internal Ethico user
   * @returns Issued certificate
   */
  async issueCertificate(
    trackId: string,
    userId: string,
    isInternalUser: boolean,
  ): Promise<CertificateResponse> {
    // Get user certification record
    const userCert = await this.prisma.userCertification.findFirst({
      where: isInternalUser
        ? { trackId, internalUserId: userId }
        : { trackId, userId },
      include: { track: true },
    });

    if (!userCert) {
      throw new NotFoundException("User certification record not found");
    }

    if (!userCert.completedAt) {
      throw new BadRequestException(
        "Track not completed. Pass all quizzes before requesting certificate.",
      );
    }

    if (userCert.certificateId) {
      // Already issued - return existing certificate
      const existing = await this.prisma.certificate.findUnique({
        where: { id: userCert.certificateId },
      });
      if (existing) {
        return this.toCertificateResponse(existing);
      }
    }

    // Generate unique certificate number: CERT-YYYY-NNNNN
    const year = new Date().getFullYear();
    const certCount = await this.prisma.certificate.count({
      where: { certificateNumber: { startsWith: `${CERT_PREFIX}-${year}` } },
    });
    const certificateNumber = `${CERT_PREFIX}-${year}-${String(certCount + 1).padStart(5, "0")}`;

    // Get recipient name
    const recipientName = await this.getRecipientName(userId, isInternalUser);

    // Calculate expiration (2 years from now by default)
    const expiresAt = this.calculateExpiration(userCert.track.versionMajor);

    // Create certificate
    const certificate = await this.prisma.certificate.create({
      data: {
        certificateNumber,
        recipientName,
        trackName: userCert.track.name,
        trackVersion: userCert.track.version,
        status: CertificateStatus.ACTIVE,
        expiresAt,
      },
    });

    // Link certificate to user certification
    await this.prisma.userCertification.update({
      where: { id: userCert.id },
      data: {
        certificateId: certificate.id,
        completedVersion: userCert.track.version,
      },
    });

    this.logger.log(
      `Certificate ${certificateNumber} issued for user ${userId}, track ${trackId}`,
    );

    return this.toCertificateResponse(certificate);
  }

  /**
   * Get a user's certificates.
   */
  async getUserCertificates(
    userId: string,
    isInternalUser: boolean,
  ): Promise<CertificateResponse[]> {
    const userCerts = await this.prisma.userCertification.findMany({
      where: isInternalUser
        ? { internalUserId: userId, certificateId: { not: null } }
        : { userId, certificateId: { not: null } },
      include: { certificate: true },
    });

    return userCerts
      .filter((uc) => uc.certificate)
      .map((uc) => this.toCertificateResponse(uc.certificate!));
  }

  /**
   * Verify a certificate by its number.
   */
  async verifyCertificate(
    certificateNumber: string,
  ): Promise<CertificateResponse | null> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
    });

    if (!certificate) {
      return null;
    }

    return this.toCertificateResponse(certificate);
  }

  // ========================
  // Private Helper Methods
  // ========================

  /**
   * Check if a quiz answer is correct.
   */
  private checkAnswer(question: QuizQuestion, selectedIds: string[]): boolean {
    const correct = new Set(question.correctOptionIds);
    const selected = new Set(selectedIds);

    if (correct.size !== selected.size) {
      return false;
    }

    for (const id of correct) {
      if (!selected.has(id)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Ensure a user certification record exists for a track.
   */
  private async ensureUserCertification(
    trackId: string,
    userId: string,
    isInternalUser: boolean,
  ): Promise<void> {
    const existing = await this.prisma.userCertification.findFirst({
      where: isInternalUser
        ? { trackId, internalUserId: userId }
        : { trackId, userId },
    });

    if (!existing) {
      await this.prisma.userCertification.create({
        data: {
          trackId,
          userId: isInternalUser ? null : userId,
          internalUserId: isInternalUser ? userId : null,
        },
      });
      this.logger.debug(
        `Created UserCertification for user ${userId}, track ${trackId}`,
      );
    }
  }

  /**
   * Check if all quizzes in a track have been passed and mark track complete.
   */
  private async checkTrackCompletion(
    trackId: string,
    userId: string,
    isInternalUser: boolean,
  ): Promise<void> {
    // Get all courses in the track with their quizzes
    const track = await this.prisma.certificationTrack.findUnique({
      where: { id: trackId },
      include: {
        courses: {
          where: { isActive: true },
          include: { quiz: true },
        },
      },
    });

    if (!track) return;

    // Check each course's quiz
    for (const course of track.courses) {
      if (!course.quiz) continue;

      // Look for a passed attempt
      const passedAttempt = await this.prisma.quizAttempt.findFirst({
        where: {
          quizId: course.quiz.id,
          status: QuizStatus.PASSED,
          ...(isInternalUser ? { internalUserId: userId } : { userId }),
        },
      });

      if (!passedAttempt) {
        // Not all quizzes passed yet
        return;
      }
    }

    // All quizzes passed - mark track complete
    await this.prisma.userCertification.updateMany({
      where: isInternalUser
        ? { trackId, internalUserId: userId }
        : { trackId, userId },
      data: { completedAt: new Date() },
    });

    this.logger.log(`User ${userId} completed track ${trackId}`);
  }

  /**
   * Get recipient name for certificate.
   */
  private async getRecipientName(
    userId: string,
    isInternalUser: boolean,
  ): Promise<string> {
    if (isInternalUser) {
      const user = await this.prisma.internalUser.findUnique({
        where: { id: userId },
      });
      return user?.name ?? "Unknown User";
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) return "Unknown User";
      // User has firstName and lastName, combine them
      return `${user.firstName} ${user.lastName}`.trim() || "Unknown User";
    }
  }

  /**
   * Calculate certificate expiration date.
   * Default: 2 years from issue date.
   */
  private calculateExpiration(majorVersion: number): Date {
    // Certificates expire 2 years after issue
    const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + twoYearsMs);
  }

  /**
   * Convert database certificate to response DTO.
   */
  private toCertificateResponse(certificate: {
    id: string;
    certificateNumber: string;
    recipientName: string;
    trackName: string;
    trackVersion: string;
    createdAt: Date;
    expiresAt: Date | null;
    status: string;
  }): CertificateResponse {
    return {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName,
      trackName: certificate.trackName,
      trackVersion: certificate.trackVersion,
      issuedAt: certificate.createdAt,
      expiresAt: certificate.expiresAt,
      status: certificate.status as CertificateResponse["status"],
    };
  }
}
