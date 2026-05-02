import * as dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const config: AppConfig = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  evaluationApiBaseUrl:
    process.env.EVALUATION_API_BASE_URL ?? 'http://20.207.122.201/evaluation-service',
  evaluationBearerToken: requireEnv('EVALUATION_BEARER_TOKEN'),
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '300', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
};
