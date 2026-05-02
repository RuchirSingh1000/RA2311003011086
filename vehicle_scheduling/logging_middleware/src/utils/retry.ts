export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (onRetry) onRetry(attempt, error);
      if (attempt < attempts) {
        await sleep(delayMs * attempt); // exponential back-off
      }
    }
  }

  throw lastError;
};
