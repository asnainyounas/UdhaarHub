const mongoose = require('mongoose');
const Debtor = require('../models/Debtor.model');
const Charge = require('../models/Charge.model');
const Payment = require('../models/Payment.model');
const { normalizePhone } = require('../utils/phone.util');

const VALID_STATUSES = ['active', 'inactive', 'closed'];

// Helper to escape special regex characters
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const createDebtor = async (req, res) => {
  try {
    const { name, phone, openingBalance, notes } = req.body;
    const companyId = req.user.companyId;

    const errors = {};

    // 1. Validate Name
    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // 2. Validate & Normalize Phone (if provided)
    let normalizedPhone = undefined;
    if (phone && phone.trim() !== '') {
      normalizedPhone = normalizePhone(phone);
      if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
        errors.phone = 'Phone number must be 10-15 digits, optionally starting with +';
      }
    }

    // 3. Validate Opening Balance (robust check)
    let balance = 0;
    if (openingBalance !== undefined && openingBalance !== null) {
      const strVal = String(openingBalance).trim();
      if (strVal !== '') {
        balance = Number(strVal);
        if (isNaN(balance)) {
          errors.openingBalance = 'Opening balance must be a number';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // 4. Check for duplicate phone in this company
    let duplicateWarning = false;
    if (normalizedPhone) {
      const duplicateDebtor = await Debtor.findOne({
        companyId,
        phone: normalizedPhone,
      });
      if (duplicateDebtor) {
        duplicateWarning = true;
      }
    }

    // 5. Create Debtor
    const newDebtor = await Debtor.create({
      companyId,
      name: name.trim(),
      phone: normalizedPhone,
      openingBalance: balance,
      notes: notes ? notes.trim() : '',
    });

    return res.status(201).json({
      success: true,
      data: newDebtor,
      duplicateWarning,
    });
  } catch (err) {
    console.error('Create debtor error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating debtor',
    });
  }
};

const getDebtors = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { companyId };

    // 1. Filter by Status
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      query.status = status;
    }

    // 2. Search by Name (case-insensitive partial match with escaped regex)
    if (search && search.trim() !== '') {
      const escapedSearch = escapeRegex(search.trim());
      query.name = { $regex: escapedSearch, $options: 'i' };
    }

    // 3. Pagination Setup
    const pageNum = Math.max(1, parseInt(page) || 1);
    let limitNum = Math.max(1, parseInt(limit) || 20);
    if (limitNum > 100) limitNum = 100; // Cap limit at 100

    const total = await Debtor.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    const debtors = await Debtor.find(query)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: debtors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Get debtors error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching debtors',
    });
  }
};

const getDebtorById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    const debtor = await Debtor.findOne({ _id: id, companyId });
    if (!debtor) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    return res.status(200).json({ success: true, data: debtor });
  } catch (err) {
    console.error('Get debtor by ID error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching the debtor',
    });
  }
};

const updateDebtor = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    // 2. Strip forbidden fields and keep only allowed updates
    const allowedFields = ['name', 'phone', 'notes'];
    const allowedUpdates = {};
    let hasAllowedFields = false;

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        allowedUpdates[field] = req.body[field];
        hasAllowedFields = true;
      }
    });

    // 3. If no allowed fields are present, return the existing debtor unchanged
    if (!hasAllowedFields) {
      const debtor = await Debtor.findOne({ _id: id, companyId });
      if (!debtor) {
        return res.status(404).json({ success: false, message: 'Debtor not found' });
      }
      return res.status(200).json({ success: true, data: debtor, duplicateWarning: false });
    }

    // 4. Validate Allowed Fields if they are provided
    const errors = {};

    if (allowedUpdates.name !== undefined) {
      if (!allowedUpdates.name || allowedUpdates.name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters';
      } else {
        allowedUpdates.name = allowedUpdates.name.trim();
      }
    }

    if (allowedUpdates.phone !== undefined) {
      if (allowedUpdates.phone && allowedUpdates.phone.trim() !== '') {
        allowedUpdates.phone = normalizePhone(allowedUpdates.phone);
        if (!/^\+?[0-9]{10,15}$/.test(allowedUpdates.phone)) {
          errors.phone = 'Phone number must be 10-15 digits, optionally starting with +';
        }
      } else {
        allowedUpdates.phone = ''; // Empty string if explicitly cleared/set to falsey
      }
    }

    if (allowedUpdates.notes !== undefined) {
      allowedUpdates.notes = allowedUpdates.notes ? allowedUpdates.notes.trim() : '';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // 5. Check for duplicate phone in this company (excluding this debtor)
    let duplicateWarning = false;
    if (allowedUpdates.phone && allowedUpdates.phone.trim() !== '') {
      const duplicateDebtor = await Debtor.findOne({
        companyId,
        phone: allowedUpdates.phone,
        _id: { $ne: id },
      });
      if (duplicateDebtor) {
        duplicateWarning = true;
      }
    }

    // 6. Update the Debtor
    const updatedDebtor = await Debtor.findOneAndUpdate(
      { _id: id, companyId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedDebtor) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    return res.status(200).json({
      success: true,
      data: updatedDebtor,
      duplicateWarning,
    });
  } catch (err) {
    console.error('Update debtor error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating debtor',
    });
  }
};

