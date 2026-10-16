const crypto = require('crypto');

const csrfMiddleware = (req, res, next) => {
  // 1. Skip safe HTTP methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 2. Exclude public endpoints that precede authentication (/api/auth/login and /api/auth/signup)
  const rawPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
  const path = rawPath.replace(/\/+$/, '') || '/';
  if (path === '/api/auth/login' || path === '/api/auth/signup') {
    return next();
  }

  // 3. Read CSRF token from header (Express lowercases header names in req.headers)
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.udhaarhub_csrf;

  // 4. Validate presence and types
  if (!headerToken || !cookieToken || typeof headerToken !== 'string' || typeof cookieToken !== 'string') {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  // 5. Compare tokens in constant time
  const headerBuf = Buffer.from(headerToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  next();
};

module.exports = csrfMiddleware;
