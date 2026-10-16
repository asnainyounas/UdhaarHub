import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { formatPKR } from '../utils/format';

/**
 * ActivityRow – A single row in the Recent Activity feed.
 *
 * Props (from the backend `/dashboard/recent-activity` response shape):
 *   type        'charge' | 'payment'
 *   debtorName  string
 *   amount      number
 *   note        string | null
 *   recordedAt  string (ISO) – used for "X ago" display
 */

const CHARGE_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    {/* Arrow up = charge (debit) */}
    <path
      fillRule="evenodd"
      d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
      clipRule="evenodd"
    />
  </svg>
);

const PAYMENT_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    {/* Arrow down = payment (credit) */}
    <path
      fillRule="evenodd"
      d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
      clipRule="evenodd"
    />
  </svg>
);

const ActivityRow = ({ type, debtorName, amount, note, recordedAt }) => {
  const isCharge = type === 'charge';
  const relativeTime = recordedAt
    ? formatDistanceToNow(new Date(recordedAt), { addSuffix: true })
    : '—';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0">
      {/* Icon badge */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCharge
            ? 'bg-red-50 text-red-500'
            : 'bg-emerald-50 text-emerald-600'
        }`}
        aria-label={isCharge ? 'Charge' : 'Payment'}
      >
        {isCharge ? CHARGE_ICON : PAYMENT_ICON}
      </div>

      {/* Debtor + note */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">
          {debtorName || 'Unknown'}
        </p>
        {note ? (
          <p className="text-xs text-neutral-500 truncate">{note}</p>
        ) : (
          <p className="text-xs text-neutral-400">
            {isCharge ? 'Charge added' : 'Payment received'}
          </p>
        )}
      </div>

      {/* Amount + time */}
      <div className="flex-shrink-0 text-right">
        <p
          className={`text-sm font-bold ${
            isCharge ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {isCharge ? '+' : '−'} {formatPKR(amount)}
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">{relativeTime}</p>
      </div>
    </div>
  );
};

export default ActivityRow;
