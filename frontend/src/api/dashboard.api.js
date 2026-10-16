import axiosClient from './axiosClient';

/**
 * GET /api/dashboard/summary
 * @returns {{ totalDebtors, activeDebtors, totalOutstandingBalance, overdueDebtorsCount, totalOverdueAmount, totalCollectedThisMonth }}
 */
export const getSummary = async () => {
  const response = await axiosClient.get('/dashboard/summary');
  return response.data;
};

/**
 * GET /api/dashboard/debtors
 * Used for the empty-state check (total === 0 means brand-new company).
 * @param {{ page?, limit? }} params
 * @returns {{ data: Debtor[], pagination: { page, limit, total, totalPages } }}
 */
export const getDebtorsList = async (params = {}) => {
  const response = await axiosClient.get('/dashboard/debtors', { params });
  return response.data;
};

/**
 * GET /api/dashboard/overdue
 * Pre-filtered and sorted by balance desc (most owed first) by the backend.
 * @param {{ limit? }} params
 * @returns {{ data: OverdueDebtor[], pagination }}
 */
export const getOverdueDebtors = async (params = {}) => {
  const response = await axiosClient.get('/dashboard/overdue', { params });
  return response.data;
};

/**
 * GET /api/dashboard/recent-activity
 * @param {{ limit? }} params – default limit 20
 * @returns {{ data: ActivityEntry[] }}
 * ActivityEntry: { type: 'charge'|'payment', debtorName, amount, note, date, recordedAt }
 */
export const getRecentActivity = async (params = { limit: 20 }) => {
  const response = await axiosClient.get('/dashboard/recent-activity', { params });
  return response.data;
};

/**
 * GET /api/dashboard/upcoming
 * Charges with dueDate in the next N days, sorted by dueDate asc.
 * @param {{ days? }} params – default 7
 * @returns {{ data: UpcomingEntry[] }}
 * UpcomingEntry: { chargeId, debtorId, debtorName, debtorPhone, amount, note, dueDate }
 */
export const getUpcomingDueDates = async (params = { days: 7 }) => {
  const response = await axiosClient.get('/dashboard/upcoming', { params });
  return response.data;
};
