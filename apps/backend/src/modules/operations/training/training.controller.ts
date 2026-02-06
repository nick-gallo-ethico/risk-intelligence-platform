/**
 * TrainingController - Certification and Training API Endpoints
 *
 * Provides endpoints for:
 * - Fetching certification tracks with progress
 * - Starting and submitting quiz attempts
 * - Issuing and verifying certificates
 *
 * @see CertificationService for business logic
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { CertificationService } from "./certification.service";
import { SubmitQuizDto } from "./dto/training.dto";

@Controller("api/v1/training")
export class TrainingController {
  constructor(private readonly certificationService: CertificationService) {}

  /**
   * Get all certification tracks with user progress.
   *
   * @param userId - User ID to get progress for
   * @param internal - Whether this is an internal Ethico user
   * @returns Tracks with progress information
   */
  @Get("tracks")
  async getTracks(
    @Query("userId") userId: string,
    @Query("internal") internal?: string,
  ) {
    const isInternalUser = internal === "true";
    return this.certificationService.getTracksWithProgress(
      userId,
      isInternalUser,
    );
  }

  /**
   * Get a specific track's details.
   *
   * @param trackId - Track ID
   * @param userId - User ID to get progress for
   * @param internal - Whether this is an internal Ethico user
   */
  @Get("tracks/:trackId")
  async getTrack(
    @Param("trackId") trackId: string,
    @Query("userId") userId: string,
    @Query("internal") internal?: string,
  ) {
    const isInternalUser = internal === "true";
    const tracks = await this.certificationService.getTracksWithProgress(
      userId,
      isInternalUser,
    );
    return tracks.find((t) => t.id === trackId) ?? null;
  }

  /**
   * Start a quiz attempt.
   *
   * @param quizId - Quiz ID to start
   * @param userId - User ID taking the quiz
   * @param internal - Whether this is an internal Ethico user
   * @returns Quiz attempt with questions (without correct answers)
   */
  @Post("quizzes/:quizId/start")
  @HttpCode(HttpStatus.CREATED)
  async startQuiz(
    @Param("quizId") quizId: string,
    @Query("userId") userId: string,
    @Query("internal") internal?: string,
  ) {
    const isInternalUser = internal === "true";
    return this.certificationService.startQuizAttempt(
      quizId,
      userId,
      isInternalUser,
    );
  }

  /**
   * Submit quiz answers and get results.
   *
   * @param attemptId - Quiz attempt ID
   * @param dto - Answers to submit
   * @returns Grading results
   */
  @Post("attempts/:attemptId/submit")
  @HttpCode(HttpStatus.OK)
  async submitQuiz(
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.certificationService.submitQuizAttempt(attemptId, dto.answers);
  }

  /**
   * Issue a certificate for a completed track.
   *
   * @param trackId - Track ID to issue certificate for
   * @param userId - User ID to issue certificate to
   * @param internal - Whether this is an internal Ethico user
   * @returns Issued certificate
   */
  @Post("tracks/:trackId/certificate")
  @HttpCode(HttpStatus.CREATED)
  async issueCertificate(
    @Param("trackId") trackId: string,
    @Query("userId") userId: string,
    @Query("internal") internal?: string,
  ) {
    const isInternalUser = internal === "true";
    return this.certificationService.issueCertificate(
      trackId,
      userId,
      isInternalUser,
    );
  }

  /**
   * Get a user's certificates.
   *
   * @param userId - User ID to get certificates for
   * @param internal - Whether this is an internal Ethico user
   * @returns List of certificates
   */
  @Get("certificates")
  async getUserCertificates(
    @Query("userId") userId: string,
    @Query("internal") internal?: string,
  ) {
    const isInternalUser = internal === "true";
    return this.certificationService.getUserCertificates(
      userId,
      isInternalUser,
    );
  }

  /**
   * Verify a certificate by its number.
   *
   * @param certificateNumber - Certificate number to verify (CERT-YYYY-NNNNN)
   * @returns Certificate details if valid, null if not found
   */
  @Get("certificates/verify/:certificateNumber")
  async verifyCertificate(
    @Param("certificateNumber") certificateNumber: string,
  ) {
    return this.certificationService.verifyCertificate(certificateNumber);
  }
}
