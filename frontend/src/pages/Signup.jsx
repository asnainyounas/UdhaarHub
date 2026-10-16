import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { signupApi } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

const VALID_COMPANY_TYPES = [
  { value: 'shop', label: 'Shop / Retail' },
  { value: 'committee', label: 'Committee / Kameti' },
  { value: 'lender', label: 'Lender' },
  { value: 'other', label: 'Other Business' },
];

const Signup = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, authChecked } = useAuth();

  // Step state (1 or 2)
  const [step, setStep] = useState(1);

  // Form states preserved across steps
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    companyType: 'shop',
  });

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
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validate Step 1 before proceeding
  const validateStep1 = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const phoneTrim = formData.phone.trim();
    if (!phoneTrim) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(phoneTrim)) {
      errors.phone = 'Phone number must be 10-15 digits, optionally starting with +';
    }

    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Step 2 before submitting
  const validateStep2 = () => {
    const errors = {};
    if (!formData.businessName || formData.businessName.trim().length < 2) {
      errors.businessName = 'Business name must be at least 2 characters';
    }
    if (!formData.companyType) {
      errors.companyType = 'Please select a business type';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    setServerError('');
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setServerError('');
    setFieldErrors({});
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        businessName: formData.businessName.trim(),
        companyType: formData.companyType,
      };

      const data = await signupApi(payload);

      if (data.success) {
        login({
          user: data.user,
          company: data.company,
        });
        navigate('/dashboard', { replace: true });
      } else {
        setServerError(data.message || 'Signup failed');
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const message = data?.message || 'Something went wrong during signup';

      // Duplicate phone error (409) -> clearly a Step 1 error
      if (status === 409 || message.toLowerCase().includes('phone')) {
        setServerError(message);
        setStep(1);
        setFieldErrors((prev) => ({ ...prev, phone: message }));
        return;
      }

      // Validation errors mapping (400)
      if (data?.errors) {
        setFieldErrors(data.errors);
        const step1Fields = ['name', 'phone', 'password'];
        const hasStep1Error = Object.keys(data.errors).some((key) => step1Fields.includes(key));
        if (hasStep1Error) {
          setStep(1);
        }
        setServerError('Please correct the errors in the form.');
        return;
      }

      // Other server error -> stay on Step 2
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto pt-4 sm:pt-10 flex-1 flex flex-col justify-between">
        <div>
          {/* Top Bar with Step Indicator & Back Button */}
          <div className="flex items-center justify-between mb-6">
            {step === 2 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 min-h-[36px] py-1 pr-2 transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-200/60 px-2.5 py-1 rounded-full">
              Step {step} of 2
            </span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              {step === 1 ? 'Create Account' : 'Business Details'}
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-1">
              {step === 1
                ? 'Enter your contact details to start'
                : 'Tell us about your shop or ledger'}
            </p>
          </div>

          {/* Error Message */}
          {serverError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {serverError}
            </div>
          )}

          {/* Multi-Step Form */}
          {step === 1 && (
            <form id="signup-step1" onSubmit={handleNext} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Ahmed Khan"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                    fieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
                )}
              </div>

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
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
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
                  Password (min 6 characters)
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                    fieldErrors.password ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                  }`}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                    fieldErrors.confirmPassword
                      ? 'border-red-400 focus:ring-red-500'
                      : 'border-neutral-300'
                  }`}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </form>
          )}

          {step === 2 && (
            <form id="signup-step2" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="businessName"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Khan General Store"
                  value={formData.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  disabled={loading}
                  className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                    fieldErrors.businessName
                      ? 'border-red-400 focus:ring-red-500'
                      : 'border-neutral-300'
                  }`}
                />
                {fieldErrors.businessName && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.businessName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="companyType"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Business Type
                </label>
                <select
                  id="companyType"
                  value={formData.companyType}
                  onChange={(e) => handleChange('companyType', e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-3 rounded-lg border border-neutral-300 text-neutral-900 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                >
                  {VALID_COMPANY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.companyType && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.companyType}</p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Bottom Pinned Actions */}
        <div className="pt-8 pb-4">
          {step === 1 ? (
            <button
              type="submit"
              form="signup-step1"
              className="w-full flex items-center justify-center min-h-[48px] px-4 py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-base font-medium rounded-lg transition shadow-sm"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              form="signup-step2"
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
                  <span>Creating account...</span>
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          )}

          <div className="mt-4 text-center">
            <p className="text-sm text-neutral-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-neutral-900 hover:underline inline-block min-h-[36px] py-1"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
