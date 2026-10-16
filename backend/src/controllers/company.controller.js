const mongoose = require('mongoose');
const Company = require('../models/Company.model');

const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // 1. Role check — only owner can update company settings
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only the business owner can update company settings',
      });
    }

    // 2. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // 3. Confirm URL ID matches the user's own company (return 404, not 403,
    //    to avoid confirming whether another company ID exists)
    if (id.toString() !== companyId.toString()) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // 4. Strip forbidden fields and keep only allowed updates
    const allowedFields = ['name', 'currency', 'overdueThresholdDays'];
    const allowedUpdates = {};
    let hasAllowedFields = false;

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        allowedUpdates[field] = req.body[field];
        hasAllowedFields = true;
      }
    });

    // 5. If no allowed fields are present, return the existing company unchanged
    if (!hasAllowedFields) {
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }
      return res.status(200).json({ success: true, data: company });
    }

    // 6. Validate allowed fields if they are provided
    const errors = {};

    if (allowedUpdates.name !== undefined) {
      if (!allowedUpdates.name || allowedUpdates.name.trim().length < 2) {
        errors.name = 'Company name must be at least 2 characters';
      } else {
        allowedUpdates.name = allowedUpdates.name.trim();
      }
    }

    if (allowedUpdates.currency !== undefined) {
      if (!allowedUpdates.currency || typeof allowedUpdates.currency !== 'string' || allowedUpdates.currency.trim().length === 0) {
        errors.currency = 'Currency is required';
      } else {
        allowedUpdates.currency = allowedUpdates.currency.trim();
      }
    }

    if (allowedUpdates.overdueThresholdDays !== undefined) {
      const val = Number(allowedUpdates.overdueThresholdDays);
      if (!Number.isFinite(val) || !Number.isInteger(val) || val < 1 || val > 90) {
        errors.overdueThresholdDays = 'Overdue threshold must be an integer between 1 and 90';
      } else {
        allowedUpdates.overdueThresholdDays = val;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // 7. Update the Company
    const updatedCompany = await Company.findOneAndUpdate(
      { _id: companyId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    return res.status(200).json({ success: true, data: updatedCompany });
  } catch (err) {
    console.error('Update company error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating company settings',
    });
  }
};

const getCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // 2. Confirm URL ID matches the user's own company (return 404, not 403,
    //    to avoid confirming whether another company ID exists)
    if (id.toString() !== companyId.toString()) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // 3. Fetch company document excluding internal Mongoose versioning
    const company = await Company.findById(companyId).select('-__v');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    return res.status(200).json({ success: true, data: company });
  } catch (err) {
    console.error('Get company error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching company settings',
    });
  }
};

module.exports = { getCompany, updateCompany };

