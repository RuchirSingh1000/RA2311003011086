import cron from 'node-cron';
import { cache } from '../utils/cache';
import { Log } from '../../logging_middleware/src';

/**
 * Scheduled cache invalidation — runs every 5 minutes to ensure
 * fresh data from the evaluation service APIs.
 */
export const startScheduler = (): void => {
  cron.schedule('*/5 * * * *', async () => {
    await Log('backend', 'info', 'cron_job', 'Scheduled cache flush triggered');
    cache.flush();
    await Log('backend', 'info', 'cron_job', 'Cache flushed successfully by scheduler');
  });

  void Log('backend', 'info', 'cron_job', 'Cron scheduler initialized — cache flush every 5 minutes');
};
