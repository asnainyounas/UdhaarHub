import React from 'react';
import { formatPKR, formatShortDate } from '../utils/format';

/**
 * UpcomingRow – A single row in the Upcoming Due Dates section.
 *
 * Props (from backend `/dashboard/upcoming` response shape):
 *   debtorName  string
 *   debtorPhone string
 *   amount      number
 *   dueDate     string (ISO)
 *   note        string | null
 */
const UpcomingRow = ({ debtorName, debtorPhone, amount, dueDate, note }) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  const isDueToday = diffDays <= 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0">
      {/* Avatar */}
      <div
        aria-hidden="true"
        className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-semibold text-sm flex-shrink-0"
      >
        {debtorName ? debtorName.charAt(0).toUpperCase() : '?'}
      </div>

      {/* Name + phone */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">{debtorName || '—'}</p>
        <p className="text-xs text-neutral-500 truncate">{debtorPhone || note || '—'}</p>
      </div>

      {/* Amount + status pill */}
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-bold text-neutral-900">{formatPKR(amount)}</p>
        {isDueToday ? (
          <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full">
            Due today
          </span>
        ) : (
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Due {formatShortDate(dueDate)}
          </p>
        )}
      </div>
    </div>
  );
};

export default UpcomingRow;
