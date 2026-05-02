import * as dotenv from 'dotenv';
import { LogConfig } from '../types';

dotenv.config();

const VALID_STACKS = ['backend', 'frontend'] as const;
const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
const VALID_PACKAGES = [
  'cache', 'controller', 'cron_job', 'db', 'domain', 'handler',
  'repository', 'route', 'service', 'auth', 'config', 'middleware',
  'utils', 'api', 'component', 'hook', 'page', 'state', 'style',
] as const;

export { VALID_STACKS, VALID_LEVELS, VALID_PACKAGES };

export const loadLogConfig = (): LogConfig => ({
  baseUrl: process.env.LOG_API_BASE_URL ?? 'http://20.207.122.201/evaluation-service',
  bearerToken: process.env.LOG_BEARER_TOKEN ?? '',
  retryAttempts: parseInt(process.env.LOG_RETRY_ATTEMPTS ?? '3', 10),
  retryDelayMs: parseInt(process.env.LOG_RETRY_DELAY_MS ?? '500', 10),
  timeoutMs: parseInt(process.env.LOG_TIMEOUT_MS ?? '5000', 10),
});
