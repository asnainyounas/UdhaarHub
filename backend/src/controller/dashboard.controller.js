const mongoose = require('mongoose');
const Company = require('../models/Company.model');
const Debtor = require('../models/Debtor.model');
const Charge = require('../models/Charge.model');
const Payment = require('../models/Payment.model');

// ---------------------------------------------------------------------------
// Helper: build per-debtor balance + overdue data via aggregation
//
// Returns a Map keyed by debtorId (string) with shape:
//   { currentBalance, totalCharges, totalPayments,
//     hasOverdueDueDate, earliestActiveChargeCreatedAt }
//
// "Active" means status === 'active' in both Charge and Payment schemas.
// ---------------------------------------------------------------------------
const buildDebtorFinancials = async (companyId, debtorIds) => {
  const idFilter = debtorIds
    ? { companyId, debtorId: { $in: debtorIds }, status: 'active' }
    : { companyId, status: 'active' };

  const today = new Date();

  // Aggregate charges per debtor
  const chargeAgg = await Charge.aggregate([
    { $match: idFilter },
    {
      $group: {
        _id: '$debtorId',
        totalCharges: { $sum: '$amount' },
        // Earliest active charge createdAt (fallback reference date)
        earliestChargeCreatedAt: { $min: '$createdAt' },
        // Whether any active charge has a dueDate in the past
        hasOverdueDueDate: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', today] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // Aggregate payments per debtor
  const paymentAgg = await Payment.aggregate([
    { $match: idFilter },
    {
      $group: {
        _id: '$debtorId',
        totalPayments: { $sum: '$amount' },
      },
    },
  ]);

  // Build lookup maps
  const chargeMap = new Map(
    chargeAgg.map((c) => [c._id.toString(), c])
  );
  const paymentMap = new Map(
    paymentAgg.map((p) => [p._id.toString(), p])
  );

  // Merge into a single financials map
  const allIds = new Set([...chargeMap.keys(), ...paymentMap.keys()]);
  const financials = new Map();

  for (const id of allIds) {
    const c = chargeMap.get(id) || { totalCharges: 0, earliestChargeCreatedAt: null, hasOverdueDueDate: 0 };
    const p = paymentMap.get(id) || { totalPayments: 0 };
    financials.set(id, {
      totalCharges: c.totalCharges,
      totalPayments: p.totalPayments,
      earliestActiveChargeCreatedAt: c.earliestChargeCreatedAt,
      hasOverdueDueDate: c.hasOverdueDueDate > 0,
    });
  }

  return financials;
};

// ---------------------------------------------------------------------------
// Helper: determine isOverdue for a single debtor
//
// Rule (from spec):
//   isOverdue = status !== 'closed'
//               AND currentBalance > 0
//               AND (
//                     (today - referenceDate) > overdueThresholdDays
//                     OR EXISTS active Charge where dueDate < today
//                   )
//
//   referenceDate = lastPaymentDate if set, else earliestActiveChargeCreatedAt
// ---------------------------------------------------------------------------
const computeIsOverdue = (debtor, financials, overdueThresholdDays) => {
  if (debtor.status === 'closed') return false;

  const currentBalance =
    debtor.openingBalance +
    (financials.totalCharges || 0) -
    (financials.totalPayments || 0);

  if (currentBalance <= 0) return false;

  const today = new Date();
  const referenceDate = debtor.lastPaymentDate
    ? new Date(debtor.lastPaymentDate)
    : financials.earliestActiveChargeCreatedAt
    ? new Date(financials.earliestActiveChargeCreatedAt)
    : null;

  // If there's no referenceDate (no payments and no charges), can't be overdue
  if (!referenceDate) return false;

  const daysDiff = (today - referenceDate) / (1000 * 60 * 60 * 24);

  return daysDiff > overdueThresholdDays || financials.hasOverdueDueDate;
};

// ---------------------------------------------------------------------------
// Helper: compute currentBalance for a single debtor
// ---------------------------------------------------------------------------
const computeBalance = (debtor, financials) => {
  return (
    debtor.openingBalance +
    (financials ? financials.totalCharges || 0 : 0) -
    (financials ? financials.totalPayments || 0 : 0)
  );
};

// ---------------------------------------------------------------------------
// GET /api/dashboard/summary
// ---------------------------------------------------------------------------
const getSummary = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);

    // 1. Fetch company for overdueThresholdDays
    const company = await Company.findById(companyId).select('overdueThresholdDays');
    const overdueThresholdDays = company ? company.overdueThresholdDays : 15;

    // 2. Fetch all non-closed debtors for balance and overdue calculations
    const debtors = await Debtor.find({ companyId, status: { $ne: 'closed' } });
    const totalDebtors = await Debtor.countDocuments({ companyId });
    const activeDebtors = await Debtor.countDocuments({ companyId, status: 'active' });

    // 3. Build financials for all non-closed debtors
    const debtorIds = debtors.map((d) => d._id);
    const financials = await buildDebtorFinancials(companyId, debtorIds);

    // 4. Compute per-debtor balance and overdue
    let totalOutstandingBalance = 0;
    let overdueDebtorsCount = 0;
    let totalOverdueAmount = 0;

    for (const debtor of debtors) {
      const fin = financials.get(debtor._id.toString()) || {
        totalCharges: 0,
        totalPayments: 0,
        earliestActiveChargeCreatedAt: null,
        hasOverdueDueDate: false,
      };

      const balance = computeBalance(debtor, fin);
      // Sum all balances (including negatives — no clamping per spec)
      totalOutstandingBalance += balance;

      const isOverdue = computeIsOverdue(debtor, fin, overdueThresholdDays);
      if (isOverdue) {
        overdueDebtorsCount += 1;
        totalOverdueAmount += balance;
      }
    }

    // 5. Total collected this calendar month (non-reversed payments)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthlyAgg = await Payment.aggregate([
      {
        $match: {
          companyId,
          status: 'active',
          transactionDate: { $gte: monthStart, $lt: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalCollectedThisMonth =
      monthlyAgg.length > 0 ? monthlyAgg[0].total : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalDebtors,
        activeDebtors,
        totalOutstandingBalance: Math.round(totalOutstandingBalance * 100) / 100,
        overdueDebtorsCount,
        totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
        totalCollectedThisMonth,
      },
    });
  } catch (err) {
    console.error('Dashboard summary error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching dashboard summary',
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/dashboard/debtors
// Paginated debtor list with live currentBalance and isOverdue.
// Query params: status, isOverdue, search, sortBy, order, page, limit
// ---------------------------------------------------------------------------
const getDebtorsList = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    const {
      status,
      isOverdue,
      search,
      sortBy = 'name',
      order = 'asc',
      page = 1,
      limit = 20,
    } = req.query;

    // 1. Fetch company for overdueThresholdDays
    const company = await Company.findById(companyId).select('overdueThresholdDays');
    const overdueThresholdDays = company ? company.overdueThresholdDays : 15;

    // 2. Build Mongoose query for debtors
    const VALID_STATUSES = ['active', 'inactive', 'closed'];
    const query = { companyId };

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      query.status = status;
    }

    if (search && search.trim() !== '') {
      const escaped = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    // 3. Fetch ALL matching debtors to compute live balance/overdue
    //    (pagination happens after enrichment because isOverdue filter requires live data)
    const allDebtors = await Debtor.find(query).lean();
    const debtorIds = allDebtors.map((d) => d._id);

    // 4. Build financials for all matching debtors
    const financials = await buildDebtorFinancials(companyId, debtorIds);

    // 5. Enrich with currentBalance and isOverdue
    let enriched = allDebtors.map((debtor) => {
      const fin = financials.get(debtor._id.toString()) || {
        totalCharges: 0,
        totalPayments: 0,
        earliestActiveChargeCreatedAt: null,
        hasOverdueDueDate: false,
      };
      const currentBalance = computeBalance(debtor, fin);
      const isOverdueVal = computeIsOverdue(debtor, fin, overdueThresholdDays);
      return { ...debtor, currentBalance, isOverdue: isOverdueVal };
    });

    // 6. Apply isOverdue filter if requested
    if (isOverdue !== undefined) {
      const filterOverdue = isOverdue === 'true';
      enriched = enriched.filter((d) => d.isOverdue === filterOverdue);
    }

    // 7. Sort
    const VALID_SORT_FIELDS = ['balance', 'lastPaymentDate', 'name'];
    const sortField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'name';
    const sortOrder = order === 'desc' ? -1 : 1;

    enriched.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'balance') {
        aVal = a.currentBalance;
        bVal = b.currentBalance;
      } else if (sortField === 'lastPaymentDate') {
        aVal = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
        bVal = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
      } else {
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        return sortOrder * aVal.localeCompare(bVal);
      }
      return sortOrder * (aVal - bVal);
    });

    // 8. Paginate
    const pageNum = Math.max(1, parseInt(page) || 1);
    let limitNum = Math.max(1, parseInt(limit) || 20);
    if (limitNum > 100) limitNum = 100;

    const total = enriched.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginated = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (err) {
    console.error('Dashboard debtors list error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching debtors list',
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/dashboard/overdue
// Pre-filtered to isOverdue: true only.
// Uses aggregation to identify overdue debtors efficiently.
// Query params: search, sortBy, order, page, limit
// ---------------------------------------------------------------------------
const getOverdueDebtors = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    const {
      search,
      sortBy = 'balance',
      order = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    // 1. Fetch company for overdueThresholdDays
    const company = await Company.findById(companyId).select('overdueThresholdDays');
    const overdueThresholdDays = company ? company.overdueThresholdDays : 15;

    // 2. Fetch non-closed debtors (only non-closed can be overdue)
    const query = { companyId, status: { $ne: 'closed' } };
    if (search && search.trim() !== '') {
      const escaped = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const allDebtors = await Debtor.find(query).lean();
    const debtorIds = allDebtors.map((d) => d._id);

    // 3. Build financials
    const financials = await buildDebtorFinancials(companyId, debtorIds);

    // 4. Enrich and filter to overdue only
    let overdueDebtors = allDebtors
      .map((debtor) => {
        const fin = financials.get(debtor._id.toString()) || {
          totalCharges: 0,
          totalPayments: 0,
          earliestActiveChargeCreatedAt: null,
          hasOverdueDueDate: false,
        };
        const currentBalance = computeBalance(debtor, fin);
        const isOverdueVal = computeIsOverdue(debtor, fin, overdueThresholdDays);
        return { ...debtor, currentBalance, isOverdue: isOverdueVal };
      })
      .filter((d) => d.isOverdue === true);

    // 5. Sort
    const VALID_SORT_FIELDS = ['balance', 'lastPaymentDate', 'name'];
    const sortField = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'balance';
    const sortOrder = order === 'desc' ? -1 : 1;

    overdueDebtors.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'balance') {
        aVal = a.currentBalance;
        bVal = b.currentBalance;
      } else if (sortField === 'lastPaymentDate') {
        aVal = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
        bVal = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
      } else {
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        return sortOrder * aVal.localeCompare(bVal);
      }
      return sortOrder * (aVal - bVal);
    });

    // 6. Paginate
    const pageNum = Math.max(1, parseInt(page) || 1);
    let limitNum = Math.max(1, parseInt(limit) || 20);
    if (limitNum > 100) limitNum = 100;

    const total = overdueDebtors.length;
    const totalPages = Math.ceil(total / limitNum);
    const paginated = overdueDebtors.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (err) {
    console.error('Dashboard overdue error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching overdue debtors',
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/dashboard/recent-activity
// Merged, date-sorted feed of recent Charges and Payments for the company.
// Query param: limit (default 10)
// ---------------------------------------------------------------------------
const getRecentActivity = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    let limitNum = Math.max(1, parseInt(req.query.limit) || 10);
    if (limitNum > 100) limitNum = 100;

    // Fetch recent charges and payments in parallel, fetch more than limit
    // to allow accurate merging before slicing
    const fetchCount = limitNum * 2;

    const [charges, payments] = await Promise.all([
      Charge.find({ companyId })
        .sort({ transactionDate: -1 })
        .limit(fetchCount)
        .populate('debtorId', 'name')
        .lean(),
      Payment.find({ companyId })
        .sort({ transactionDate: -1 })
        .limit(fetchCount)
        .populate('debtorId', 'name')
        .lean(),
    ]);

    // Normalise into a unified shape
    const chargeEntries = charges.map((c) => ({
      type: 'charge',
      _id: c._id,
      debtorId: c.debtorId?._id || c.debtorId,
      debtorName: c.debtorId?.name || null,
      amount: c.amount,
      note: c.note,
      status: c.status,
      date: c.transactionDate,
    }));

    const paymentEntries = payments.map((p) => ({
      type: 'payment',
      _id: p._id,
      debtorId: p.debtorId?._id || p.debtorId,
      debtorName: p.debtorId?.name || null,
      amount: p.amount,
      note: p.note,
      status: p.status,
      date: p.transactionDate,
    }));

    // Merge and sort by date descending, then slice to requested limit
    const merged = [...chargeEntries, ...paymentEntries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limitNum);

    return res.status(200).json({
      success: true,
      data: merged,
    });
  } catch (err) {
    console.error('Recent activity error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching recent activity',
    });
  }
};

module.exports = {
  getSummary,
  getDebtorsList,
  getOverdueDebtors,
  getRecentActivity,
};
