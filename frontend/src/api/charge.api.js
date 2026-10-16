import axiosClient from './axiosClient';

/**
 * POST /api/charges
 * Create a new charge for a debtor.
 *
 * Body fields:
 *   debtorId  string   required
 *   amount    number   required, > 0
 *   note      string   optional
 *   dueDate   string   optional ISO date; must not be before transactionDate.
 *                      Since we don't send transactionDate (backend defaults to
 *                      now), dueDate must be today or future.
 *
 * Note: do NOT send transactionDate — the backend defaults it to now server-side.
 *
 * @param {{ debtorId, amount, note?, dueDate? }} body
 * @returns {{ success, data: Charge }}
 * 400 → throws with error.response.data = { success: false, errors: { debtorId?, amount?, note?, dueDate? } }
 */
export const createCharge = async (body) => {
  const response = await axiosClient.post('/charges', body);
  return response.data;
};
