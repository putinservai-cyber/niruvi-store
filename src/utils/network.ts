import { sanitizeErrorMessage } from './sanitize';

export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

/**
 * Detects whether the browser is currently offline or on a constrained/slow connection (2G / saveData).
 */
export function isSlowOrOfflineConnection(): {
  offline: boolean;
  slowConnection: boolean;
  effectiveType: string;
} {
  if (typeof navigator === 'undefined') {
    return { offline: false, slowConnection: false, effectiveType: '4g' };
  }

  const offline = navigator.onLine === false;
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const effectiveType = typeof conn?.effectiveType === 'string' ? conn.effectiveType : '4g';
  const saveData = Boolean(conn?.saveData);
  const slowConnection =
    saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || (typeof conn?.rtt === 'number' && conn.rtt > 1000);

  return { offline, slowConnection, effectiveType };
}

/**
 * Performs a fetch request with an AbortController timeout and automatic retry for transient
 * network or 502/503/504 errors so slow internet connections never hang the UI indefinitely.
 */
export async function fetchWithTimeoutAndRetry(
  input: RequestInfo | URL,
  options: ResilientFetchOptions = {},
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const {
    timeoutMs = 8000,
    retries = (options.method || 'GET').toUpperCase() === 'GET' ? 1 : 0,
    retryDelayMs = 350,
    ...fetchInit
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const externalSignal = fetchInit.signal;

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(input, {
        ...fetchInit,
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }

      if (
        attempt < retries &&
        (response.status === 502 || response.status === 503 || response.status === 504)
      ) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
      lastError = err;

      const isAbort =
        err?.name === 'AbortError' ||
        (typeof err?.message === 'string' && /aborted|timeout/i.test(err.message));

      if (attempt < retries && !externalSignal?.aborted) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
        continue;
      }

      if (isAbort) {
        throw new Error('Request timed out on slow connection. Using cached catalog data.');
      }
      throw new Error(
        sanitizeErrorMessage(err, 'Network request failed. Please check your internet connection.')
      );
    }
  }

  throw new Error(
    sanitizeErrorMessage(lastError, 'Network request failed. Please check your internet connection.')
  );
}
