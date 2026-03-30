try {
  const { installFatalErrorHandler } = require('./utils/debug/installFatalErrorHandler');
  installFatalErrorHandler();
} catch (e) {
  console.warn('[index] Fatal error handler setup failed — continuing:', e.message);
}

require('expo-router/entry');
