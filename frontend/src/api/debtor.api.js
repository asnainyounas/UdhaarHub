import axiosClient from './axiosClient';

/**
 * GET /api/dashboard/debtors
 * Paginated debtor list with live currentBalance and isOverdue.
 * This is the correct endpoint for the Debtor List page — it enriches each
 * debtor with computed balance and overdue status that the raw /api/debtors
 * endpoint does not provide.
 *
 * @param {{ status?, search?, sortBy?, order?, page?, limit?, isOverdue? }} params
 * @returns {{ success, data: EnrichedDebtor[], pagination: { page, limit, total, totalPages } }}
 * EnrichedDebtor: { _id, name, phone, openingBalance, status, lastPaymentDate,
 *                   notes, currentBalance, isOverdue, createdAt, updatedAt }
 */
export const getDebtorsList = async (params = {}) => {
  const response = await axiosClient.get('/dashboard/debtors', { params });
  return response.data;
};

/**
 * GET /api/debtors/:id
 * Single debtor by ID. Note: does NOT include currentBalance — that comes
 * from the ledger endpoint. Use for page context / name display only.
 *
 * @param {string} id
 * @returns {{ success, data: Debtor }}
 */
export const getDebtorById = async (id) => {
  const response = await axiosClient.get(`/debtors/${id}`);
  return response.data;
};

/**
 * POST /api/debtors
 * Create a new debtor.
 *
 * @param {{ name, phone?, openingBalance?, notes? }} body
 * @returns {{ success, data: Debtor, duplicateWarning: boolean }}
 * 400 → throws with error.response.data = { success: false, errors: { name?, phone?, openingBalance? } }
 */
export const createDebtor = async (body) => {
  const response = await axiosClient.post('/debtors', body);
  return response.data;
};

/**
 * GET /api/debtors/:id/ledger
 * Full chronological ledger for a debtor, including currentBalance in the
 * debtor sub-document.
 *
 * @param {string} id
 * @param {{ page?, limit?, order? }} params
 * @returns {{ success, data: { debtor: { _id, name, status, currentBalance },
 *             ledger: LedgerEntry[], pagination } }}
 * LedgerEntry: { type: 'charge'|'payment', _id, amount, note,
 *                status: 'active'|'reversed', reversalOf, transactionDate,
 *                createdAt, recordedBy }
 */
export const getDebtorLedger = async (id, params = {}) => {
  const response = await axiosClient.get(`/debtors/${id}/ledger`, { params });
  return response.data;
};

/**
 * PATCH /api/debtors/:id/status
 * Update debtor status. Handles 409 (outstanding balance) by throwing so the
 * caller can inspect error.response.status and error.response.data.
 *
 * First attempt: { status: 'closed' }
 * On 409 re-submit: { status: 'closed', confirmClose: true }
 * Reopen: { status: 'active' }
 *
 * @param {string} id
 * @param {{ status: 'active'|'inactive'|'closed', confirmClose?: true }} body
 * @returns {{ success, data: Debtor }}
 * 409 → throws with error.response.data = { success: false, message, currentBalance, requiresConfirmation: true }
 */
export const updateDebtorStatus = async (id, body) => {
  const response = await axiosClient.patch(`/debtors/${id}/status`, body);
  return response.data;
};
