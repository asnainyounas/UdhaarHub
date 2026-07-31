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
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },

    phone: {
      type: String,
      trim: true,
      // Optional — some debtors won't have a phone on file yet.
      // No uniqueness constraint: two debtors can legitimately share a
      // household phone. Only validate format when a real value is present.
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
      required: true,
      default: 0,
      // Can be negative (rare — means the shop owes the debtor), so no min() cap.
    },

    status: {
      type: String,
      required: true,
      default: 'active',
      enum: {
        values: ['active', 'inactive', 'closed'],
        message: '{VALUE} is not a valid debtor status',
      },
      // active   -> currently owes money, ongoing relationship
      // inactive -> dormant, no current balance, but not deliberately ended
      // closed   -> deliberately ended (settled or written off)
      // All three are reversible — none are a dead end requiring recreation.
    },

    lastPaymentDate: {
      type: Date,
      default: null,
      // Updated by the service layer whenever a Payment is recorded for this
      // debtor (and recalculated, not just cleared, if that payment is later
      // reversed). Used as the fallback overdue signal when a charge has no
      // dueDate of its own: overdue if (today - lastPaymentDate) > company's
      // overdueThresholdDays. Falls back to createdAt below if never paid.
    },

    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt (overdue fallback when lastPaymentDate is null) + updatedAt
  }
);

// Almost every query is scoped by company (e.g. "list all debtors for this shop"),
// often filtered by status too (e.g. "active debtors"), so a compound index here
// covers the most common access pattern.
debtorSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('Debtor', debtorSchema);