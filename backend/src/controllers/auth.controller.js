const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Company = require('../models/Company.model');
const config = require('../config/config');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { generateToken } = require('../utils/token.util');
const { normalizePhone } = require('../utils/phone.util');

const VALID_COMPANY_TYPES = ['shop', 'committee', 'lender', 'other'];

const getCookieMaxAge = () => {
  const expiry = config.JWT_EXPIRY || '30d';
  if (typeof expiry === 'number') return expiry * 1000;
  const match = String(expiry).match(/^(\d+)([smhdwy]?)$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    case 'w': return val * 7 * 24 * 60 * 60 * 1000;
    case 'y': return val * 365 * 24 * 60 * 60 * 1000;
    default: return val * 1000;
  }
};

const setAuthCookies = (res, token) => {
  const maxAge = getCookieMaxAge();
  const isProd = process.env.NODE_ENV === 'production';
  const baseOptions = {
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge,
  };

  // HttpOnly cookie for the JWT
  res.cookie('udhaarhub_token', token, {
    ...baseOptions,
    httpOnly: true,
  });

  // Readable (NOT HttpOnly) cookie containing CSRF token
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('udhaarhub_csrf', csrfToken, {
    ...baseOptions,
    httpOnly: false,
  });
};

const signup = async (req, res) => {
  try {
    const { name, phone, password, businessName, companyType } = req.body;

    // --- Input validation ---
    const errors = {};

    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!phone) {
      errors.phone = 'Phone number is required';
    }
    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!businessName || businessName.trim().length < 2) {
      errors.businessName = 'Business name must be at least 2 characters';
    }
    if (!companyType || !VALID_COMPANY_TYPES.includes(companyType)) {
      errors.companyType = `Company type must be one of: ${VALID_COMPANY_TYPES.join(', ')}`;
    }

    // Normalize and validate phone format
    let normalizedPhone;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
        errors.phone = 'Phone number must be 10-15 digits, optionally starting with +';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // --- Check for existing user ---
    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered',
      });
    }

    // --- Create Company + User in a transaction ---
    // Pre-generate IDs to solve the circular dependency:
    // Company requires ownerId, User requires companyId.
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const passwordHash = await hashPassword(password);

    const session = await mongoose.startSession();
    let user;
    let company;

    try {
      session.startTransaction();

      [company] = await Company.create(
        [
          {
            _id: companyId,
            name: businessName.trim(),
            type: companyType,
            ownerId: userId,
          },
        ],
        { session }
      );

      [user] = await User.create(
        [
          {
            _id: userId,
            companyId,
            name: name.trim(),
            phone: normalizedPhone,
            passwordHash,
            role: 'owner',
          },
        ],
        { session }
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // --- Generate token and update last login ---
    const token = generateToken({
      userId: user._id,
      companyId: company._id,
      role: user.role,
    });

    user.lastLoginAt = new Date();
    await user.save();

    setAuthCookies(res, token);

    return res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      company: {
        id: company._id,
        name: company.name,
        type: company.type,
        currency: company.currency,
      },
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong during signup',
    });
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // --- Basic presence validation ---
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required',
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // --- Find user by phone ---
    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    // --- Check if account is disabled ---
    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'This account has been disabled',
      });
    }

    // --- Verify password ---
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    // --- Fetch company ---
    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(500).json({
        success: false,
        message: 'Associated company not found',
      });
    }

    if (company.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your company account has been suspended',
      });
    }

    // --- Generate token and update last login ---
    const token = generateToken({
      userId: user._id,
      companyId: company._id,
      role: user.role,
    });

    user.lastLoginAt = new Date();
    await user.save();

    setAuthCookies(res, token);

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      company: {
        id: company._id,
        name: company.name,
        type: company.type,
        currency: company.currency,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong during login',
    });
  }
};

const logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const baseOptions = {
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };

  res.clearCookie('udhaarhub_token', {
    ...baseOptions,
    httpOnly: true,
  });

  res.clearCookie('udhaarhub_csrf', {
    ...baseOptions,
    httpOnly: false,
  });

  return res.status(200).json({ success: true });
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    const user = await User.findById(userId);
    if (!user || user.status === 'disabled') {
      return res.status(401).json({
        success: false,
        message: 'User not found or account disabled',
      });
    }

    const company = await Company.findById(companyId);
    if (!company || company.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Company not found or suspended',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      company: {
        id: company._id,
        name: company.name,
        type: company.type,
        currency: company.currency,
      },
    });
  } catch (err) {
    console.error('Get me error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching user profile',
    });
  }
};

module.exports = { signup, login, logout, getMe };
