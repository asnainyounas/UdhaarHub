const mongoose = require('mongoose');

const debtorSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },
    name: {
      type: String,
      required: [true, 'Debtor name is required'],
      trim: true,
      minlength: [2, 'Debtor name must be at least 2 characters'],
    },
    phone: {
      type: String,
      trim: true,
      // Optional field, validate only if populated
      validate: {
        validator(value) {
          if (!value) return true;
          return /^\+?[0-9]{10,15}$/.test(value);
        },
        message: 'Phone number must be 10-15 digits, optionally starting with +',
      },
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      default: 'active',
      enum: {
        values: ['active', 'inactive', 'closed'],
        message: '{VALUE} is not a valid status',
      },
    },
    lastPaymentDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Optimize search by companyId and phone
debtorSchema.index({ companyId: 1, phone: 1 });
debtorSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('Debtor', debtorSchema);
