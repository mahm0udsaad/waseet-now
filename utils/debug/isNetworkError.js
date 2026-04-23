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

// Debounce network-offline toasts so retries/parallel failures
// don't spam the user with duplicate banners.
let lastOfflineToastAt = 0;
const OFFLINE_TOAST_COOLDOWN_MS = 5000;

export function notifyOffline() {
  const now = Date.now();
  if (now - lastOfflineToastAt < OFFLINE_TOAST_COOLDOWN_MS) return;
  lastOfflineToastAt = now;

  // Lazy require to avoid circular imports at module init
  try {
    const { showToast } = require('@/utils/notifications/inAppStore');
    showToast({
      id: 'network-offline',
      type: 'warning',
      title: 'تحقق من اتصالك بالإنترنت',
      body: 'يبدو أنك غير متصل. يرجى التحقق من الشبكة والمحاولة مرة أخرى.',
      duration: 6000,
    });
  } catch (_e) {
    // Toast system not available (e.g. during very early startup) — ignore.
  }
}
