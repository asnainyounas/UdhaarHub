const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateToken = ({ userId, companyId, role }) => {
  return jwt.sign(
    { userId, companyId, role },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRY,
    }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};