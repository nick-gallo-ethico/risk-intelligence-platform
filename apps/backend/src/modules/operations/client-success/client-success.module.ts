/**
 * ClientSuccessModule - Client Success Manager Dashboard
 *
 * Provides portfolio overview and peer benchmarks for CSMs.
 * Aggregates data from HealthScoreService and PeerBenchmarkService.
 *
 * ARCHITECTURE NOTE:
 * This module wraps the client-health module to provide simplified
 * endpoints for the CSM dashboard at /api/v1/internal/client-success/*
 *
 * @see CONTEXT.md for Client Success requirements
 */

import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ClientHealthModule } from "../client-health/client-health.module";
import { ClientSuccessController } from "./client-success.controller";
import { ClientSuccessService } from "./client-success.service";

@Module({
  imports: [
    PrismaModule,
    ClientHealthModule, // Import for HealthScoreService and PeerBenchmarkService
  ],
  controllers: [ClientSuccessController],
  providers: [ClientSuccessService],
  exports: [ClientSuccessService],
})
export class ClientSuccessModule {}
