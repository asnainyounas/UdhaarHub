const mongoose = require('mongoose');

const chargeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },

    debtorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Debtor',
      required: [true, 'Debtor is required'],
      // LOCKED after creation — never editable. Enforced in the service layer.
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      validate: {
        validator(value) {
          return typeof value === 'number' && value > 0;
        },
        message: 'Amount must be greater than 0',
      },
      // LOCKED after creation — never editable. Enforced in the service layer.
    },

    note: {
      type: String,
      trim: true,
      default: '',
      // EDITABLE — describing what the charge was for doesn't change the
      // financial facts, so this can be updated after creation.
    },

    dueDate: {
      type: Date,
      default: null,
      // Optional — a plain khata entry has none. If set, it's just an
      // expected repayment date, no interest/loan terms attached.
      // EDITABLE — changing an expected date is a different claim than
      // changing how much was owed, so this is allowed to be adjusted.
    },

    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
      validate: {
        validator(value) {
          return value <= new Date();
        },
        message: 'Transaction date cannot be in the future',
      },
      // LOCKED after creation — never editable. Enforced in the service layer.
      // Can be backdated at creation (owner migrating from a notebook), just
      // never postdated.
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recording user is required'],
      // LOCKED after creation — never editable. Enforced in the service layer.
      // Must reference a User whose status is 'active' — checked in the
      // service layer at creation time, not enforceable at the schema level.
    },

    status: {
      type: String,
      required: true,
      default: 'active',
      enum: {
        values: ['active', 'reversed'],
        message: '{VALUE} is not a valid charge status',
      },
      // Append-only correction pattern: a mistaken charge is never deleted or
      // edited on its financial fields — it's marked 'reversed' and offset by
      // a new entry referencing it via reversalOf.
    },

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charge',
      default: null,
      // Set only on the offsetting entry, pointing back to the original
      // mistaken charge it corrects.
    },
  },
  {
    timestamps: true, // createdAt (when entered) + updatedAt (shifts on note/dueDate edits)
  }
);

// Custom cross-field validation: dueDate, if provided, must not be before
// transactionDate — can't be asked to repay before the money was even given.
chargeSchema.pre('validate', function () {
  if (this.dueDate && this.transactionDate && this.dueDate < this.transactionDate) {
    this.invalidate('dueDate', 'Due date cannot be before the transaction date');
  }
});

// Debtor's ledger view ("show me all charges for this debtor") is the most
// common read pattern, scoped by company for tenant isolation.
chargeSchema.index({ companyId: 1, debtorId: 1 });

module.exports = mongoose.model('Charge', chargeSchema);