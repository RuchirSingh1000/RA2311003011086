export type LogStack = 'backend' | 'frontend';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogPackageName =
  | 'cache'
  | 'controller'
  | 'cron_job'
  | 'db'
  | 'domain'
  | 'handler'
  | 'repository'
  | 'route'
  | 'service'
  | 'auth'
  | 'config'
  | 'middleware'
  | 'utils'
  | 'api'
  | 'component'
  | 'hook'
  | 'page'
  | 'state'
  | 'style';

export interface LogPayload {
  stack: LogStack;
  level: LogLevel;
  package_name: LogPackageName;
  message: string;
}

export interface LogConfig {
  baseUrl: string;
  bearerToken: string;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface LogResponse {
  success: boolean;
  statusCode?: number;
  error?: string;
}
