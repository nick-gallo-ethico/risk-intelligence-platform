import { Module } from "@nestjs/common";
import { MyWorkController } from "./my-work.controller";
import { TaskAggregatorService } from "./task-aggregator.service";
import { TaskCaseFetcherService } from "./services/task-case-fetcher.service";
import { TaskWorkflowFetcherService } from "./services/task-workflow-fetcher.service";
import { TaskSorterService } from "./services/task-sorter.service";
import { PrismaModule } from "../../prisma/prisma.module";

/**
 * Module for the unified "My Work" task queue.
 *
 * Aggregates tasks from Cases, Investigations, Remediations, Disclosures,
 * Campaigns, Approvals, and Project Tasks.
 *
 * Sub-services:
 * - TaskCaseFetcherService: Case-related task fetching
 * - TaskWorkflowFetcherService: Workflow-related task fetching
 * - TaskSorterService: Sorting, filtering, and pagination
 */
@Module({
  imports: [PrismaModule],
  controllers: [MyWorkController],
  providers: [
    TaskAggregatorService,
    TaskCaseFetcherService,
    TaskWorkflowFetcherService,
    TaskSorterService,
  ],
  exports: [TaskAggregatorService],
})
export class MyWorkModule {}
