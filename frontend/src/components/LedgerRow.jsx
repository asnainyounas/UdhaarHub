import React from 'react';
import { formatPKR, formatShortDate } from '../utils/format';

const CHARGE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
  </svg>
);

const PAYMENT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
  </svg>
);

/**
 * LedgerRow – A single entry in a debtor's full ledger/statement.
 * Reversed entries are visually distinguished (muted + strikethrough +
 * "Reversed" label) since the ledger endpoint intentionally includes both
 * active and reversed entries for a full audit trail.
 */
const LedgerRow = ({ type, amount, note, status, transactionDate }) => {
  const isCharge = type === 'charge';
  const isReversed = status === 'reversed';

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0 ${isReversed ? 'opacity-50' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCharge ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
        }`}
      >
        {isCharge ? CHARGE_ICON : PAYMENT_ICON}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-neutral-900 ${isReversed ? 'line-through' : ''}`}>
          {isCharge ? 'Charge' : 'Payment'}
          {isReversed && (
            <span className="ml-2 text-xs font-normal text-red-500 no-underline">Reversed</span>
          )}
        </p>
        {note ? (
          <p className={`text-xs text-neutral-500 truncate ${isReversed ? 'line-through' : ''}`}>{note}</p>
        ) : (
          <p className="text-xs text-neutral-400">{formatShortDate(transactionDate)}</p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <p
          className={`text-sm font-bold ${isReversed ? 'line-through text-neutral-400' : isCharge ? 'text-red-600' : 'text-emerald-600'}`}
        >
          {isCharge ? '+' : '−'} {formatPKR(amount)}
        </p>
        {note && <p className="text-xs text-neutral-400 mt-0.5">{formatShortDate(transactionDate)}</p>}
      </div>
    </div>
  );
};

export default LedgerRow;
