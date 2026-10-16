import React from 'react';
import { formatPKR, daysOverdue, formatShortDate } from '../utils/format';

const TrendUpIcon = (
  <svg className="w-3.5 h-3.5 text-red-600 inline-block shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0L14 7.06v4.69a.75.75 0 001.5 0v-7a.75.75 0 00-.75-.75h-7a.75.75 0 000 1.5h4.69L4.69 13.72a.75.75 0 000 1.06z" clipRule="evenodd" />
  </svg>
);

/**
 * OverdueRow – A single row in the Overdue Debtors list.
 *
 * Props (from backend `/dashboard/overdue` response shape):
 *   name           string  – Debtor name
 *   phone          string  – Debtor phone
 *   currentBalance number  – Amount owed
 *   lastPaymentDate string|null – ISO date or null
 */
const OverdueRow = ({ name, phone, currentBalance, lastPaymentDate }) => {
  const days = daysOverdue(lastPaymentDate);
  const lastPaid = lastPaymentDate ? formatShortDate(lastPaymentDate) : null;
  const balance = Number(currentBalance) || 0;

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-neutral-100 last:border-0">
      {/* Left: avatar + name/phone */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          aria-hidden="true"
          className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-semibold text-sm flex-shrink-0"
        >
          {name ? name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">{name || '—'}</p>
          <p className="text-xs text-neutral-500 truncate">{phone || '—'}</p>
        </div>
      </div>

      {/* Right: amount + trend arrow + status pill */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center justify-end gap-1">
          <p className="text-sm font-bold text-red-600">{formatPKR(balance)}</p>
          {balance > 0 && TrendUpIcon}
        </div>
        {lastPaid ? (
          <p className="text-xs text-neutral-500 mt-0.5">
            Last paid: <span className="font-medium text-neutral-700">{lastPaid}</span>
          </p>
        ) : (
          <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full">
            Never paid
          </span>
        )}
      </div>
    </div>
  );
};

export default OverdueRow;
