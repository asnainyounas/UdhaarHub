const mongoose = require('mongoose');
const Charge = require('../models/Charge.model');
const Debtor = require('../models/Debtor.model');

const VALID_STATUSES = ['active', 'reversed'];

const createCharge = async (req, res) => {
  try {
    const { debtorId, amount, note, transactionDate, dueDate } = req.body;
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

    // 2. Validate Amount
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

    // 5. Validate Due Date
    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        errors.dueDate = 'Invalid due date format';
      } else if (!isNaN(parsedTxDate.getTime()) && parsedDueDate < parsedTxDate) {
        errors.dueDate = 'Due date must not be before transaction date';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // 6. Verify debtor exists and belongs to company
    const debtor = await Debtor.findOne({ _id: debtorId, companyId });
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Debtor not found',
      });
    }

    // 7. Create Charge
    const newCharge = await Charge.create({
      companyId,
      debtorId,
      amount: parsedAmount,
      note: parsedNote,
      transactionDate: parsedTxDate,
      dueDate: parsedDueDate,
      recordedBy,
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      data: newCharge,
    });
  } catch (err) {
    console.error('Create charge error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating charge',
    });
  }
};

const getCharges = async (req, res) => {
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

    const total = await Charge.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    const charges = await Charge.find(query)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ transactionDate: -1 });

    return res.status(200).json({
      success: true,
      data: charges,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Get charges error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching charges',
    });
  }
};

const getChargeById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Charge not found' });
    }

    const charge = await Charge.findOne({ _id: id, companyId });
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' });
    }

    return res.status(200).json({ success: true, data: charge });
  } catch (err) {
    console.error('Get charge by ID error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching the charge',
    });
  }
};

const updateCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Charge not found' });
    }

    // 2. Filter allowed fields
    const allowedFields = ['note', 'dueDate'];
    const allowedUpdates = {};
    let hasAllowedFields = false;

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        allowedUpdates[field] = req.body[field];
        hasAllowedFields = true;
      }
    });

    // 3. Fetch existing charge to verify presence and state
    const existingCharge = await Charge.findOne({ _id: id, companyId });
    if (!existingCharge) {
      return res.status(404).json({ success: false, message: 'Charge not found' });
    }

    // 4. Return unchanged if no allowed fields are sent
    if (!hasAllowedFields) {
      return res.status(200).json({ success: true, data: existingCharge });
    }

    // 5. Block update if already reversed
    if (existingCharge.status === 'reversed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a reversed charge',
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

    if (allowedUpdates.dueDate !== undefined) {
      if (allowedUpdates.dueDate === null || allowedUpdates.dueDate === '') {
        allowedUpdates.dueDate = null;
      } else {
        const parsedDueDate = new Date(allowedUpdates.dueDate);
        const txDate = new Date(existingCharge.transactionDate);
        if (isNaN(parsedDueDate.getTime())) {
          errors.dueDate = 'Invalid due date format';
        } else if (parsedDueDate < txDate) {
          errors.dueDate = 'Due date must not be before transaction date';
        } else {
          allowedUpdates.dueDate = parsedDueDate;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // 7. Update charge
    const updatedCharge = await Charge.findOneAndUpdate(
      { _id: id, companyId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, data: updatedCharge });
  } catch (err) {
    console.error('Update charge error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating charge',
    });
  }
};

const reverseCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const companyId = req.user.companyId;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Charge not found' });
    }

    // 2. Validate Reversal Reason
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Reversal reason must be a string with at least 3 characters',
      });
    }

    const trimmedReason = reason.trim();

    // 3. Find Charge
    const charge = await Charge.findOne({ _id: id, companyId });
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' });
    }

    // 4. Check if already reversed
    if (charge.status === 'reversed') {
      return res.status(400).json({
        success: false,
        message: 'This charge has already been reversed',
      });
    }

    // 5. Apply Reversal
    charge.status = 'reversed';
    const originalNote = charge.note || '';
    charge.note = originalNote
      ? `${originalNote} [REVERSED: ${trimmedReason}]`
      : `[REVERSED: ${trimmedReason}]`;

    await charge.save();

    return res.status(200).json({
      success: true,
      data: charge,
      message: 'Charge reversed successfully',
    });
  } catch (err) {
    console.error('Reverse charge error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while reversing charge',
    });
  }
};

module.exports = {
  createCharge,
  getCharges,
  getChargeById,
  updateCharge,
  reverseCharge,
};