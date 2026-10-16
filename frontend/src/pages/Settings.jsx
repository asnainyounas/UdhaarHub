import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCompanyApi, updateCompanyApi, updateProfileApi } from '../api/settings.api';

const Settings = () => {
  const { user, company, login } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('business');

  // Business Settings State
  const [fetchingCompany, setFetchingCompany] = useState(true);
  const [bizName, setBizName] = useState(company?.name || '');
  const [bizCurrency, setBizCurrency] = useState(company?.currency || 'PKR');
  const [bizThreshold, setBizThreshold] = useState(
    company?.overdueThresholdDays !== undefined ? company.overdueThresholdDays : ''
  );
  const [bizTimezone, setBizTimezone] = useState(company?.timezone || 'Asia/Karachi');
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState('');
  const [bizFieldErrors, setBizFieldErrors] = useState({});
  const [bizSuccess, setBizSuccess] = useState('');

  // Profile Settings State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdFieldErrors, setPwdFieldErrors] = useState({});
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Fetch current company settings on mount
  useEffect(() => {
    let isMounted = true;
    const loadCompanySettings = async () => {
      const companyId = company?.id || company?._id;
      if (!companyId) {
        setFetchingCompany(false);
        return;
      }

      try {
        setFetchingCompany(true);
        const res = await getCompanyApi(companyId);
        if (isMounted && res.success && res.data) {
          setBizName(res.data.name ?? '');
          setBizCurrency(res.data.currency ?? 'PKR');
          if (res.data.overdueThresholdDays !== undefined && res.data.overdueThresholdDays !== null) {
            setBizThreshold(res.data.overdueThresholdDays);
          }
          if (res.data.timezone) {
            setBizTimezone(res.data.timezone);
          }
          login({ company: res.data });
        }
      } catch (err) {
        console.error('Failed to load company settings:', err);
        if (isMounted) {
          setBizError('Failed to load current business settings.');
        }
      } finally {
        if (isMounted) {
          setFetchingCompany(false);
        }
      }
    };

    loadCompanySettings();

    return () => {
      isMounted = false;
    };
  }, [company?.id, company?._id]);

  // --- Handlers ---

  const handleBizSubmit = async (e) => {
    e.preventDefault();
    setBizError('');
    setBizFieldErrors({});
    setBizSuccess('');

    const companyId = company?.id || company?._id;
    if (!companyId) {
      setBizError('Company identifier not found. Please log in again.');
      return;
    }

    setBizLoading(true);

    try {
      const data = await updateCompanyApi(companyId, {
        name: bizName,
        currency: bizCurrency,
        overdueThresholdDays: Number(bizThreshold)
      });
      if (data.success) {
        login({ company: data.data }); // Update context
        if (data.data.overdueThresholdDays !== undefined) {
          setBizThreshold(data.data.overdueThresholdDays);
        }
        if (data.data.timezone) {
          setBizTimezone(data.data.timezone);
        }
        setBizSuccess('Business settings updated successfully.');
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 400 && err.response?.data?.errors) {
        setBizFieldErrors(err.response.data.errors);
      } else if (status === 403) {
        setBizError('Only the business owner can update company settings');
      } else if (status === 404) {
        setBizError('Company not found');
      } else {
        setBizError('Something went wrong. Please try again.');
      }
    } finally {
      setBizLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileFieldErrors({});
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const data = await updateProfileApi({
        name: profileName,
        phone: profilePhone
      });
      if (data.success) {
        login({ user: data.data });
        setProfileSuccess('Profile updated successfully.');
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setProfileFieldErrors(err.response.data.errors);
      } else {
        setProfileError('Something went wrong. Please try again.');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdFieldErrors({});
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      setPwdFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setPwdLoading(true);

    try {
      const data = await updateProfileApi({
        currentPassword,
        newPassword
      });
      if (data.success) {
        setPwdSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setPwdFieldErrors(err.response.data.errors);
      } else {
        setPwdError('Something went wrong changing password. Please try again.');
      }
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-neutral-500 hover:text-neutral-900 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
            Settings
          </h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        
        {/* Tabs */}
        <div className="flex border-b border-neutral-200 gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-shrink-0 pb-3 px-1 text-sm font-medium border-b-2 transition ${activeTab === 'business' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
          >
            Business Settings
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-shrink-0 pb-3 px-1 text-sm font-medium border-b-2 transition ${activeTab === 'profile' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
          >
            Owner Profile
          </button>
        </div>

        {/* Business Settings Tab */}
        {activeTab === 'business' && (
          <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Business Settings</h2>
            
            {bizError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{bizError}</div>}
            {bizSuccess && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{bizSuccess}</div>}
            
            {fetchingCompany ? (
              <div className="py-12 flex flex-col items-center justify-center text-neutral-500 gap-3">
                <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                <p className="text-sm font-medium text-neutral-600">Loading business settings...</p>
              </div>
            ) : (
              <form onSubmit={handleBizSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => {
                      setBizName(e.target.value);
                      if (bizFieldErrors.name) setBizFieldErrors(p => ({...p, name: ''}));
                    }}
                    disabled={bizLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${bizFieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  {bizFieldErrors.name && <p className="text-xs text-red-600 mt-1">{bizFieldErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Currency</label>
                  <input
                    type="text"
                    value={bizCurrency}
                    onChange={(e) => {
                      setBizCurrency(e.target.value);
                      if (bizFieldErrors.currency) setBizFieldErrors(p => ({...p, currency: ''}));
                    }}
                    disabled={bizLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${bizFieldErrors.currency ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  {bizFieldErrors.currency && <p className="text-xs text-red-600 mt-1">{bizFieldErrors.currency}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Overdue Threshold (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={bizThreshold}
                    onChange={(e) => {
                      setBizThreshold(e.target.value);
                      if (bizFieldErrors.overdueThresholdDays) setBizFieldErrors(p => ({...p, overdueThresholdDays: ''}));
                    }}
                    disabled={bizLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${bizFieldErrors.overdueThresholdDays ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  <p className="text-xs text-neutral-500 mt-1">A debtor is considered overdue after this many days.</p>
                  {bizFieldErrors.overdueThresholdDays && <p className="text-xs text-red-600 mt-1">{bizFieldErrors.overdueThresholdDays}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Timezone</label>
                  <input
                    type="text"
                    value={bizTimezone || company?.timezone || 'Asia/Karachi'}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-neutral-500 bg-neutral-100 text-sm cursor-not-allowed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={bizLoading}
                    className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-60 shadow-sm"
                  >
                    {bizLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Owner Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            
            {/* Basic Info */}
            <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Owner Profile</h2>
              
              {profileError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{profileError}</div>}
              {profileSuccess && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{profileSuccess}</div>}
              
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => {
                      setProfileName(e.target.value);
                      if (profileFieldErrors.name) setProfileFieldErrors(p => ({...p, name: ''}));
                    }}
                    disabled={profileLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${profileFieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  {profileFieldErrors.name && <p className="text-xs text-red-600 mt-1">{profileFieldErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => {
                      setProfilePhone(e.target.value);
                      if (profileFieldErrors.phone) setProfileFieldErrors(p => ({...p, phone: ''}));
                    }}
                    disabled={profileLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${profileFieldErrors.phone ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  {profileFieldErrors.phone && <p className="text-xs text-red-600 mt-1">{profileFieldErrors.phone}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-60 shadow-sm"
                  >
                    {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* Change Password */}
            <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Change Password</h2>
              
              {pwdError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{pwdError}</div>}
              {pwdSuccess && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{pwdSuccess}</div>}
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (pwdFieldErrors.currentPassword) setPwdFieldErrors(p => ({...p, currentPassword: ''}));
                    }}
                    disabled={pwdLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${pwdFieldErrors.currentPassword ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  {pwdFieldErrors.currentPassword && <p className="text-xs text-red-600 mt-1">{pwdFieldErrors.currentPassword}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (pwdFieldErrors.newPassword) setPwdFieldErrors(p => ({...p, newPassword: ''}));
                    }}
                    disabled={pwdLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${pwdFieldErrors.newPassword ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  {pwdFieldErrors.newPassword && <p className="text-xs text-red-600 mt-1">{pwdFieldErrors.newPassword}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (pwdFieldErrors.confirmPassword) setPwdFieldErrors(p => ({...p, confirmPassword: ''}));
                    }}
                    disabled={pwdLoading}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-neutral-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${pwdFieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'}`}
                  />
                  {pwdFieldErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{pwdFieldErrors.confirmPassword}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={pwdLoading || !currentPassword || !newPassword || !confirmPassword}
                    className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-60 shadow-sm"
                  >
                    {pwdLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

      </main>
    </div>
  );
};

export default Settings;
