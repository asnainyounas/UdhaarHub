const mongoose = require('mongoose');
const Debtor = require('../models/Debtor.model');
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

module.exports = {
  createDebtor,
  getDebtors,
  getDebtorById,
  updateDebtor,
};