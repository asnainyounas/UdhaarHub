import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getRecentActivity } from '../api/dashboard.api';
import { SectionSkeleton, SectionError, EmptyState } from '../components/ui';
import ActivityRow from '../components/ActivityRow';
import { formatPKR } from '../utils/format';

// Desktop-only Activity page (the phone version, Activity.jsx, is untouched).

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Charges', value: 'charge' },
  { label: 'Payments', value: 'payment' },
];

const StatCard = ({ label, value, hint, tile, card, icon }) => (
  <div className={`rounded-2xl border bg-gradient-to-br from-white p-5 shadow-md shadow-slate-200/60 ${card}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
      </div>
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold ${tile}`}>
        {icon}
      </span>
    </div>
  </div>
);

const ActivityDesktop = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecentActivity({ limit: 50 });
      if (res.success) setEntries(res.data || []);
      else setError(res.message || 'Failed to load activity.');
    } catch {
      setError('Failed to load activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Totals are computed from the entries already loaded (no extra API call).
  const { charged, received } = useMemo(() => {
    let c = 0;
    let r = 0;
    entries.forEach((e) => {
      if (e.type === 'charge') c += Number(e.amount) || 0;
      if (e.type === 'payment') r += Number(e.amount) || 0;
    });
    return { charged: c, received: r };
  }, [entries]);

  const visible = filter === 'all' ? entries : entries.filter((e) => e.type === filter);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#f2f4fa]">
      <div className="mx-auto max-w-7xl px-8 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
          <p className="mt-0.5 text-sm text-slate-500">Every charge and payment, newest first.</p>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
          {/* Feed */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md shadow-slate-200/60 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 bg-indigo-50/70 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-800">Recent activity</h2>
              <div className="flex items-center gap-1 rounded-xl bg-white/80 p-1 ring-1 ring-slate-200">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={`!min-h-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
                      filter === f.value
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 pb-4">
              {loading ? (
                <div className="pt-4">
                  <SectionSkeleton rows={6} />
                </div>
              ) : error ? (
                <SectionError message={error} onRetry={load} />
              ) : visible.length === 0 ? (
                <EmptyState message={filter === 'all' ? 'No activity yet.' : 'Nothing to show for this filter.'} />
              ) : (
                visible.map((entry) => (
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
            </div>
          </section>

          {/* Side stats */}
          <div className="flex flex-col gap-4">
            <StatCard
              label="Charged"
              value={loading ? '—' : formatPKR(charged)}
              hint="Added to debtors' balances"
              tile="bg-rose-100 text-rose-600"
              card="border-rose-100 to-rose-50"
              icon="↑"
            />
            <StatCard
              label="Received"
              value={loading ? '—' : formatPKR(received)}
              hint="Payments collected"
              tile="bg-emerald-100 text-emerald-600"
              card="border-emerald-100 to-emerald-50"
              icon="↓"
            />
            <StatCard
              label="Entries"
              value={loading ? '—' : entries.length}
              hint="Latest 50 shown"
              tile="bg-indigo-100 text-indigo-600"
              card="border-indigo-100 to-indigo-50"
              icon="#"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDesktop;
