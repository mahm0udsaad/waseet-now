let currentFatalError = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[fatalErrorStore] listener failed', error);
    }
  });
}

export function getFatalError() {
  return currentFatalError;
}

export function setFatalError(payload) {
  currentFatalError = payload;
  globalThis.__KAFEL_LAST_FATAL_ERROR__ = payload;
  notifyListeners();
}

export function clearFatalError() {
  currentFatalError = null;
  delete globalThis.__KAFEL_LAST_FATAL_ERROR__;
  notifyListeners();
}

export function subscribeToFatalError(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
