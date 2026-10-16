import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDebtorsList } from '../api/debtor.api';
import { SectionSkeleton, SectionError } from '../components/ui';
import { formatPKR } from '../utils/format';

// Desktop-only Debtors page (the phone version, DebtorList.jsx, is untouched).

const TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Closed', value: 'closed' },
];

const PAGE_LIMIT = 20;
const COLS = 'grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-4 px-6';

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];
const toneFor = (name = '') =>
  AVATAR_TONES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];

const STATUS_PILL = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  inactive: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const Pill = ({ className, children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
    {children}
  </span>
);

const Balance = ({ value }) => {
  const n = Number(value) || 0;
  if (n > 0) {
    return (
      <div className="text-right">
        <p className="font-semibold text-slate-900">
          {formatPKR(n)} <span className="text-rose-500">↗</span>
        </p>
        <Pill className="mt-1 bg-rose-50 text-rose-700 ring-rose-600/20">Owed</Pill>
      </div>
    );
  }
  if (n < 0) {
    return (
      <div className="text-right">
        <p className="font-semibold text-emerald-700">
          {formatPKR(n)} <span className="text-emerald-500">↙</span>
        </p>
        <Pill className="mt-1 bg-emerald-50 text-emerald-700 ring-emerald-600/20">Advance</Pill>
      </div>
    );
  }
  return (
    <div className="text-right">
      <p className="font-semibold text-slate-400">{formatPKR(0)}</p>
      <Pill className="mt-1 bg-slate-100 text-slate-500 ring-slate-500/20">Settled</Pill>
    </div>
  );
};

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors';

const DebtorsDesktop = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');

  const [debtors, setDebtors] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchDebtors = useCallback(
    async (pageNum, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(false);
      try {
        const params = { page: pageNum, limit: PAGE_LIMIT };
        if (status) params.status = status;
        if (debouncedSearch) params.search = debouncedSearch;
        const res = await getDebtorsList(params);
        const data = res.data || [];
        const pg = res.pagination || {};
        setDebtors((prev) => (append ? [...prev, ...data] : data));
        setTotalPages(pg.totalPages || 1);
        setTotal(pg.total ?? data.length);
        setPage(pg.page || pageNum);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, debouncedSearch]
  );

  useEffect(() => {
    fetchDebtors(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, debouncedSearch]);

  const hasFilters = Boolean(status || debouncedSearch);

  const open = (id) => navigate(`/debtors/${id}`);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#f2f4fa]">
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Debtors</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {loading ? 'Loading…' : `${total} ${total === 1 ? 'person' : 'people'} in your khata`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/debtors/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            <span aria-hidden="true">+</span> Add Debtor
          </button>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
          <div className="relative w-full max-w-md">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`!min-h-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
                  status === tab.value
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table card */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/60">
          <div className={`${COLS} border-b border-slate-100 bg-slate-50 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500`}>
            <span>Debtor</span>
            <span>Phone</span>
            <span>Status</span>
            <span className="text-right">Balance</span>
            <span className="w-[5.25rem] text-right">Contact</span>
          </div>

          {loading && (
            <div className="p-6">
              <SectionSkeleton rows={6} />
            </div>
          )}

          {!loading && error && (
            <SectionError message="Failed to load debtors. Please try again." onRetry={() => fetchDebtors(1, false)} />
          )}

          {!loading && !error && debtors.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-400">
              {hasFilters ? 'No debtors found for this search or filter.' : 'No debtors yet.'}
            </div>
          )}

          {!loading &&
            !error &&
            debtors.map((d) => (
              <div
                key={d._id}
                role="link"
                tabIndex={0}
                onClick={() => open(d._id)}
                onKeyDown={(e) => e.key === 'Enter' && open(d._id)}
                className={`${COLS} cursor-pointer border-b border-slate-100 py-4 transition-colors duration-150 last:border-0 hover:bg-indigo-50/50 focus:bg-indigo-50/50 focus:outline-none`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${toneFor(d.name)}`}>
                    {(d.name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <p className="truncate font-medium text-slate-900">{d.name}</p>
                </div>

                <p className="truncate text-sm text-slate-500">{d.phone || '—'}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill className={STATUS_PILL[d.status] || STATUS_PILL.closed}>
                    {d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : '—'}
                  </Pill>
                  {d.isOverdue && <Pill className="bg-rose-50 text-rose-700 ring-rose-600/20">Overdue</Pill>}
                </div>

                <Balance value={d.currentBalance} />

                <div className="flex w-[5.25rem] items-center justify-end gap-1">
                  {d.phone && (
                    <>
                      <a
                        href={`tel:${d.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Call ${d.name}`}
                        className={`${iconBtn} hover:bg-emerald-50 hover:text-emerald-600`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.3a1 1 0 01.97.76l1 4a1 1 0 01-.5 1.1l-1.6.9a11 11 0 005.07 5.07l.9-1.6a1 1 0 011.1-.5l4 1a1 1 0 01.76.97V19a2 2 0 01-2 2A16 16 0 013 5z" />
                        </svg>
                      </a>
                      <a
                        href={`sms:${d.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Message ${d.name}`}
                        className={`${iconBtn} hover:bg-sky-50 hover:text-sky-600`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1121 12z" />
                        </svg>
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>

        {!loading && !error && page < totalPages && (
          <div className="flex justify-center py-6">
            <button
              type="button"
              onClick={() => !loadingMore && fetchDebtors(page + 1, true)}
              disabled={loadingMore}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtorsDesktop;
