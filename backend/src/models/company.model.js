const mongoose = require('mongoose');
const Company = require('../models/Company.model');
const Debtor = require('../models/Debtor.model');
const Charge = require('../models/Charge.model');
const Payment = require('../models/Payment.model');

// ---------------------------------------------------------------------------
// Timezone helpers
//
// The server may run in UTC (or any timezone) while the company operates in
// its own local timezone (e.g. Asia/Karachi). "Today" and "this month" must
// be calculated as calendar boundaries in the COMPANY's timezone, not the
// server's — otherwise payments/charges near midnight get attributed to the
// wrong day/month.
//
// These use only native Intl (no extra dependency like date-fns-tz/luxon).
// ---------------------------------------------------------------------------

// Returns the timezone's offset from UTC, in minutes, at the given instant.
const getTimezoneOffsetMinutes = (timeZone, date) => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map = {};
  parts.forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });

  // Intl sometimes returns hour '24' for midnight — normalise to 0.
  const hour = map.hour === '24' ? 0 : parseInt(map.hour, 10);

  const asUTC = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    hour,
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  );

  return (asUTC - date.getTime()) / 60000;
};

// Returns { year, month (1-12), day } as seen in the given timezone, for "now".
const getLocalDateParts = (timeZone, date = new Date()) => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  parts.forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
  };
};

// Returns a UTC Date instant representing midnight (start of day) in the
// given timezone, for "today" as seen in that timezone.
const getStartOfTodayInTimezone = (timeZone) => {
  const now = new Date();
  const { year, month, day } = getLocalDateParts(timeZone, now);
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, now);
  // Midnight local time, expressed as a UTC instant.
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60000);
};

// Returns { monthStart, monthEnd } as UTC Date instants representing the
// first moment of the current calendar month, and the first moment of next
// month, as seen in the given timezone.
const getMonthBoundsInTimezone = (timeZone) => {
  const now = new Date();
  const { year, month } = getLocalDateParts(timeZone, now);
  const currentOffsetMinutes = getTimezoneOffsetMinutes(timeZone, now);

  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - currentOffsetMinutes * 60000);

  // Next month (handle December -> January rollover)
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;

  // Don't reuse this month's offset for next month's boundary — some
  // timezones change UTC offset between months (DST transitions). Use a
  // guess instant that actually falls inside next month (day 2, to avoid
  // landing exactly on a DST transition edge) to compute the correct
  // offset for that period.
  const guessInstant = new Date(Date.UTC(nextMonthYear, nextMonth - 1, 2, 0, 0, 0));
  const nextMonthOffsetMinutes = getTimezoneOffsetMinutes(timeZone, guessInstant);

  const monthEnd = new Date(
    Date.UTC(nextMonthYear, nextMonth - 1, 1, 0, 0, 0) - nextMonthOffsetMinutes * 60000
  );

  return { monthStart, monthEnd };
};

// ---------------------------------------------------------------------------
// Helper: fetch a company's overdueThresholdDays and timezone with safe
// fallbacks. Uses ?? (nullish coalescing) so an existing company doc that
// predates these fields (undefined, not just missing doc) still gets a
// sane default instead of silently breaking date math.
// ---------------------------------------------------------------------------
const getCompanySettings = async (companyId) => {
  const company = await Company.findById(companyId).select('overdueThresholdDays timezone');
  return {
    overdueThresholdDays: company?.overdueThresholdDays ?? 15,
    timezone: company?.timezone ?? 'Asia/Karachi',
  };
};

