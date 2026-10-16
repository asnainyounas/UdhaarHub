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
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorder user is required'],
    },
    status: {
      type: String,
      required: true,
      default: 'active',
      enum: {
        values: ['active', 'reversed'],
        message: '{VALUE} is not a valid status',
      },
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying
paymentSchema.index({ companyId: 1, debtorId: 1 });
paymentSchema.index({ companyId: 1, status: 1 });
paymentSchema.index({ transactionDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
