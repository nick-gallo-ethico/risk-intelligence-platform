/**
 * Demo Module - Hybrid multi-user demo access system
 *
 * This module provides:
 * - Permanent demo user accounts (9 sales rep accounts with role presets)
 * - Prospect account provisioning (sales reps create time-limited accounts)
 * - Automatic expiry of prospect accounts
 * - Activity logging for all demo operations
 *
 * The module depends on:
 * - PrismaModule for database access
 * - ActivityModule for audit logging (global, auto-imported)
 * - ScheduleModule for cron-based expiry
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DemoService } from './demo.service';
import { DemoController } from './demo.controller';
import { DemoScheduler } from './demo.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    // ScheduleModule is typically registered at app level, but we include
    // it here in case it's not already registered
    ScheduleModule.forRoot(),
  ],
  controllers: [DemoController],
  providers: [DemoService, DemoScheduler],
  exports: [DemoService],
})
export class DemoModule {}
