const mongoose = require('mongoose');
const Payment = require('../models/Payment.model');
const Debtor = require('../models/Debtor.model');

const VALID_STATUSES = ['active', 'reversed'];

const createPayment = async (req, res) => {
  try {
    const { debtorId, amount, note, transactionDate } = req.body;
    const companyId = req.user.companyId;
    const recordedBy = req.user.userId;

    const errors = {};

    // 1. Validate Debtor ID
    if (!debtorId) {
      errors.debtorId = 'Debtor ID is required';
    } else if (!mongoose.Types.ObjectId.isValid(debtorId)) {
      return res.status(400).json({
        success: false,
        errors: { debtorId: 'Invalid debtor ID' },
      });
    }

    // 2. Validate Amount (convert numeric string to Number, reject non-finite or <= 0)
    let parsedAmount;
    if (amount === undefined || amount === null || amount === '') {
      errors.amount = 'Amount is required';
    } else {
      parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        errors.amount = 'Amount must be a positive number';
      }
    }

    // 3. Validate Note
    let parsedNote = '';
    if (note !== undefined && note !== null) {
      if (typeof note !== 'string') {
        errors.note = 'Note must be a string';
      } else {
        parsedNote = note.trim();
      }
    }

    // 4. Validate Transaction Date
    let parsedTxDate = new Date();
    if (transactionDate) {
      parsedTxDate = new Date(transactionDate);
      if (isNaN(parsedTxDate.getTime())) {
        errors.transactionDate = 'Invalid transaction date format';
      } else if (parsedTxDate > new Date()) {
        errors.transactionDate = 'Transaction date cannot be in the future';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // 5. Verify debtor exists and belongs to company
    const debtor = await Debtor.findOne({ _id: debtorId, companyId });
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Debtor not found',
      });
    }

    // 6. Create Payment
    const newPayment = await Payment.create({
      companyId,
      debtorId,
      amount: parsedAmount,
      note: parsedNote,
      transactionDate: parsedTxDate,
      recordedBy,
      status: 'active',
    });

    // 7. Update debtor's lastPaymentDate only if this transactionDate is more recent
    if (!debtor.lastPaymentDate || parsedTxDate > new Date(debtor.lastPaymentDate)) {
      debtor.lastPaymentDate = parsedTxDate;
      await debtor.save();
    }

    return res.status(201).json({
      success: true,
      data: newPayment,
    });
  } catch (err) {
    console.error('Create payment error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating payment',
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { debtorId, status, page = 1, limit = 20 } = req.query;

    const query = { companyId };

    // 1. Filter by Debtor ID
    if (debtorId) {
      if (!mongoose.Types.ObjectId.isValid(debtorId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid debtorId query parameter format',
        });
      }
      query.debtorId = debtorId;
    }

    // 2. Filter by Status
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      query.status = status;
    }

    // 3. Pagination Setup
    const pageNum = Math.max(1, parseInt(page) || 1);
    let limitNum = Math.max(1, parseInt(limit) || 20);
    if (limitNum > 100) limitNum = 100;

    const total = await Payment.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    const payments = await Payment.find(query)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ transactionDate: -1 });

    return res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Get payments error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching payments',
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = await Payment.findOne({ _id: id, companyId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    console.error('Get payment by ID error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching the payment',
    });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // 2. Filter allowed fields (only 'note' is editable)
    const allowedFields = ['note'];
    const allowedUpdates = {};
    let hasAllowedFields = false;

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        allowedUpdates[field] = req.body[field];
        hasAllowedFields = true;
      }
    });

    // 3. Fetch existing payment to verify presence and status
    const existingPayment = await Payment.findOne({ _id: id, companyId });
    if (!existingPayment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // 4. Return unchanged if no allowed fields are present in request
    if (!hasAllowedFields) {
      return res.status(200).json({ success: true, data: existingPayment });
    }

    // 5. Block update if payment is reversed
    if (existingPayment.status === 'reversed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a reversed payment',
      });
    }

    // 6. Validate allowed updates
    const errors = {};

    if (allowedUpdates.note !== undefined) {
      if (typeof allowedUpdates.note !== 'string') {
        errors.note = 'Note must be a string';
      } else {
        allowedUpdates.note = allowedUpdates.note.trim();
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // 7. Update payment
    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: id, companyId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, data: updatedPayment });
  } catch (err) {
    console.error('Update payment error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating payment',
    });
  }
};

const reversePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const companyId = req.user.companyId;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // 2. Validate Reversal Reason
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Reversal reason must be a string with at least 3 characters',
      });
    }

    const trimmedReason = reason.trim();

    // 3. Find Payment
    const payment = await Payment.findOne({ _id: id, companyId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // 4. Check if already reversed
    if (payment.status === 'reversed') {
      return res.status(400).json({
        success: false,
        message: 'This payment has already been reversed',
      });
    }

    // 5. Apply Reversal
    payment.status = 'reversed';
    const originalNote = payment.note || '';
    payment.note = originalNote
      ? `${originalNote} [REVERSED: ${trimmedReason}]`
      : `[REVERSED: ${trimmedReason}]`;

    await payment.save();

    // 6. Recalculate debtor's lastPaymentDate based on remaining active payments
    const debtor = await Debtor.findOne({ _id: payment.debtorId, companyId });
    if (debtor) {
      const latestActivePayment = await Payment.findOne({
        debtorId: payment.debtorId,
        companyId,
        status: 'active',
      }).sort({ transactionDate: -1 });

      debtor.lastPaymentDate = latestActivePayment ? latestActivePayment.transactionDate : null;
      await debtor.save();
    }

    return res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment reversed successfully',
    });
  } catch (err) {
    console.error('Reverse payment error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while reversing payment',
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  reversePayment,
};