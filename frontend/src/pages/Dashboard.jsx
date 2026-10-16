import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getSummary,
  getDebtorsList,
  getOverdueDebtors,
  getRecentActivity,
  getUpcomingDueDates,
} from '../api/dashboard.api';

import SummaryCard from '../components/SummaryCard';
import OverdueRow from '../components/OverdueRow';
import ActivityRow from '../components/ActivityRow';
import UpcomingRow from '../components/UpcomingRow';
import { SectionSkeleton, SectionError, EmptyState } from '../components/ui';

// ---------------------------------------------------------------------------
// Section wrapper – consistent card chrome for each dashboard section
// ---------------------------------------------------------------------------
const Section = ({ title, children, action, className = '', headerClass = '' }) => (
  <section
    className={`bg-white border border-neutral-200 rounded-xl lg:rounded-2xl shadow-sm lg:shadow-md lg:shadow-slate-200/60 lg:border-slate-200/70 overflow-hidden ${className}`}
  >
    <div className={`flex items-center justify-between px-4 pt-4 pb-3 border-b border-neutral-100 lg:px-6 ${headerClass}`}>
      <h2 className="text-sm font-semibold text-neutral-800 tracking-tight">{title}</h2>
      {action}
    </div>
    <div className="px-4 pb-4 lg:px-6 lg:pb-5">{children}</div>
  </section>
);

