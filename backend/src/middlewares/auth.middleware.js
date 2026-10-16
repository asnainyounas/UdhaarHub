const { verifyToken } = require('../utils/token.util');
const User = require('../models/User.model');

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies?.udhaarhub_token;

    // Fallback to Bearer token for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Token has expired'
          : 'Invalid token';

      return res.status(401).json({ success: false, message });
    }

    // Confirm the user still exists and is not disabled
    const user = await User.findById(decoded.userId).select('status');
    if (!user || user.status === 'disabled') {
      return res.status(401).json({
        success: false,
        message: 'User not found or account disabled',
      });
    }

    req.user = {
      userId: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

module.exports = authMiddleware;
