import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/**
 * Smart App Store / Google Play rating prompt.
 *
 * Why this wrapper:
 * Apple's `SKStoreReviewController` silently rate-limits to ~3 prompts per user
 * per 365 days. If we call it naively on every "successful completion" we
 * (a) burn that quota on the user's first-ever interaction (bad UX, low star
 * likelihood), and (b) have no visibility into whether the prompt actually
 * showed. This helper adds our own eligibility gate on top of Apple's, so
 * when we DO call requestReview() the user is much more likely to be both
 * eligible and delighted.
 *
 * Eligibility rules (all must pass):
 *   1. Platform supports the in-app review flow (isAvailableAsync / hasAction)
 *   2. User has completed ≥ MIN_EVENTS_BEFORE_PROMPT eligible events
 *   3. ≥ MIN_DAYS_SINCE_FIRST_EVENT days have passed since the first event
 *      (avoids prompting on the very first session)
 *   4. ≥ MIN_DAYS_BETWEEN_PROMPTS days since the last prompt we triggered
 *
 * Call `maybeRequestReview(eventName)` from success moments only.
 */

const STORAGE_KEY = '@wasit_alan/review_state_v1';

const MIN_EVENTS_BEFORE_PROMPT = 2;
const MIN_DAYS_SINCE_FIRST_EVENT = 2;
const MIN_DAYS_BETWEEN_PROMPTS = 120; // stricter than Apple's 365/3

const DAY_MS = 24 * 60 * 60 * 1000;

const log = (...args) => {
  if (__DEV__) {
    console.log('[storeReview]', ...args);
  }
};

const readState = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    log('readState failed, defaulting to empty', err);
    return {};
  }
};

const writeState = async (state) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    log('writeState failed', err);
  }
};

const canShowReviewUi = async () => {
  try {
    if (typeof StoreReview.isAvailableAsync === 'function') {
      const available = await StoreReview.isAvailableAsync();
      if (available) return true;
    }
    if (typeof StoreReview.hasAction === 'function') {
      return await StoreReview.hasAction();
    }
  } catch (err) {
    log('availability check failed', err);
  }
  return false;
};

/**
 * Record a success event and prompt for review if eligibility rules pass.
 *
 * Safe to call frequently — this function is fire-and-forget, never throws,
 * and respects our own throttle plus Apple's/Google's system throttle.
 *
 * @param {string} eventName  Short descriptor for logs, e.g. 'damin_completed'.
 * @returns {Promise<{prompted: boolean, reason?: string}>}
 */
export const maybeRequestReview = async (eventName = 'unknown') => {
  try {
    const now = Date.now();
    const state = await readState();

    const firstEventAt = state.firstEventAt ?? now;
    const eventCount = (state.eventCount ?? 0) + 1;
    const lastPromptedAt = state.lastPromptedAt ?? 0;

    const nextState = {
      ...state,
      firstEventAt,
      eventCount,
      lastEventAt: now,
      lastEventName: eventName,
    };

    // Persist the counter before the eligibility check so the first eligible
    // event isn't the one that prompts — we want at least one "warm-up" event
    // before showing the dialog.
    await writeState(nextState);

    if (eventCount < MIN_EVENTS_BEFORE_PROMPT) {
      const reason = `event_count_below_threshold (${eventCount}/${MIN_EVENTS_BEFORE_PROMPT})`;
      log(eventName, 'skipped:', reason);
      return { prompted: false, reason };
    }

    const daysSinceFirst = (now - firstEventAt) / DAY_MS;
    if (daysSinceFirst < MIN_DAYS_SINCE_FIRST_EVENT) {
      const reason = `too_soon_after_first_event (${daysSinceFirst.toFixed(1)}d)`;
      log(eventName, 'skipped:', reason);
      return { prompted: false, reason };
    }

    const daysSincePrompt = lastPromptedAt
      ? (now - lastPromptedAt) / DAY_MS
      : Infinity;
    if (daysSincePrompt < MIN_DAYS_BETWEEN_PROMPTS) {
      const reason = `prompted_recently (${daysSincePrompt.toFixed(1)}d ago)`;
      log(eventName, 'skipped:', reason);
      return { prompted: false, reason };
    }

    const available = await canShowReviewUi();
    if (!available) {
      const reason = 'store_review_unavailable';
      log(eventName, 'skipped:', reason);
      return { prompted: false, reason };
    }

    // All checks passed — record the prompt BEFORE calling requestReview so
    // a re-render or duplicate trigger can't fire it twice in the same window.
    await writeState({ ...nextState, lastPromptedAt: now });

    log(eventName, 'requesting review');
    await StoreReview.requestReview();
    return { prompted: true };
  } catch (err) {
    // Never let a rating prompt take down a success flow.
    log(eventName, 'unexpected error (swallowed)', err);
    return { prompted: false, reason: 'error' };
  }
};

/**
 * Debug helper — wipes our eligibility state so the next successful event
 * will be treated as a fresh install. Intended for QA/TestFlight only.
 */
export const __resetReviewStateForDebug = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
  log('state reset');
};
