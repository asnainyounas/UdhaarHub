import React, { useState, useEffect, useCallback } from 'react';
import { getRecentActivity } from '../api/dashboard.api';
import { useAuth } from '../context/AuthContext';
import ActivityRow from '../components/ActivityRow';
import { SectionSkeleton, SectionError, EmptyState } from '../components/ui';

const Activity = () => {
  const { company } = useAuth();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecentActivity({ limit: 50 });
      if (res.success) {
        setActivity(res.data || []);
      } else {
        setError(res.message || 'Failed to load recent activity.');
      }
    } catch {
      setError('Failed to load recent activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className="min-h-dvh bg-neutral-50 flex flex-col pb-28">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
            Activity Log
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {company?.name || 'My Business'}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-5">
        <section className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-800 tracking-tight">Recent Activity (All)</h2>
            <span className="text-xs text-neutral-400 font-medium">{activity.length} entries</span>
          </div>

          {loading ? (
            <SectionSkeleton rows={8} />
          ) : error ? (
            <SectionError message={error} onRetry={fetchActivity} />
          ) : activity.length === 0 ? (
            <EmptyState message="No activity yet." />
          ) : (
            <div>
              {activity.map((entry, idx) => (
                <ActivityRow
                  key={entry._id || idx}
                  type={entry.type}
                  debtorName={entry.debtorName}
                  amount={entry.amount}
                  note={entry.note}
                  recordedAt={entry.recordedAt}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Activity;
