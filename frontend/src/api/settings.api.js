import axiosClient from './axiosClient';

/**
 * GET /api/companies/:companyId
 * Get current business settings
 * @param {string} companyId
 * @returns {Promise<Object>} API response data { success, data: Company }
 */
export const getCompanyApi = async (companyId) => {
  const response = await axiosClient.get(`/companies/${companyId}`);
  return response.data;
};

/**
 * PATCH /api/companies/:companyId
 * Update business settings
 * @param {string} companyId
 * @param {Object} data { name, currency, overdueThresholdDays }
 * @returns {Promise<Object>} API response data { success, data: Company }
 */
export const updateCompanyApi = async (companyId, data) => {
  const response = await axiosClient.patch(`/companies/${companyId}`, data);
  return response.data;
};

/**
 * PATCH /api/users/me
 * Update owner profile (name, phone, password change)
 * @param {Object} data { name, phone, currentPassword, newPassword }
 * @returns {Promise<Object>} API response data { success, data: User }
 */
export const updateProfileApi = async (data) => {
  const response = await axiosClient.patch('/users/me', data);
  return response.data;
};
