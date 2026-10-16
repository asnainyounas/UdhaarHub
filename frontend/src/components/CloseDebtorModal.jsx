import React, { useState } from 'react';
import { updateDebtorStatus } from '../api/debtor.api';
import { formatPKR } from '../utils/format';

/**
 * CloseDebtorModal
 *
 * Three states:
 *  1. initial   – "Close this debtor?" with Cancel / Confirm
 *  2. blocked   – backend returned 409 (outstanding balance) — show the
 *                 real balance, offer "Confirm close anyway" or a link to
 *                 go record a payment instead
 *  3. loading   – buttons disabled, spinner shown
 *
 * Never claims success before the API actually confirms it. Never bypasses
 * the 409 restriction on its own — only proceeds to confirmClose: true when
 * the user explicitly clicks the second confirmation button.
 */
const CloseDebtorModal = ({ debtorId, onClose, onClosed, onGoToAddPayment }) => {
  const [state, setState] = useState('initial'); // 'initial' | 'blocked' | 'loading'
  const [blockedBalance, setBlockedBalance] = useState(null);
  const [error, setError] = useState('');

  const attemptClose = async (confirmClose = false) => {
    setState('loading');
    setError('');

    try {
      const data = await updateDebtorStatus(debtorId, {
        status: 'closed',
        ...(confirmClose ? { confirmClose: true } : {}),
      });

      if (data.success) {
        onClosed(data.data);
      } else {
        setError(data.message || 'Failed to close debtor.');
        setState('initial');
      }
    } catch (err) {
      const status = err.response?.status;
      const respData = err.response?.data;

      if (status === 409 && respData?.requiresConfirmation) {
        setBlockedBalance(respData.currentBalance ?? 0);
        setState('blocked');
      } else {
        setError(respData?.message || 'Something went wrong. Please try again.');
        setState('initial');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4 overflow-y-auto"
        style={{
          maxHeight: 'calc(85vh - env(safe-area-inset-bottom, 0px))',
          overscrollBehavior: 'contain',
        }}
      >
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-1 rounded-full mb-2">
            Close debtor
          </span>
          <h2 className="text-lg font-bold text-neutral-900">Close this debtor?</h2>
        </div>

        {state === 'initial' && (
          <p className="text-sm text-neutral-600">
            This will mark the debtor as closed. Their charges and payments stay in your records —
            nothing is deleted.
          </p>
        )}

        {state === 'blocked' && (
          <>
            <p className="text-sm text-neutral-600">This debtor still has an outstanding balance.</p>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Outstanding balance</p>
              <p className="text-2xl font-bold text-neutral-900 mt-0.5">
                {formatPKR(blockedBalance)}
              </p>
              <p className="text-xs text-neutral-400 mt-1">The balance will remain in the financial history.</p>
            </div>
            <p className="text-sm font-medium text-neutral-800">Are you sure you want to close this debtor?</p>
            {onGoToAddPayment && (
              <button
                type="button"
                onClick={onGoToAddPayment}
                className="text-sm font-medium text-neutral-900 underline underline-offset-2"
              >
                Record a payment instead
              </button>
            )}
          </>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={state === 'loading'}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => attemptClose(state === 'blocked')}
            disabled={state === 'loading'}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition disabled:opacity-60"
          >
            {state === 'loading'
              ? 'Closing...'
              : state === 'blocked'
              ? 'Confirm close anyway'
              : 'Confirm close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseDebtorModal;
