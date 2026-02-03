import { Module } from '@nestjs/common';
import { RiusService } from './rius.service';
import {
  HotlineRiuService,
  DisclosureRiuService,
  WebFormRiuService,
} from './extensions';

/**
 * RIU (Risk Intelligence Unit) Module
 *
 * Provides services for managing RIUs - immutable intake records.
 * RIU content is frozen at creation; only status and AI enrichment can change.
 *
 * Extension services manage type-specific data:
 * - HotlineRiuService: Call metadata and QA workflow
 * - DisclosureRiuService: Value tracking and conflict detection
 * - WebFormRiuService: Form metadata and validation tracking
 */
@Module({
  providers: [
    RiusService,
    HotlineRiuService,
    DisclosureRiuService,
    WebFormRiuService,
  ],
  exports: [
    RiusService,
    HotlineRiuService,
    DisclosureRiuService,
    WebFormRiuService,
  ],
})
export class RiusModule {}
