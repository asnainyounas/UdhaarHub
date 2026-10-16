// import React, { useState, useEffect, useCallback } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import { getDebtorLedger, updateDebtorStatus } from '../api/debtor.api';
// import { SectionSkeleton, SectionError, EmptyState } from '../components/ui';
// import LedgerRow from '../components/LedgerRow';
// import CloseDebtorModal from '../components/CloseDebtorModal';
// import { formatPKR } from '../utils/format';

// const STATUS_STYLES = {
//   active: 'bg-emerald-50 text-emerald-700',
//   inactive: 'bg-amber-50 text-amber-700',
//   closed: 'bg-neutral-200 text-neutral-600',
// };

// const LEDGER_LIMIT = 50;

// const DebtorDetail = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const location = useLocation();

//   const [debtor, setDebtor] = useState(null);
//   const [ledger, setLedger] = useState([]);
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [loading, setLoading] = useState(true);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [error, setError] = useState(false);

//   const [showCloseModal, setShowCloseModal] = useState(false);
//   const [reopening, setReopening] = useState(false);
//   const [actionError, setActionError] = useState('');

//   const [dismissedDuplicateNotice, setDismissedDuplicateNotice] = useState(false);
//   const duplicateWarning = Boolean(location.state?.duplicateWarning) && !dismissedDuplicateNotice;

//   const fetchLedger = useCallback(
//     async (pageNum, append = false) => {
//       if (append) setLoadingMore(true);
//       else setLoading(true);
//       setError(false);

//       try {
//         const res = await getDebtorLedger(id, { page: pageNum, limit: LEDGER_LIMIT, order: 'asc' });
//         const body = res.data || {};
//         setDebtor(body.debtor || null);
//         setLedger((prev) => (append ? [...prev, ...(body.ledger || [])] : body.ledger || []));
//         setTotalPages(body.pagination?.totalPages || 1);
//         setPage(body.pagination?.page || pageNum);
//       } catch (err) {
//         setError(true);
//       } finally {
//         setLoading(false);
//         setLoadingMore(false);
//       }
//     },
//     [id]
//   );

//   useEffect(() => {
//     fetchLedger(1, false);
//   }, [fetchLedger]);

//   const handleLoadMore = () => {
//     if (page < totalPages && !loadingMore) fetchLedger(page + 1, true);
//   };

//   const handleReopen = async () => {
//     setActionError('');
//     setReopening(true);
//     try {
//       const data = await updateDebtorStatus(id, { status: 'active' });
//       if (data.success) {
//         setDebtor((prev) => (prev ? { ...prev, status: data.data.status } : prev));
//       }
//     } catch (err) {
//       setActionError(err.response?.data?.message || 'Failed to reopen debtor.');
//     } finally {
//       setReopening(false);
//     }
//   };

//   const handleClosed = (updatedDebtor) => {
//     setDebtor((prev) => (prev ? { ...prev, status: updatedDebtor.status } : prev));
//     setShowCloseModal(false);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-neutral-50 p-4">
//         <SectionSkeleton rows={5} />
//       </div>
//     );
//   }

//   if (error || !debtor) {
//     return (
//       <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
//         <SectionError message="Failed to load this debtor. Please try again." onRetry={() => fetchLedger(1, false)} />
//       </div>
//     );
//   }

//   const isClosed = debtor.status === 'closed';

//   return (
//     <div className="min-h-screen bg-neutral-50 pb-8">
//       {/* Sticky top section */}
//       <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
//         <div className="px-4 py-3 flex items-center justify-between">
//           <button
//             onClick={() => navigate('/debtors')}
//             className="text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 min-h-9 py-1 pr-2 transition"
//           >
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
//             </svg>
//             <span>Debtors</span>
//           </button>
//         </div>

//         <div className="px-4 pb-4">
//           {duplicateWarning && (
//             <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start justify-between gap-2">
//               <span>A debtor with this phone number already exists. Double-check this isn't a duplicate entry.</span>
//               <button onClick={() => setDismissedDuplicateNotice(true)} className="font-semibold shrink-0">
//                 ✕
//               </button>
//             </div>
//           )}

//           <div className="flex items-start justify-between gap-2">
//             <div>
//               <h1 className="text-xl font-bold text-neutral-900">{debtor.name}</h1>
//               {debtor.phone && <p className="text-sm text-neutral-500">{debtor.phone}</p>}
//             </div>
//             <span
//               className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${STATUS_STYLES[debtor.status] || 'bg-neutral-100 text-neutral-600'}`}
//             >
//               {debtor.status}
//             </span>
//           </div>

