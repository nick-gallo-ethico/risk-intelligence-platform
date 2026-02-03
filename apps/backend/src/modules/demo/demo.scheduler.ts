/**
 * Demo Scheduler - Automatic expiry of prospect accounts
 *
 * Runs every hour to find and deactivate expired prospect accounts.
 * Expired accounts have their status set to EXPIRED and their
 * associated user account is deactivated.
 *
 * This is a non-blocking operation - failures are logged but don't
 * affect other system operations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DemoService } from './demo.service';

@Injectable()
export class DemoScheduler {
  private readonly logger = new Logger(DemoScheduler.name);

  constructor(private readonly demoService: DemoService) {}

  /**
   * Run every hour to expire prospect accounts
   *
   * This cron job finds all ACTIVE demo accounts with an expiresAt
   * date in the past and marks them as EXPIRED, deactivating the
   * associated user account.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredAccounts(): Promise<void> {
    this.logger.log('Processing expired demo accounts...');

    try {
      const expiredCount = await this.demoService.processExpiredAccounts();

      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} demo account(s)`);
      } else {
        this.logger.debug('No accounts to expire');
      }
    } catch (error) {
      // Log but don't throw - scheduled task failures shouldn't crash the app
      this.logger.error(
        `Failed to process expired accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Manual trigger for testing (not scheduled)
   *
   * Can be called directly for testing purposes without waiting
   * for the hourly cron to run.
   */
  async triggerExpiredAccountsCheck(): Promise<number> {
    this.logger.log('Manually triggering expired accounts check...');
    return this.demoService.processExpiredAccounts();
  }
}
