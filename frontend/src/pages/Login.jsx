import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { loginApi } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, authChecked } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Spinner className="h-8 w-8 text-neutral-900" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    const errs = {};
    if (!phone.trim()) {
      errs.phone = 'Phone number is required';
    }
    if (!password) {
      errs.password = 'Password is required';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const data = await loginApi({ phone: phone.trim(), password });

      if (data.success) {
        login({
          user: data.user,
          company: data.company,
        });
        navigate('/dashboard', { replace: true });
      } else {
        setError(data.message || 'Invalid phone or password');
      }
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message;

      if (status === 403) {
        if (serverMessage?.toLowerCase().includes('disabled')) {
          setError('This account has been disabled. Contact your business owner.');
        } else if (serverMessage?.toLowerCase().includes('suspended')) {
          setError('Your company account has been suspended. Contact support.');
        } else {
          setError(serverMessage || 'Account access restricted.');
        }
      } else if (status === 401 || status === 400) {
        setError('Invalid phone or password');
      } else {
        setError(serverMessage || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto pt-8 sm:pt-16 flex-1 flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Udhaar Hub
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-1">
              Sign in to manage your customer khata
            </p>
          </div>

          {/* Server Error Alert */}
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {error}
            </div>
          )}

          {/* Form Fields */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-neutral-800 mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="03001234567 or +923001234567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }}
                disabled={loading}
                className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  fieldErrors.phone ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                }`}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-800 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                disabled={loading}
                className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  fieldErrors.password ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                }`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
              )}
            </div>
          </form>
        </div>

        {/* Bottom Pinned Actions */}
        <div className="pt-8 pb-4">
          <button
            type="submit"
            form="login-form"
            disabled={loading}
            className="w-full flex items-center justify-center min-h-[48px] px-4 py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-base font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Signing in...</span>
              </span>
            ) : (
              'Login'
            )}
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm text-neutral-600">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-neutral-900 hover:underline inline-block min-h-[36px] py-1"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