//           <div className="mt-4">
//             <p className="text-xs text-neutral-500">Current balance</p>
//             <p className="text-3xl font-bold text-neutral-900 mt-0.5">
//               {formatPKR(debtor.currentBalance)}
//             </p>
//           </div>

//           {actionError && (
//             <div role="alert" className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
//               {actionError}
//             </div>
//           )}

//           <div className="mt-4 grid grid-cols-2 gap-2">
//             <button
//               onClick={() => navigate(`/debtors/${id}/add-charge`, { state: { debtorName: debtor.name } })}
//               className="min-h-11 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium transition"
//             >
//               Add Charge
//             </button>
//             <button
//               onClick={() => navigate(`/debtors/${id}/add-payment`, { state: { debtorName: debtor.name } })}
//               className="min-h-11 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition"
//             >
//               Add Payment
//             </button>
//           </div>
//           <div className="mt-2">
//             {isClosed ? (
//               <button
//                 onClick={handleReopen}
//                 disabled={reopening}
//                 className="w-full min-h-11 px-3 rounded-lg border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition disabled:opacity-60"
//               >
//                 {reopening ? 'Reopening...' : 'Reopen Debtor'}
//               </button>
//             ) : (
//               <button
//                 onClick={() => setShowCloseModal(true)}
//                 className="w-full min-h-11 px-3 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
//               >
//                 Close Debtor
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Ledger section */}
//       <div className="px-4 py-4">
//         <h2 className="text-sm font-semibold text-neutral-700 mb-2">Ledger</h2>
//         {ledger.length === 0 ? (
//           <div className="bg-white rounded-xl border border-neutral-200">
//             <EmptyState message="No transactions yet." />
//           </div>
//         ) : (
//           <div className="bg-white rounded-xl border border-neutral-200 px-3">
//             {ledger.map((entry) => (
//               <LedgerRow
//                 key={entry._id}
//                 type={entry.type}
//                 amount={entry.amount}
//                 note={entry.note}
//                 status={entry.status}
//                 transactionDate={entry.transactionDate}
//               />
//             ))}
//           </div>
//         )}

//         {page < totalPages && (
//           <div className="flex justify-center py-4">
//             <button
//               onClick={handleLoadMore}
//               disabled={loadingMore}
//               className="text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg px-4 py-2 hover:bg-neutral-50 transition disabled:opacity-50"
//             >
//               {loadingMore ? 'Loading...' : 'Load more'}
//             </button>
//           </div>
//         )}
//       </div>

//       {showCloseModal && (
//         <CloseDebtorModal
//           debtorId={id}
//           onClose={() => setShowCloseModal(false)}
//           onClosed={handleClosed}
//           onGoToAddPayment={() => {
//             setShowCloseModal(false);
//             navigate(`/debtors/${id}/add-payment`, { state: { debtorName: debtor.name } });
//           }}
//         />
//       )}
//     </div>
//   );
// };

// export default DebtorDetail;




import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getDebtorLedger, updateDebtorStatus } from '../api/debtor.api';
import { SectionSkeleton, SectionError, EmptyState } from '../components/ui';
import LedgerRow from '../components/LedgerRow';
import CloseDebtorModal from '../components/CloseDebtorModal';
import { formatPKR, formatShortDate } from '../utils/format';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  inactive: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  closed: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
};

const LEDGER_LIMIT = 50;

const DebtorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [debtor, setDebtor] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [actionError, setActionError] = useState('');

  const [dismissedDuplicateNotice, setDismissedDuplicateNotice] = useState(false);
  const duplicateWarning = Boolean(location.state?.duplicateWarning) && !dismissedDuplicateNotice;

  const fetchLedger = useCallback(
    async (pageNum, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(false);

      try {
        const res = await getDebtorLedger(id, { page: pageNum, limit: LEDGER_LIMIT, order: 'asc' });
        const body = res.data || {};
        setDebtor(body.debtor || null);
        setLedger((prev) => (append ? [...prev, ...(body.ledger || [])] : body.ledger || []));
        setTotalPages(body.pagination?.totalPages || 1);
        setPage(body.pagination?.page || pageNum);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchLedger(1, false);
  }, [fetchLedger]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) fetchLedger(page + 1, true);
  };

  const handleReopen = async () => {
    setActionError('');
    setReopening(true);
    try {
      const data = await updateDebtorStatus(id, { status: 'active' });
      if (data.success) {
        setDebtor((prev) => (prev ? { ...prev, status: data.data.status } : prev));
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reopen debtor.');
    } finally {
      setReopening(false);
    }
  };

  const handleClosed = (updatedDebtor) => {
    setDebtor((prev) => (prev ? { ...prev, status: updatedDebtor.status } : prev));
    setShowCloseModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-neutral-50 p-4">
        <SectionSkeleton rows={5} />
      </div>
    );
  }

  if (error || !debtor) {
    return (
      <div className="min-h-dvh bg-neutral-50 flex items-center justify-center p-4">
        <SectionError message="Failed to load this debtor. Please try again." onRetry={() => fetchLedger(1, false)} />
      </div>
    );
  }

  const isClosed = debtor.status === 'closed';
  const balance = Number(debtor.currentBalance) || 0;
  const lastTransactionDate = ledger.length > 0
    ? ledger[ledger.length - 1]?.transactionDate
    : debtor.lastPaymentDate || debtor.createdAt;

  return (
    <div className="min-h-dvh bg-neutral-50 pb-8">
      {/* Sticky top section */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/debtors')}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 min-h-9 py-1 pr-2 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Debtors</span>
          </button>
        </div>

        <div className="px-4 pb-4">
          {duplicateWarning && (
            <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start justify-between gap-2">
              <span>A debtor with this phone number already exists. Double-check this isn't a duplicate entry.</span>
              <button onClick={() => setDismissedDuplicateNotice(true)} className="font-semibold shrink-0">
                ✕
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{debtor.name}</h1>
              {debtor.phone && <p className="text-sm text-neutral-500">{debtor.phone}</p>}
            </div>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[debtor.status] || 'bg-neutral-100 text-neutral-600'}`}
            >
              {debtor.status}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs text-neutral-500">Current balance</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p
                className={`text-3xl font-bold ${
                  balance > 0 ? 'text-neutral-900' : balance < 0 ? 'text-emerald-700' : 'text-neutral-400'
                }`}
              >
                {formatPKR(balance)}
              </p>
              {balance > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5 text-red-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0L14 7.06v4.69a.75.75 0 001.5 0v-7a.75.75 0 00-.75-.75h-7a.75.75 0 000 1.5h4.69L4.69 13.72a.75.75 0 000 1.06z" clipRule="evenodd" />
                  </svg>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full">
                    Owed
                  </span>
                </div>
              )}
              {balance < 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.78 5.22a.75.75 0 00-1.06 0L6 12.94V8.25a.75.75 0 00-1.5 0v7c0 .414.336.75.75.75h7a.75.75 0 000-1.5H7.56l7.72-7.72a.75.75 0 000-1.06z" clipRule="evenodd" />
                  </svg>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                    Advance
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Reminder suggestion card */}
          {balance > 0 && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-950">Payment Reminder Suggestion</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Last transaction was on <span className="font-medium text-amber-950">{formatShortDate(lastTransactionDate)}</span>. Consider sending a reminder for the remaining balance.
                </p>
              </div>
            </div>
          )}

          {actionError && (
            <div role="alert" className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
              {actionError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate(`/debtors/${id}/add-charge`, { state: { debtorName: debtor.name } })}
              className="min-h-11 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium transition"
            >
              Add Charge
            </button>
            <button
              onClick={() => navigate(`/debtors/${id}/add-payment`, { state: { debtorName: debtor.name } })}
              className="min-h-11 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition"
            >
              Add Payment
            </button>
          </div>
          <div className="mt-2">
            {isClosed ? (
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="w-full min-h-11 px-3 rounded-lg border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition disabled:opacity-60"
              >
                {reopening ? 'Reopening...' : 'Reopen Debtor'}
              </button>
            ) : (
              <button
                onClick={() => setShowCloseModal(true)}
                className="w-full min-h-11 px-3 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
              >
                Close Debtor
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger section */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-neutral-700 mb-2">Ledger</h2>
        {ledger.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200">
            <EmptyState message="No transactions yet." />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 px-3">
            {ledger.map((entry) => (
              <LedgerRow
                key={entry._id}
                type={entry.type}
                amount={entry.amount}
                note={entry.note}
                status={entry.status}
                transactionDate={entry.transactionDate}
              />
            ))}
          </div>
        )}

        {page < totalPages && (
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

      {showCloseModal && (
        <CloseDebtorModal
          debtorId={id}
          onClose={() => setShowCloseModal(false)}
          onClosed={handleClosed}
          onGoToAddPayment={() => {
            setShowCloseModal(false);
            navigate(`/debtors/${id}/add-payment`, { state: { debtorName: debtor.name } });
          }}
        />
      )}
    </div>
  );
};

export default DebtorDetail;
