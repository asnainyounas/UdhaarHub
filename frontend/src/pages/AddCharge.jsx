// import React, { useState } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import { createCharge } from '../api/charge.api';

// const AddCharge = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const debtorName = location.state?.debtorName;

//   const [amount, setAmount] = useState('');
//   const [note, setNote] = useState('');
//   const [dueDate, setDueDate] = useState('');

//   const [fieldErrors, setFieldErrors] = useState({});
//   const [serverError, setServerError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const todayStr = new Date().toISOString().split('T')[0];

//   const validate = () => {
//     const errors = {};
//     const num = Number(amount);
//     if (!amount || Number.isNaN(num) || num <= 0) {
//       errors.amount = 'Amount must be greater than 0';
//     }
//     if (dueDate && dueDate < todayStr) {
//       errors.dueDate = 'Due date cannot be before today';
//     }
//     setFieldErrors(errors);
//     return Object.keys(errors).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setServerError('');

//     if (!validate()) return;

//     setLoading(true);

//     try {
//       const payload = {
//         debtorId: id,
//         amount: Number(amount),
//       };
//       if (note.trim()) payload.note = note.trim();
//       if (dueDate) payload.dueDate = dueDate;

//       const data = await createCharge(payload);

//       if (data.success) {
//         navigate(`/debtors/${id}`, { replace: true });
//       } else {
//         setServerError(data.message || 'Failed to add charge');
//       }
//     } catch (err) {
//       const status = err.response?.status;
//       const respData = err.response?.data;

//       if (status === 400 && respData?.errors) {
//         setFieldErrors(respData.errors);
//         setServerError('Please correct the errors in the form.');
//       } else {
//         setServerError(respData?.message || 'Something went wrong. Please try again.');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-6">
//       <div className="w-full max-w-md mx-auto pt-4 sm:pt-10 flex-1 flex flex-col justify-between">
//         <div>
//           <div className="flex items-center justify-between mb-6">
//             <button
//               type="button"
//               onClick={() => navigate(`/debtors/${id}`)}
//               disabled={loading}
//               className="text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 min-h-9 py-1 pr-2 transition"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
//               </svg>
//               <span>Back</span>
//             </button>
//           </div>

//           <div className="mb-6">
//             <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
//               Add Charge
//             </h1>
//             <p className="text-sm sm:text-base text-neutral-600 mt-1">
//               {debtorName ? `Add a new charge for ${debtorName}` : 'Add a new charge for this debtor'}
//             </p>
//           </div>

//           {serverError && (
//             <div role="alert" className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
//               {serverError}
//             </div>
//           )}

//           <form id="add-charge-form" onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label htmlFor="amount" className="block text-sm font-medium text-neutral-800 mb-1.5">
//                 Amount (PKR)
//               </label>
//               <input
//                 id="amount"
//                 type="number"
//                 inputMode="decimal"
//                 placeholder="e.g. 5000"
//                 value={amount}
//                 onChange={(e) => {
//                   setAmount(e.target.value);
//                   if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: '' }));
//                 }}
//                 disabled={loading}
//                 className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
//                   fieldErrors.amount ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
//                 }`}
//               />
//               {fieldErrors.amount && <p className="text-xs text-red-600 mt-1">{fieldErrors.amount}</p>}
//             </div>

//             <div>
//               <label htmlFor="note" className="block text-sm font-medium text-neutral-800 mb-1.5">
//                 Note <span className="text-neutral-400 font-normal">(optional)</span>
//               </label>
//               <input
//                 id="note"
//                 type="text"
//                 placeholder="e.g. Flour bags on credit"
//                 value={note}
//                 onChange={(e) => setNote(e.target.value)}
//                 disabled={loading}
//                 className="w-full px-3.5 py-3 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
//               />
//             </div>

//             <div>
//               <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-800 mb-1.5">
//                 Due Date <span className="text-neutral-400 font-normal">(optional)</span>
//               </label>
//               <input
//                 id="dueDate"
//                 type="date"
//                 min={todayStr}
//                 value={dueDate}
//                 onChange={(e) => {
//                   setDueDate(e.target.value);
//                   if (fieldErrors.dueDate) setFieldErrors((prev) => ({ ...prev, dueDate: '' }));
//                 }}
//                 disabled={loading}
//                 className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
//                   fieldErrors.dueDate ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
//                 }`}
//               />
//               {fieldErrors.dueDate && <p className="text-xs text-red-600 mt-1">{fieldErrors.dueDate}</p>}
//               <p className="text-xs text-neutral-400 mt-1">
//                 Leave blank if there's no specific repayment deadline.
//               </p>
//             </div>
//           </form>
//         </div>

//         <div className="pt-8 pb-4">
//           <button
//             type="submit"
//             form="add-charge-form"
//             disabled={loading}
//             className="w-full flex items-center justify-center min-h-12 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-base font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
//           >
//             {loading ? (
//               <span className="flex items-center gap-2">
//                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                 </svg>
//                 <span>Adding charge...</span>
//               </span>
//             ) : (
//               'Add Charge'
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AddCharge;




import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createCharge } from '../api/charge.api';

const AddCharge = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const debtorName = location.state?.debtorName;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const validate = () => {
    const errors = {};
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (dueDate && dueDate < todayStr) {
      errors.dueDate = 'Due date cannot be before today';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        debtorId: id,
        amount: Number(amount),
      };
      if (note.trim()) payload.note = note.trim();
      if (dueDate) payload.dueDate = dueDate;

      const data = await createCharge(payload);

      if (data.success) {
        navigate(`/debtors/${id}`, { replace: true });
      } else {
        setServerError(data.message || 'Failed to add charge');
      }
    } catch (err) {
      const status = err.response?.status;
      const respData = err.response?.data;

      if (status === 400 && respData?.errors) {
        setFieldErrors(respData.errors);
        setServerError('Please correct the errors in the form.');
      } else {
        setServerError(respData?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-neutral-50 flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto pt-4 sm:pt-10 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => navigate(`/debtors/${id}`)}
              disabled={loading}
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 min-h-9 py-1 pr-2 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Add Charge
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-1">
              {debtorName ? `Add a new charge for ${debtorName}` : 'Add a new charge for this debtor'}
            </p>
          </div>

          {serverError && (
            <div role="alert" className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form id="add-charge-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-neutral-800 mb-1.5">
                Amount (PKR)
              </label>
              <input
                id="amount"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: '' }));
                }}
                disabled={loading}
                className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  fieldErrors.amount ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                }`}
              />
              {fieldErrors.amount && <p className="text-xs text-red-600 mt-1">{fieldErrors.amount}</p>}
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-neutral-800 mb-1.5">
                Note <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="note"
                type="text"
                placeholder="e.g. Flour bags on credit"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-3 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
              />
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-800 mb-1.5">
                Due Date <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="dueDate"
                type="date"
                min={todayStr}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (fieldErrors.dueDate) setFieldErrors((prev) => ({ ...prev, dueDate: '' }));
                }}
                disabled={loading}
                className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  fieldErrors.dueDate ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                }`}
              />
              {fieldErrors.dueDate && <p className="text-xs text-red-600 mt-1">{fieldErrors.dueDate}</p>}
              <p className="text-xs text-neutral-400 mt-1">
                Leave blank if there's no specific repayment deadline.
              </p>
            </div>
          </form>
        </div>

        <div className="pt-8 pb-4">
          <button
            type="submit"
            form="add-charge-form"
            disabled={loading}
            className="w-full flex items-center justify-center min-h-12 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-base font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Adding charge...</span>
              </span>
            ) : (
              'Add Charge'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCharge;