// ---------------------------------------------------------------------------
// Helper: compute current live balance for a single debtor
// Formula: openingBalance + sum(active Charges) - sum(active Payments)
// ---------------------------------------------------------------------------
const getDebtorBalance = async (companyId, debtorId, openingBalance = 0) => {
  const [chargeAgg, paymentAgg] = await Promise.all([
    Charge.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          debtorId: new mongoose.Types.ObjectId(debtorId),
          status: 'active',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          debtorId: new mongoose.Types.ObjectId(debtorId),
          status: 'active',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalCharges = chargeAgg.length > 0 ? chargeAgg[0].total : 0;
  const totalPayments = paymentAgg.length > 0 ? paymentAgg[0].total : 0;

  return Math.round((openingBalance + totalCharges - totalPayments) * 100) / 100;
};

// ---------------------------------------------------------------------------
// PATCH /api/debtors/:id/status
// Update a debtor's status ('active', 'inactive', 'closed')
// ---------------------------------------------------------------------------
const updateDebtorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { status, confirmClose } = req.body;

    // 1. Validate status enum
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        errors: { status: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
      });
    }

    // 2. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    // 3. Confirm debtor exists and belongs to company
    const debtor = await Debtor.findOne({ _id: id, companyId });
    if (!debtor) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    // 4. If requested status is 'closed', check current balance
    if (status === 'closed') {
      const currentBalance = await getDebtorBalance(companyId, debtor._id, debtor.openingBalance);

      if (currentBalance > 0 && confirmClose !== true) {
        return res.status(409).json({
          success: false,
          message: `Debtor still has an outstanding balance of PKR ${currentBalance}. Confirm to proceed with closing.`,
          currentBalance,
          requiresConfirmation: true,
        });
      }
    }

    // 5. Update status
    debtor.status = status;
    await debtor.save();

    return res.status(200).json({
      success: true,
      data: debtor,
    });
  } catch (err) {
    console.error('Update debtor status error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating debtor status',
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/debtors/:id/ledger
// Full chronological ledger / statement of all Charges and Payments
// (both active and reversed) for a single debtor.
// Query params: page (default 1), limit (default 50), order ('asc' | 'desc', default 'asc')
// ---------------------------------------------------------------------------
const getDebtorLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { page = 1, limit = 50, order = 'asc' } = req.query;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    // 2. Fetch debtor and confirm company ownership
    const debtor = await Debtor.findOne({ _id: id, companyId });
    if (!debtor) {
      return res.status(404).json({ success: false, message: 'Debtor not found' });
    }

    // 3. Concurrently fetch live balance and all Charges & Payments (active + reversed)
    const [currentBalance, charges, payments] = await Promise.all([
      getDebtorBalance(companyId, debtor._id, debtor.openingBalance),
      Charge.find({ companyId, debtorId: id }).lean(),
      Payment.find({ companyId, debtorId: id }).lean(),
    ]);

    // 4. Normalize Charges and Payments into a shared shape
    const chargeEntries = charges.map((c) => ({
      type: 'charge',
      _id: c._id,
      amount: c.amount,
      note: c.note || '',
      status: c.status,
      reversalOf: c.reversalOf || null,
      transactionDate: c.transactionDate,
      createdAt: c.createdAt,
      recordedBy: c.recordedBy,
    }));

    const paymentEntries = payments.map((p) => ({
      type: 'payment',
      _id: p._id,
      amount: p.amount,
      note: p.note || '',
      status: p.status,
      reversalOf: p.reversalOf || null,
      transactionDate: p.transactionDate,
      createdAt: p.createdAt,
      recordedBy: p.recordedBy,
    }));

    // 5. Merge and sort by transactionDate (default asc: oldest first)
    const sortOrder = order === 'desc' ? -1 : 1;
    const merged = [...chargeEntries, ...paymentEntries].sort(
      (a, b) => sortOrder * (new Date(a.transactionDate) - new Date(b.transactionDate))
    );

    // 6. Paginate merged list
    const pageNum = Math.max(1, parseInt(page) || 1);
    let limitNum = Math.max(1, parseInt(limit) || 50);
    if (limitNum > 100) limitNum = 100;

    const total = merged.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginatedLedger = merged.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: {
        debtor: {
          _id: debtor._id,
          name: debtor.name,
          status: debtor.status,
          currentBalance,
        },
        ledger: paginatedLedger,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
    });
  } catch (err) {
    console.error('Get debtor ledger error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching debtor ledger',
    });
  }
};

module.exports = {
  createDebtor,
  getDebtors,
  getDebtorById,
  getDebtorLedger,
  updateDebtor,
  updateDebtorStatus,
};


