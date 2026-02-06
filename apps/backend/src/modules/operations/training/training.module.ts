/**
 * TrainingModule - Certification and Training System
 *
 * Provides:
 * - CertificationService for course progress and quiz management
 * - TrainingController for API endpoints
 *
 * @see CONTEXT.md for certification requirements
 * @see certification.types.ts for constants
 */

import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CertificationService } from "./certification.service";
import { TrainingController } from "./training.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TrainingController],
  providers: [CertificationService],
  exports: [CertificationService],
})
export class TrainingModule {}