// ---------------------------------------------------------------------------
// Helper: build per-debtor balance + overdue data via aggregation
//
// Returns a Map keyed by debtorId (string) with shape:
//   { totalCharges, totalPayments, hasOverdueDueDate, earliestActiveChargeCreatedAt }
//
// "Active" means status === 'active' in both Charge and Payment schemas.
//
// startOfToday must be the COMPANY-timezone-aware start-of-day boundary
// (from getStartOfTodayInTimezone), not a raw `new Date()` — this is what
// makes "due today" NOT count as overdue (overdue starts once the due
// date's calendar day, in the company's timezone, has fully passed).
// ---------------------------------------------------------------------------
const buildDebtorFinancials = async (companyId, debtorIds, startOfToday) => {
  const idFilter = debtorIds
    ? { companyId, debtorId: { $in: debtorIds }, status: 'active' }
    : { companyId, status: 'active' };

  // Aggregate charges per debtor
  const chargeAgg = await Charge.aggregate([
    { $match: idFilter },
    {
      $group: {
        _id: '$debtorId',
        totalCharges: { $sum: '$amount' },
        // Earliest active charge createdAt (fallback reference date)
        earliestChargeCreatedAt: { $min: '$createdAt' },
        // Whether any active charge's dueDate has fully passed (before
        // the start of today, in company-local time) — due today does
        // NOT count.
        hasOverdueDueDate: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', startOfToday] },
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
  const chargeMap = new Map(chargeAgg.map((c) => [c._id.toString(), c]));
  const paymentMap = new Map(paymentAgg.map((p) => [p._id.toString(), p]));

  // Merge into a single financials map
  const allIds = new Set([...chargeMap.keys(), ...paymentMap.keys()]);
  const financials = new Map();

  for (const id of allIds) {
    const c = chargeMap.get(id) || {
      totalCharges: 0,
      earliestChargeCreatedAt: null,
      hasOverdueDueDate: 0,
    };
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
// isOverdue = status !== 'closed'
//             AND currentBalance > 0
//             AND (
//                   (today - referenceDate) > overdueThresholdDays
//                   OR hasOverdueDueDate (already computed with the
//                      company-timezone-aware "due today doesn't count" rule)
//                 )
//
// referenceDate = lastPaymentDate if set, else earliestActiveChargeCreatedAt
//
// Note: the (today - referenceDate) day-count is a raw elapsed-time
// subtraction between two instants, so it does NOT need timezone
// adjustment — the duration between two timestamps is the same regardless
// of which timezone you view it from.
// ---------------------------------------------------------------------------
const computeIsOverdue = (debtor, financials, overdueThresholdDays) => {
  if (debtor.status === 'closed') return false;

  const currentBalance =
    debtor.openingBalance + (financials.totalCharges || 0) - (financials.totalPayments || 0);

  if (currentBalance <= 0) return false;

  const today = new Date();
  const referenceDate = debtor.lastPaymentDate
    ? new Date(debtor.lastPaymentDate)
    : financials.earliestActiveChargeCreatedAt
    ? new Date(financials.earliestActiveChargeCreatedAt)
    : null;

  // No payments and no charges yet — can't be overdue.
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

    // 1. Company settings (with safe fallbacks)
    const { overdueThresholdDays, timezone } = await getCompanySettings(companyId);
    const startOfToday = getStartOfTodayInTimezone(timezone);
    const { monthStart, monthEnd } = getMonthBoundsInTimezone(timezone);

    // 2. Fetch all non-closed debtors for balance and overdue calculations
    const debtors = await Debtor.find({ companyId, status: { $ne: 'closed' } });
    const totalDebtors = await Debtor.countDocuments({ companyId });
    const activeDebtors = await Debtor.countDocuments({ companyId, status: 'active' });

    // 3. Build financials for all non-closed debtors
    const debtorIds = debtors.map((d) => d._id);
    const financials = await buildDebtorFinancials(companyId, debtorIds, startOfToday);

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

    // 5. Total collected this calendar month, in the COMPANY's local
    //    timezone — not the server's — so payments near month-end/month-
    //    start midnight land in the correct month.
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

    const totalCollectedThisMonth = monthlyAgg.length > 0 ? monthlyAgg[0].total : 0;

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

    // 1. Company settings
    const { overdueThresholdDays, timezone } = await getCompanySettings(companyId);
    const startOfToday = getStartOfTodayInTimezone(timezone);

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
    const financials = await buildDebtorFinancials(companyId, debtorIds, startOfToday);

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

    // 1. Company settings
    const { overdueThresholdDays, timezone } = await getCompanySettings(companyId);
    const startOfToday = getStartOfTodayInTimezone(timezone);

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
    const financials = await buildDebtorFinancials(companyId, debtorIds, startOfToday);

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
      Charge.find({ companyId, status: 'active' })
        .sort({ createdAt: -1 }) // sort by when it was RECORDED, not when it happened —
        .limit(fetchCount) // so backdated entries appear where they were actually entered
        .populate('debtorId', 'name')
        .lean(),
      Payment.find({ companyId, status: 'active' })
        .sort({ createdAt: -1 })
        .limit(fetchCount)
        .populate('debtorId', 'name')
        .lean(),
    ]);

    // Normalise into a unified shape. `date` = when it actually happened
    // (transactionDate, shown to the user); `recordedAt` = when it was
    // entered (createdAt, used only for sorting the feed).
    const chargeEntries = charges.map((c) => ({
      type: 'charge',
      _id: c._id,
      debtorId: c.debtorId?._id || c.debtorId,
      debtorName: c.debtorId?.name || null,
      amount: c.amount,
      note: c.note,
      status: c.status,
      date: c.transactionDate,
      recordedAt: c.createdAt,
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
      recordedAt: p.createdAt,
    }));

    // Merge and sort by recordedAt (createdAt) descending — a backdated
    // entry appears where it was actually entered, not scrambled into
    // historical order — then slice to the requested limit.
    const merged = [...chargeEntries, ...paymentEntries]
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
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

// ---------------------------------------------------------------------------
// GET /api/dashboard/upcoming?days=7
// Debtors with an active charge whose dueDate falls between "start of
// today" and "start of today + N days" (company-timezone-aware) — i.e.
// due soon but NOT yet overdue. Since the range starts at today (not
// before), anything already overdue is naturally excluded, keeping this
// section and the Overdue section non-overlapping.
// ---------------------------------------------------------------------------
const getUpcomingDueDates = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    let days = parseInt(req.query.days) || 7;
    if (days < 1) days = 7;
    if (days > 90) days = 90; // sane upper bound

    const { timezone } = await getCompanySettings(companyId);
    const startOfToday = getStartOfTodayInTimezone(timezone);
    const rangeEnd = new Date(startOfToday.getTime() + days * 24 * 60 * 60 * 1000);

    // Find active charges due within the window, joined to their debtor.
    const upcoming = await Charge.aggregate([
      {
        $match: {
          companyId,
          status: 'active',
          dueDate: { $gte: startOfToday, $lt: rangeEnd },
        },
      },
      { $sort: { dueDate: 1 } },
      {
        $lookup: {
          from: 'debtors',
          localField: 'debtorId',
          foreignField: '_id',
          as: 'debtor',
        },
      },
      { $unwind: '$debtor' },
      // Exclude closed debtors from this view too, same as overdue.
      { $match: { 'debtor.status': { $ne: 'closed' } } },
      {
        $project: {
          _id: 0,
          chargeId: '$_id',
          debtorId: '$debtor._id',
          debtorName: '$debtor.name',
          debtorPhone: '$debtor.phone',
          amount: 1,
          note: 1,
          dueDate: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: upcoming,
    });
  } catch (err) {
    console.error('Upcoming due dates error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching upcoming due dates',
    });
  }
};

module.exports = {
  getSummary,
  getDebtorsList,
  getOverdueDebtors,
  getRecentActivity,
  getUpcomingDueDates,
};