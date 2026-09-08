const { verifyToken } = require('../utils/token.util');
const User = require('../models/User.model');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const parts = authHeader.split(' ');

if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
  return res.status(401).json({
    success: false,
    message: 'Invalid authorization header',
  });
}

const token = parts[1];

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
