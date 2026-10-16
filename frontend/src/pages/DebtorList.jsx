import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDebtorsList } from '../api/debtor.api';
import { useAuth } from '../context/AuthContext';
import { SectionSkeleton, SectionError, EmptyState } from '../components/ui';
import DebtorRow from '../components/DebtorRow';
import FloatingActionButton from '../components/FloatingActionButton';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Closed', value: 'closed' },
];

const PAGE_LIMIT = 20;

const DebtorList = () => {
  const navigate = useNavigate();
  const { company } = useAuth();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');

  const [debtors, setDebtors] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
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
        const newData = res.data || [];
        const pagination = res.pagination || {};

        setDebtors((prev) => (append ? [...prev, ...newData] : newData));
        setTotalPages(pagination.totalPages || 1);
        setPage(pagination.page || pageNum);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, debouncedSearch]
  );

  // Refetch from page 1 whenever filters change
  useEffect(() => {
    fetchDebtors(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, debouncedSearch]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchDebtors(page + 1, true);
    }
  };

  const handleRetry = () => fetchDebtors(1, false);

  const hasFilters = Boolean(status || debouncedSearch);

  return (
    <div className="min-h-dvh bg-neutral-50 flex flex-col pb-28">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-base font-semibold text-neutral-900">Debtors</h1>
          {company?.name && (
            <p className="text-xs text-neutral-500">{company.name}</p>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-medium text-neutral-600 border border-neutral-300 rounded-lg px-3 py-1.5 hover:bg-neutral-50 transition"
        >
          Dashboard
        </button>
      </header>

      {/* Search + filters */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone"
          className="w-full h-11 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
        />
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center text-neutral-400 pl-0.5 pr-1 flex-shrink-0" title="Filter by status">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                status === tab.value
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List body */}
      <div className="flex-1 px-4 py-3">
        {loading && <SectionSkeleton rows={6} />}

        {!loading && error && (
          <SectionError message="Failed to load debtors. Please try again." onRetry={handleRetry} />
        )}

        {!loading && !error && debtors.length === 0 && (
          <EmptyState
            message={
              hasFilters
                ? 'No debtors found for this search or filter.'
                : 'No debtors yet.'
            }
          />
        )}

        {!loading && !error && debtors.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 px-3">
            {debtors.map((debtor) => (
              <DebtorRow
                key={debtor._id}
                name={debtor.name}
                phone={debtor.phone}
                currentBalance={debtor.currentBalance}
                isOverdue={debtor.isOverdue}
                status={debtor.status}
                onClick={() => navigate(`/debtors/${debtor._id}`)}
              />
            ))}
          </div>
        )}

        {!loading && !error && page < totalPages && (
          <div className="flex justify-center py-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg px-4 py-2 hover:bg-neutral-50 transition disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Floating Add Debtor button */}
      <FloatingActionButton onClick={() => navigate('/debtors/new')}>
        + Add Debtor
      </FloatingActionButton>
    </div>
  );
};

export default DebtorList;