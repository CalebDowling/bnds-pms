/**
 * Exponential backoff retry utility for external integrations
 * Prevents silent failures on transient errors (network, 5xx, timeouts)
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryOn: () => true,
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries) break;
      if (!opts.retryOn(error, attempt)) break;

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        opts.maxDelayMs
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Retry predicate for HTTP fetch responses
 * Retries on 5xx, 429 (rate limit), and network errors
 */
export function isRetryableHttpError(error: unknown): boolean {
  if (error instanceof Response) {
    return error.status >= 500 || error.status === 429;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("econnreset");
  }
  return false;
}

/**
 * Fetch with automatic retry on transient failures
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init);
      if (response.status >= 500 || response.status === 429) {
        throw response; // Trigger retry
      }
      return response;
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      retryOn: (error) => isRetryableHttpError(error),
      ...retryOptions,
    }
  );
}