// ---------------------------------------------------------------------------
// Onboarding empty state – shown when company has zero debtors
// ---------------------------------------------------------------------------
const OnboardingEmpty = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8 text-neutral-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
    </div>

    <div>
      <h2 className="text-lg font-bold text-neutral-900">Add your first debtor to get started</h2>
      <p className="text-sm text-neutral-500 mt-1 max-w-xs">
        Once you add a debtor and record a transaction, your dashboard will come alive with balances,
        activity, and alerts.
      </p>
    </div>

    {/* Fixed: this button used to be disabled and said "coming in the next release". */}
    <button
      type="button"
      onClick={onAdd}
      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 lg:bg-indigo-600 text-white text-sm font-medium rounded-lg transition hover:bg-neutral-800 lg:hover:bg-indigo-500 active:scale-[0.98]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
      </svg>
      Add Debtor
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Main Dashboard component
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // ── Summary state ─────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // ── Zero-debtors check (empty-state gate) ─────────────────────────────────
  const [isEmptyCompany, setIsEmptyCompany] = useState(null); // null = unknown yet

  // ── Overdue state ─────────────────────────────────────────────────────────
  const [overdue, setOverdue] = useState([]);
  const [overdueLoading, setOverdueLoading] = useState(true);
  const [overdueError, setOverdueError] = useState(null);

  // ── Recent activity state ─────────────────────────────────────────────────
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);

  // ── Upcoming state ────────────────────────────────────────────────────────
  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState(null);

  // ── Fetch functions (individually retryable) ──────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await getSummary();
      if (res.success) setSummary(res.data);
      else setSummaryError(res.message || 'Failed to load summary.');
    } catch {
      setSummaryError('Failed to load summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchDebtorsCheck = useCallback(async () => {
    try {
      const res = await getDebtorsList({ limit: 1 });
      if (res.success) {
        setIsEmptyCompany(res.pagination.total === 0);
      }
    } catch {
      setIsEmptyCompany(false);
    }
  }, []);

  const fetchOverdue = useCallback(async () => {
    setOverdueLoading(true);
    setOverdueError(null);
    try {
      const res = await getOverdueDebtors({ limit: 11 });
      if (res.success) setOverdue(res.data);
      else setOverdueError(res.message || 'Failed to load overdue debtors.');
    } catch {
      setOverdueError('Failed to load overdue debtors. Please try again.');
    } finally {
      setOverdueLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const res = await getRecentActivity({ limit: 20 });
      if (res.success) setActivity(res.data);
      else setActivityError(res.message || 'Failed to load recent activity.');
    } catch {
      setActivityError('Failed to load recent activity. Please try again.');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const fetchUpcoming = useCallback(async () => {
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const res = await getUpcomingDueDates({ days: 7 });
      if (res.success) setUpcoming(res.data);
      else setUpcomingError(res.message || 'Failed to load upcoming due dates.');
    } catch {
      setUpcomingError('Failed to load upcoming due dates. Please try again.');
    } finally {
      setUpcomingLoading(false);
    }
  }, []);

  // ── Boot: fire all fetches in parallel ───────────────────────────────────
  useEffect(() => {
    fetchDebtorsCheck();
    fetchSummary();
    fetchOverdue();
    fetchActivity();
    fetchUpcoming();
  }, [fetchDebtorsCheck, fetchSummary, fetchOverdue, fetchActivity, fetchUpcoming]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const visibleOverdue = overdue.slice(0, 10);
  const hasMoreOverdue = overdue.length > 10;
  const debtorCheckPending = isEmptyCompany === null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh lg:min-h-[calc(100dvh-4rem)] bg-neutral-50 lg:bg-[#f2f4fa] flex flex-col pb-28 lg:pb-10">

      {/* ── Mobile header (lg:hidden - the desktop navbar replaces it) ── */}
      <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
            Udhaar Hub
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {company?.name || 'My Business'}
            {company?.type ? ` · ${company.type}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            aria-hidden="true"
            className="hidden sm:flex w-8 h-8 rounded-full bg-neutral-900 text-white items-center justify-center text-xs font-bold flex-shrink-0"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className="w-11 h-11 flex items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button
            id="logout-btn"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
            className="w-11 h-11 flex items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 w-full max-w-2xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8 flex flex-col gap-5 lg:gap-6">

        {debtorCheckPending ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <svg
              className="animate-spin h-6 w-6 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading…"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : isEmptyCompany ? (
          <OnboardingEmpty onAdd={() => navigate('/debtors/new')} />
        ) : (
          <>
            {/* Greeting + desktop primary action */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg lg:text-2xl font-bold text-neutral-900">
                  Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                </h2>
                <p className="text-xs lg:text-sm text-neutral-500 mt-0.5">
                  Here's your business at a glance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/debtors/new')}
                className="hidden lg:inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98]"
              >
                <span aria-hidden="true">+</span> Add Debtor
              </button>
            </div>

            {/* Summary cards */}
            <div
              id="summary-cards"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
            >
              <SummaryCard
                label="Total Outstanding"
                tone="indigo"
                value={summary?.totalOutstandingBalance}
                isCurrency
                accent="neutral"
                loading={summaryLoading}
              />
              <SummaryCard
                label="Collected This Month"
                tone="emerald"
                value={summary?.totalCollectedThisMonth}
                isCurrency
                accent="green"
                sub="this month"
                loading={summaryLoading}
              />
              <SummaryCard
                label="Active Debtors"
                tone="sky"
                value={summary?.activeDebtors}
                accent="neutral"
                loading={summaryLoading}
              />
              <SummaryCard
                label="Overdue Debtors"
                tone="rose"
                value={summary?.overdueDebtorsCount}
                accent="red"
                sub={summary ? `PKR ${(summary.totalOverdueAmount || 0).toLocaleString('en-PK')} at risk` : undefined}
                loading={summaryLoading}
              />
            </div>

            {summaryError && !summaryLoading && (
              <div className="text-xs text-red-600 flex items-center gap-2">
                <span>{summaryError}</span>
                <button onClick={fetchSummary} className="underline hover:no-underline">
                  Retry
                </button>
              </div>
            )}

            {/* Sections: one column on mobile (same order as before),
                two-thirds / one-third grid on desktop */}
            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
              <Section
                className="lg:col-span-2 lg:col-start-1 lg:row-start-1"
                title="⚠️ Overdue Debtors"
                headerClass="lg:bg-rose-50/70"
                action={
                  hasMoreOverdue && (
                    <button
                      id="view-all-overdue-btn"
                      className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition"
                      onClick={() => {/* placeholder – overdue page is a future task */}}
                      aria-label="View all overdue debtors"
                    >
                      View all
                    </button>
                  )
                }
              >
                {overdueLoading ? (
                  <SectionSkeleton rows={3} />
                ) : overdueError ? (
                  <SectionError message={overdueError} onRetry={fetchOverdue} />
                ) : visibleOverdue.length === 0 ? (
                  <EmptyState message="No overdue debtors — you're all caught up! 🎉" />
                ) : (
                  <>
                    {visibleOverdue.map((d) => (
                      <OverdueRow
                        key={d._id}
                        name={d.name}
                        phone={d.phone}
                        currentBalance={d.currentBalance}
                        lastPaymentDate={d.lastPaymentDate}
                      />
                    ))}
                    {hasMoreOverdue && (
                      <button
                        id="view-all-overdue-btn-bottom"
                        className="mt-3 w-full text-xs font-medium text-neutral-500 hover:text-neutral-900 py-2 border border-dashed border-neutral-200 rounded-lg transition hover:border-neutral-300"
                      >
                        View all overdue debtors
                      </button>
                    )}
                  </>
                )}
              </Section>

              <Section
                className="lg:col-start-3 lg:row-start-1 lg:row-span-2"
                title="📅 Upcoming Due Dates (Next 7 Days)"
                headerClass="lg:bg-amber-50/70"
              >
                {upcomingLoading ? (
                  <SectionSkeleton rows={2} />
                ) : upcomingError ? (
                  <SectionError message={upcomingError} onRetry={fetchUpcoming} />
                ) : upcoming.length === 0 ? (
                  <EmptyState message="No upcoming due dates in the next 7 days." />
                ) : (
                  upcoming.map((item) => (
                    <UpcomingRow
                      key={item.chargeId}
                      debtorName={item.debtorName}
                      debtorPhone={item.debtorPhone}
                      amount={item.amount}
                      dueDate={item.dueDate}
                      note={item.note}
                    />
                  ))
                )}
              </Section>

              <Section
                className="lg:col-span-2 lg:col-start-1 lg:row-start-2"
                title="🕒 Recent Activity"
                headerClass="lg:bg-indigo-50/70"
              >
                {activityLoading ? (
                  <SectionSkeleton rows={4} />
                ) : activityError ? (
                  <SectionError message={activityError} onRetry={fetchActivity} />
                ) : activity.length === 0 ? (
                  <EmptyState message="No activity yet." />
                ) : (
                  activity.map((entry) => (
                    <ActivityRow
                      key={entry._id}
                      type={entry.type}
                      debtorName={entry.debtorName}
                      amount={entry.amount}
                      note={entry.note}
                      recordedAt={entry.recordedAt}
                    />
                  ))
                )}
              </Section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
