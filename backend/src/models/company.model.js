const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
    },

    type: {
      type: String,
      required: [true, 'Company type is required'],
      enum: {
        values: ['shop', 'committee', 'lender', 'other'],
        message: '{VALUE} is not a valid company type',
      },
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },

    currency: {
      type: String,
      required: true,
      default: 'PKR',
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      // Optional field — null/undefined/empty string must all pass.
      // Only validate the format when a real value is actually present.
      validate: {
        validator(value) {
          if (!value) return true;
          return /^\+?[0-9]{10,15}$/.test(value);
        },
        message: 'Phone number must be 10-15 digits, optionally starting with +',
      },
    },

    overdueThresholdDays: {
      type: Number,
      required: true,
      default: 15,
      min: [1, 'Overdue threshold must be at least 1 day'],
      max: [90, 'Overdue threshold must be 90 days or fewer'],
    },

    status: {
      type: String,
      required: true,
      default: 'active',
      enum: {
        values: ['active', 'suspended'],
        message: '{VALUE} is not a valid company status',
      },
    },
  },
  {
    timestamps: true, // gives us createdAt + updatedAt automatically
  }
);

// Owner -> Company lookups happen constantly (e.g. Company.findOne({ ownerId }))
// so this needs to be fast.
companySchema.index({ ownerId: 1 });

// Note: Mongoose's `strict` mode already defaults to true, meaning any field
// not defined in this schema (e.g. a stray "hack": "xyz" in a request body)
// is silently dropped before saving. No need to set it explicitly, but
// calling it out here so the behavior is obvious to anyone reading this file.

module.exports = mongoose.model('Company', companySchema);