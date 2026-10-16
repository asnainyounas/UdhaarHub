import React from 'react';
import { formatPKR } from '../utils/format';

const PhoneIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const MessageIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const TrendUpIcon = (
  <svg className="w-3.5 h-3.5 text-red-600 inline-block shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0L14 7.06v4.69a.75.75 0 001.5 0v-7a.75.75 0 00-.75-.75h-7a.75.75 0 000 1.5h4.69L4.69 13.72a.75.75 0 000 1.06z" clipRule="evenodd" />
  </svg>
);

const TrendDownIcon = (
  <svg className="w-3.5 h-3.5 text-emerald-600 inline-block shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M14.78 5.22a.75.75 0 00-1.06 0L6 12.94V8.25a.75.75 0 00-1.5 0v7c0 .414.336.75.75.75h7a.75.75 0 000-1.5H7.56l7.72-7.72a.75.75 0 000-1.06z" clipRule="evenodd" />
  </svg>
);

/**
 * DebtorRow – A single row in the Debtor List.
 *
 * Props:
 *   name            string
 *   phone           string | null
 *   currentBalance  number
 *   isOverdue       boolean
 *   status          string | null ('active' | 'inactive' | 'closed')
 *   onClick         function – navigates to /debtors/:id
 */
const DebtorRow = ({ name, phone, currentBalance, isOverdue, status, onClick }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const balance = Number(currentBalance) || 0;
  const hasPhone = Boolean(phone && phone.trim());
  const isActive = status === 'active' || (!status && status !== 'closed' && status !== 'inactive');

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full flex items-center gap-3 py-3 px-1 border-b border-neutral-100 last:border-0 text-left active:bg-neutral-50 transition cursor-pointer"
    >
      {/* Avatar initial */}
      <div className="relative w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-neutral-600">{initial}</span>
        {isOverdue && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white"
            aria-label="Overdue"
            title="Overdue"
          />
        )}
        {isActive && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
            aria-label="Active"
            title="Active"
          />
        )}
      </div>

      {/* Name + phone */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">{name}</p>
        <p className="text-xs text-neutral-500 truncate">{phone || 'No phone'}</p>
      </div>

      {/* Call and SMS icons (Rendered ONLY if debtor has phone) */}
      {hasPhone && (
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <a
            href={`tel:${phone}`}
            aria-label={`Call ${name}`}
            className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 transition active:scale-95 min-w-[36px] min-h-[36px]"
            title={`Call ${phone}`}
          >
            {PhoneIcon}
          </a>
          <a
            href={`sms:${phone}`}
            aria-label={`Send SMS to ${name}`}
            className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-500 hover:text-blue-600 hover:bg-blue-50 transition active:scale-95 min-w-[36px] min-h-[36px]"
            title={`Message ${phone}`}
          >
            {MessageIcon}
          </a>
        </div>
      )}

      {/* Balance, Trend Arrow & Status Pill */}
      <div className="flex-shrink-0 text-right min-w-[70px]">
        <div className="flex items-center justify-end gap-1">
          <span
            className={`text-sm font-bold ${
              balance > 0 ? 'text-neutral-900' : balance < 0 ? 'text-emerald-700' : 'text-neutral-400'
            }`}
          >
            {formatPKR(balance)}
          </span>
          {balance > 0 && TrendUpIcon}
          {balance < 0 && TrendDownIcon}
        </div>
        {balance > 0 && (
          <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full">
            Owed
          </span>
        )}
        {balance < 0 && (
          <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
            Advance
          </span>
        )}
      </div>
    </div>
  );
};

export default DebtorRow;
