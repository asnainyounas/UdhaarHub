import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Helper to read a cookie value by name from document.cookie
 * @param {string} name
 * @returns {string|null}
 */
const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

// Request Interceptor: Attach CSRF Token if cookie is present
axiosClient.interceptors.request.use(
  (config) => {
    const csrfToken = getCookieValue('udhaarhub_csrf');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 unauthorized globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid redirecting during the initial /auth/me check or if already on auth pages
      const isAuthCheck = error.config?.url?.includes('/auth/me');
      const isAuthPage =
        typeof window !== 'undefined' &&
        (window.location.pathname.includes('/login') || window.location.pathname.includes('/signup'));

      if (!isAuthCheck && !isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
