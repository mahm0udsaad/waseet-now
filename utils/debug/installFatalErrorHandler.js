import { Platform } from 'react-native';
import { setFatalError } from './fatalErrorStore';

let installed = false;
const WRAPPED_HANDLER = Symbol.for('kafel.wrappedGlobalErrorHandler');

function serializeError(error, isFatal) {
  const normalizedError =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : JSON.stringify(error));

  return {
    name: normalizedError.name || 'Error',
    message: normalizedError.message || 'Unknown JavaScript error',
    stack: normalizedError.stack || '',
    isFatal: !!isFatal,
    jsEngine:
      typeof normalizedError.jsEngine === 'string'
        ? normalizedError.jsEngine
        : globalThis.HermesInternal
          ? 'hermes'
          : 'unknown',
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    platformVersion: String(Platform.Version ?? ''),
  };
}

function shouldInterceptFatalError(isFatal) {
  if (!isFatal || __DEV__) return false;
  if (Platform.OS !== 'ios') return false;

  const version = String(Platform.Version ?? '');
  return version.startsWith('26');
}

function logFatalError(payload) {
  const logArgs = [
    '[GlobalFatalError]',
    payload.name,
    payload.message,
    payload.stack,
  ];

  if (typeof console?._errorOriginal === 'function') {
    console._errorOriginal(...logArgs);
    return;
  }

  console.log(...logArgs);
}

export function installFatalErrorHandler() {
  if (installed) return;

  const errorUtils = globalThis.ErrorUtils;
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) return;

  const originalSetGlobalHandler = errorUtils.setGlobalHandler.bind(errorUtils);

  // RN$handleException is read-only in React Native 0.81+ with new architecture.
  // Wrap in try/catch so the ErrorUtils-based handler below still gets installed.
  try {
    const previousRuntimeHandleException = globalThis.RN$handleException;

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'RN$handleException');
    if (descriptor && descriptor.writable === false && !descriptor.configurable) {
      // Property is non-writable AND non-configurable — skip entirely.
    } else {
      Object.defineProperty(globalThis, 'RN$handleException', {
        value: (error, isFatal, reportToConsole) => {
          const payload = serializeError(error, isFatal);
          setFatalError(payload);
          logFatalError(payload);

          if (shouldInterceptFatalError(isFatal)) {
            return true;
          }

          return previousRuntimeHandleException?.(error, isFatal, reportToConsole) ?? false;
        },
        writable: true,
        configurable: true,
      });
    }
  } catch (e) {
    // New architecture may freeze RN$handleException — not critical,
    // the ErrorUtils.setGlobalHandler wrapper below handles the same errors.
  }

  const wrapHandler = (handler) => {
    if (typeof handler !== 'function') return handler;
    if (handler[WRAPPED_HANDLER]) return handler;

    const wrappedHandler = (error, isFatal) => {
      const payload = serializeError(error, isFatal);
      setFatalError(payload);
      logFatalError(payload);

      if (shouldInterceptFatalError(isFatal)) {
        return;
      }

      handler(error, isFatal);
    };

    wrappedHandler[WRAPPED_HANDLER] = true;
    return wrappedHandler;
  };

  errorUtils.setGlobalHandler = (handler) => {
    originalSetGlobalHandler(wrapHandler(handler));
  };

  errorUtils.setGlobalHandler(errorUtils.getGlobalHandler());

  installed = true;
}
