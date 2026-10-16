// Rate limiter for auth endpoints (signup, login, etc.).
// In normal operation we limit to 5 attempts per 15 minutes per IP.
// During the Jest test run we completely bypass the limiter to avoid flaky tests.
// The `skip` option is evaluated for every request, so placing it directly in the options
// object ensures the bypass works even before the middleware is instantiated.
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in a few minutes.',
  },
  // Bypass the limiter when the test environment is active.
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = authLimiter;
