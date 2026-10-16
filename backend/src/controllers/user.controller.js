const User = require('../models/User.model');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { normalizePhone } = require('../utils/phone.util');

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, currentPassword, newPassword } = req.body;

    const errors = {};
    const updates = {};

    // --- Format validation (no DB queries yet) ---

    // 1. Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters';
      } else {
        updates.name = name.trim();
      }
    }

    // 2. Validate phone format if provided
    let normalizedPhone;
    if (phone !== undefined) {
      if (!phone || phone.trim() === '') {
        errors.phone = 'Phone number is required';
      } else {
        normalizedPhone = normalizePhone(phone);
        if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
          errors.phone = 'Phone number must be 10-15 digits, optionally starting with +';
        }
      }
    }

    // 3. Validate password change requirements
    if (newPassword !== undefined || currentPassword !== undefined) {
      if (!currentPassword) {
        errors.currentPassword = 'Current password is required to set a new password';
      }
      if (!newPassword) {
        errors.newPassword = 'New password is required when providing current password';
      } else if (newPassword.length < 6) {
        errors.newPassword = 'New password must be at least 6 characters';
      }
    }

    // Return early if format validation failed (before DB queries)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // --- DB operations ---

    // 4. Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 5. If no updates to apply, return existing user unchanged
    const hasPhoneUpdate = normalizedPhone !== undefined;
    const hasPasswordChange = currentPassword && newPassword;
    if (Object.keys(updates).length === 0 && !hasPhoneUpdate && !hasPasswordChange) {
      const userResponse = user.toObject();
      delete userResponse.passwordHash;
      delete userResponse.__v;
      return res.status(200).json({ success: true, data: userResponse });
    }

    // 6. Check phone uniqueness (exclude current user — hard rejection,
    //    since phone is the unique login identifier on User, not a
    //    soft-duplicate-allowed field like it is on Debtor)
    if (normalizedPhone) {
      const existingUser = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          errors: { phone: 'This phone number is already registered to another account' },
        });
      }
      updates.phone = normalizedPhone;
    }

    // 7. Verify current password and hash new one
    if (currentPassword && newPassword) {
      const isMatch = await comparePassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          errors: { currentPassword: 'Current password is incorrect' },
        });
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    // 8. Apply updates and save
    Object.assign(user, updates);
    await user.save();

    // 9. Return updated user (never include passwordHash)
    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.__v;

    return res.status(200).json({ success: true, data: userResponse });
  } catch (err) {
    console.error('Update profile error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating profile',
    });
  }
};

module.exports = { updateProfile };
