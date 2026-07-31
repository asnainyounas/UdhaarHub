const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
      // Overpayment is ALLOWED — a payment can exceed the debtor's current
      // outstanding balance, resulting in a negative balance (advance credit).
      // No cross-check against balance happens here or in the service layer.
    },

    note: {
      type: String,
      trim: true,
      default: '',
      // EDITABLE — same reasoning as Charge.note.
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
      // Can be backdated at creation, never postdated.
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
        message: '{VALUE} is not a valid payment status',
      },
      // Append-only correction pattern, same as Charge: a mistaken payment is
      // never deleted or edited — it's marked 'reversed' and offset by a new
      // entry referencing it via reversalOf.
    },

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  {
    timestamps: true, // createdAt (when entered) + updatedAt (shifts on note edits)
  }
);

// Debtor's ledger view ("show me all payments for this debtor") is the most
// common read pattern, scoped by company for tenant isolation.
paymentSchema.index({ companyId: 1, debtorId: 1 });

// Recalculating a debtor's lastPaymentDate (e.g. after a reversal) means
// finding their most recent *active* payment, sorted by transactionDate —
// this index supports that query directly.
paymentSchema.index({ debtorId: 1, status: 1, transactionDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);