import { AxiosInstance } from 'axios';
import { LogStack, LogLevel, LogPackageName, LogPayload, LogResponse } from './types';
import { loadLogConfig } from './config';
import { createAxiosInstance } from './interceptors/axiosInstance';
import { validateLogParams } from './utils/validation';
import { withRetry } from './utils/retry';

// Singleton axios instance — initialized lazily
let _axiosInstance: AxiosInstance | null = null;

const getAxiosInstance = (): AxiosInstance => {
  if (!_axiosInstance) {
    const config = loadLogConfig();
    _axiosInstance = createAxiosInstance(config);
  }
  return _axiosInstance;
};

/**
 * Sends a structured log entry to the centralized logging service.
 * Never throws — all errors are swallowed to prevent application crashes.
 *
 * @param stack     - 'backend' | 'frontend'
 * @param level     - 'debug' | 'info' | 'warn' | 'error' | 'fatal'
 * @param packageName - The originating package/module
 * @param message   - Human-readable log message
 */
export const Log = async (
  stack: LogStack,
  level: LogLevel,
  packageName: LogPackageName,
  message: string
): Promise<LogResponse> => {
  try {
    const validation = validateLogParams(stack, level, packageName, message);

    if (!validation.valid) {
      // Validation failure — return silently without crashing
      return { success: false, error: validation.errors.join('; ') };
    }

    const config = loadLogConfig();
    const payload: LogPayload = {
      stack,
      level,
      package_name: packageName,
      message,
    };

    const response = await withRetry(
      () => getAxiosInstance().post<LogResponse>('/logs', payload),
      config.retryAttempts,
      config.retryDelayMs
    );

    return { success: true, statusCode: response.status };
  } catch {
    // Graceful degradation — logging must never crash the host application
    return { success: false, error: 'Log dispatch failed after all retry attempts' };
  }
};

export * from './types';
