import axiosClient from './axiosClient';

/**
 * Fetch current authenticated user and company profile
 * @returns {Promise<Object>} API response data { success, user, company }
 */
export const getMeApi = async () => {
  const response = await axiosClient.get('/auth/me');
  return response.data;
};

/**
 * Login user with phone and password
 * @param {Object} credentials - { phone, password }
 * @returns {Promise<Object>} API response data { success, user, company }
 */
export const loginApi = async (credentials) => {
  const response = await axiosClient.post('/auth/login', credentials);
  return response.data;
};

/**
 * Register new user with business account
 * @param {Object} userData - { name, phone, password, businessName, companyType }
 * @returns {Promise<Object>} API response data { success, user, company }
 */
export const signupApi = async (userData) => {
  const response = await axiosClient.post('/auth/signup', userData);
  return response.data;
};

/**
 * Logout user session
 */
export const logoutApi = async () => {
  const response = await axiosClient.post('/auth/logout');
  return response.data;
};

