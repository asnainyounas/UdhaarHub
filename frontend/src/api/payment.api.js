import axiosClient from './axiosClient';

/**
 * POST /api/payments
 * Create a new payment for a debtor.
 *
 * Body fields:
 *   debtorId  string   required
 *   amount    number   required, > 0
 *   note      string   optional
 *
 * No dueDate field — payments don't have one. Overpayments (amount greater
 * than the debtor's current balance) are intentionally allowed by the
 * backend — do not add frontend validation that blocks this.
 *
 * @param {{ debtorId, amount, note? }} body
 * @returns {{ success, data: Payment }}
 * 400 → throws with error.response.data = { success: false, errors: { debtorId?, amount?, note? } }
 */
export const createPayment = async (body) => {
  const response = await axiosClient.post('/payments', body);
  return response.data;
};
