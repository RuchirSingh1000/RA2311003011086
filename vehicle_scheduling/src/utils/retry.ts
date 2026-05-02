const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number,
  label: string,
  onRetry: (attempt: number, label: string) => void
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        onRetry(attempt, label);
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastError;
};
