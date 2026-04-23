const NETWORK_ERROR_NAMES = new Set([
  'AuthRetryableFetchError',
  'AbortError',
  'NetworkError',
  'FetchError',
]);

const NETWORK_ERROR_SUBSTRINGS = [
  'network request failed',
  'networkerror',
  'failed to fetch',
  'load failed',
  'the internet connection appears to be offline',
  'the network connection was lost',
  'timeout',
  'timed out',
  'no internet',
  'enotfound',
  'econnrefused',
  'econnreset',
  'socket hang up',
];

export function isNetworkError(error) {
  if (!error) return false;

  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();

  if (error?.name && NETWORK_ERROR_NAMES.has(error.name)) return true;
  if (name.includes('authretryable') || name.includes('fetch')) return true;

  return NETWORK_ERROR_SUBSTRINGS.some((needle) => message.includes(needle));
}
