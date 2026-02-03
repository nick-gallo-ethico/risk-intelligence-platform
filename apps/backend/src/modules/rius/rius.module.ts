import { Module } from '@nestjs/common';
import { RiusService } from './rius.service';

/**
 * RIU (Risk Intelligence Unit) Module
 *
 * Provides services for managing RIUs - immutable intake records.
 * RIU content is frozen at creation; only status and AI enrichment can change.
 */
@Module({
  providers: [RiusService],
  exports: [RiusService],
})
export class RiusModule {}
