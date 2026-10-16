const mongoose = require('mongoose');

const User = require('../models/User.model');
const Company = require('../models/Company.model');

const {
  hashPassword,
  comparePassword,
} = require('../utils/password.util');

const { generateToken } = require('../utils/token.util');
const { normalizePhone } = require('../utils/phone.util');

const VALID_COMPANY_TYPES = ['shop', 'committee', 'lender', 'other'];

// ============================================================
// SIGNUP
// ============================================================

const signup = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const phone = req.body.phone?.trim();
    const password = req.body.password;
    const businessName = req.body.businessName?.trim();
    const companyType = req.body.companyType?.trim().toLowerCase();

    // --------------------------------------------------------
    // Input validation
    // --------------------------------------------------------

    const errors = {};

    if (!name || name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!phone) {
      errors.phone = 'Phone number is required';
    }

    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!businessName || businessName.length < 2) {
      errors.businessName = 'Business name must be at least 2 characters';
    }

    if (!companyType || !VALID_COMPANY_TYPES.includes(companyType)) {
      errors.companyType = `Company type must be one of: ${VALID_COMPANY_TYPES.join(
        ', '
      )}`;
    }

    // --------------------------------------------------------
    // Normalize and validate phone
    // --------------------------------------------------------

    let normalizedPhone;

    if (phone) {
      normalizedPhone = normalizePhone(phone);

      if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
        errors.phone =
          'Phone number must be 10-15 digits, optionally starting with +';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    // --------------------------------------------------------
    // Check for existing user
    // --------------------------------------------------------

    const existingUser = await User.findOne({
      phone: normalizedPhone,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered',
      });
    }

    // --------------------------------------------------------
    // Create Company + User atomically
    // --------------------------------------------------------

    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const session = await mongoose.startSession();

    let user;
    let company;

    try {
      session.startTransaction();

      // Hash password inside the transaction.
      // The raw password is never stored.
      const passwordHash = await hashPassword(password);

      // Create Company.
      // ownerId can already point to the future User because
      // we generated the User ID before creating either document.
      [company] = await Company.create(
        [
          {
            _id: companyId,
            name: businessName,
            type: companyType,
            ownerId: userId,
          },
        ],
        { session }
      );

      // Create User.
      [user] = await User.create(
        [
          {
            _id: userId,
            companyId: companyId,
            name,
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
      await session.endSession();
    }

    // --------------------------------------------------------
    // Generate JWT
    // --------------------------------------------------------

    const token = generateToken({
      userId: user._id,
      companyId: company._id,
      role: user.role,
    });

    // Signup automatically logs the user in.
    user.lastLoginAt = new Date();
    await user.save();

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      token,

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
    // MongoDB duplicate-key error.
    // This protects against two signup requests arriving
    // at nearly the same time.
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered',
      });
    }

    console.error('Signup error:', err);

    return res.status(500).json({
      success: false,
      message: 'Something went wrong during signup',
    });
  }
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res) => {
  try {
    const phone = req.body.phone?.trim();
    const password = req.body.password;

    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required',
      });
    }

    // --------------------------------------------------------
    // Normalize phone
    // --------------------------------------------------------

    const normalizedPhone = normalizePhone(phone);

    // --------------------------------------------------------
    // Find user
    // --------------------------------------------------------

    const user = await User.findOne({
      phone: normalizedPhone,
    });

    // Don't reveal whether the phone number exists.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    // --------------------------------------------------------
    // Check user status
    // --------------------------------------------------------

    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'This account has been disabled',
      });
    }

    // --------------------------------------------------------
    // Verify password
    // --------------------------------------------------------

    const isMatch = await comparePassword(
      password,
      user.passwordHash
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    // --------------------------------------------------------
    // Fetch associated company
    // --------------------------------------------------------

    const company = await Company.findById(user.companyId);

    if (!company) {
      console.error(
        `User ${user._id} references missing company ${user.companyId}`
      );

      return res.status(500).json({
        success: false,
        message: 'Unable to load your company account',
      });
    }

    // --------------------------------------------------------
    // Check company status
    // --------------------------------------------------------

    if (company.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your company account has been suspended',
      });
    }

    // --------------------------------------------------------
    // Generate JWT
    // --------------------------------------------------------

    const token = generateToken({
      userId: user._id,
      companyId: company._id,
      role: user.role,
    });

    // --------------------------------------------------------
    // Update last login
    // --------------------------------------------------------

    user.lastLoginAt = new Date();
    await user.save();

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      token,

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
    console.error('Login error:', err);

    return res.status(500).json({
      success: false,
      message: 'Something went wrong during login',
    });
  }
};

// ============================================================
// LOGOUT
// ============================================================

const logout = async (req, res) => {
  // JWT is stateless in V1.
  // No server-side token deletion is required.
  // The client deletes the token from localStorage.

  return res.status(200).json({
    success: true,
  });
};

module.exports = {
  signup,
  login,
  logout,
};