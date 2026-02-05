import { Module } from "@nestjs/common";
import { MyWorkController } from "./my-work.controller";
import { TaskAggregatorService } from "./task-aggregator.service";
import { PrismaModule } from "../../prisma/prisma.module";

/**
 * Module for the unified "My Work" task queue.
 * Aggregates tasks from Cases, Investigations, Disclosures, and other modules.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MyWorkController],
  providers: [TaskAggregatorService],
  exports: [TaskAggregatorService],
})
export class MyWorkModule {}
