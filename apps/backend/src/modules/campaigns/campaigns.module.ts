import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { SegmentService } from './targeting/segment.service';
import { SegmentQueryBuilder } from './targeting/segment-query.builder';
import { CampaignAssignmentService } from './assignments/campaign-assignment.service';
import { CampaignTargetingService } from './campaign-targeting.service';
import {
  CampaignSchedulingService,
  CAMPAIGN_QUEUE_NAME,
} from './campaign-scheduling.service';
import { CampaignSchedulingProcessor } from './campaign-scheduling.processor';

/**
 * CampaignsModule provides outbound compliance request functionality.
 *
 * Campaigns (HubSpot Sequence equivalent) enable:
 * - Disclosure requests (COI, gifts, outside employment)
 * - Policy attestations
 * - Compliance surveys
 *
 * Features:
 * - Segment-based audience targeting with query builder
 * - Manual employee selection
 * - Campaign lifecycle management (draft -> scheduled -> launch -> complete)
 * - Assignment tracking with employee snapshots
 * - Reminder scheduling
 * - Auto-case creation from responses
 * - Scheduled launches with BullMQ
 * - Wave-based staggered rollout (RS.53)
 * - Blackout date enforcement (RS.54)
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: CAMPAIGN_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 60 * 60, // 24 hours
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 60 * 60, // 7 days
        },
      },
    }),
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    SegmentService,
    SegmentQueryBuilder,
    CampaignAssignmentService,
    CampaignTargetingService,
    CampaignSchedulingService,
    CampaignSchedulingProcessor,
  ],
  exports: [
    CampaignsService,
    SegmentService,
    SegmentQueryBuilder,
    CampaignAssignmentService,
    CampaignTargetingService,
    CampaignSchedulingService,
  ],
})
export class CampaignsModule {}
