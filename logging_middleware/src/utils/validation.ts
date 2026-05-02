import { LogStack, LogLevel, LogPackageName } from '../types';
import { VALID_STACKS, VALID_LEVELS, VALID_PACKAGES } from '../config';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateLogParams = (
  stack: string,
  level: string,
  packageName: string,
  message: string
): ValidationResult => {
  const errors: string[] = [];

  if (!VALID_STACKS.includes(stack as LogStack)) {
    errors.push(`Invalid stack: "${stack}". Must be one of: ${VALID_STACKS.join(', ')}`);
  }

  if (!VALID_LEVELS.includes(level as LogLevel)) {
    errors.push(`Invalid level: "${level}". Must be one of: ${VALID_LEVELS.join(', ')}`);
  }

  if (!VALID_PACKAGES.includes(packageName as LogPackageName)) {
    errors.push(`Invalid packageName: "${packageName}". Must be one of: ${VALID_PACKAGES.join(', ')}`);
  }

  if (!message || message.trim().length === 0) {
    errors.push('Message cannot be empty');
  }

  return { valid: errors.length === 0, errors };
};
