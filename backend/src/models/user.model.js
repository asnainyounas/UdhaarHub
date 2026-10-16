const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true, // Login identifier across the entire system.
      validate: {
        validator(value) {
          return /^\+?[0-9]{10,15}$/.test(value);
        },
        message: 'Phone number must be 10-15 digits, optionally starting with +',
      },
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator(value) {
          if (!value) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Invalid email address',
      },
    },

    // Only the hashed password is stored.
    // Plain-text password validation belongs in the Signup Service/Controller.
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },

    role: {
      type: String,
      required: true,
      default: 'owner',
      enum: {
        values: ['owner', 'staff'],
        message: '{VALUE} is not a valid role',
      },
      // 'staff' is included now for future support.
      // Creation of staff users should be blocked in the service layer
      // until the permissions system is implemented.
    },

    status: {
      type: String,
      required: true,
      default: 'active',
      enum: {
        values: ['active', 'disabled'],
        message: '{VALUE} is not a valid status',
      },
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Frequently used when fetching all users of a company.
userSchema.index({ companyId: 1 });

module.exports = mongoose.model('User', userSchema);