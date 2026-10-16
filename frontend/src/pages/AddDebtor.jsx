// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { createDebtor } from '../api/debtor.api';

// const AddDebtor = () => {
//   const navigate = useNavigate();

//   const [formData, setFormData] = useState({
//     name: '',
//     phone: '',
//     openingBalance: '',
//     notes: '',
//   });
//   const [fieldErrors, setFieldErrors] = useState({});
//   const [serverError, setServerError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleChange = (field, value) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//     if (fieldErrors[field]) {
//       setFieldErrors((prev) => ({ ...prev, [field]: '' }));
//     }
//   };

//   const validate = () => {
//     const errors = {};

//     if (!formData.name || formData.name.trim().length < 2) {
//       errors.name = 'Name must be at least 2 characters';
//     }

//     const phoneTrim = formData.phone.trim();
//     if (phoneTrim && !/^\+?[0-9]{10,15}$/.test(phoneTrim)) {
//       errors.phone = 'Phone number must be 10-15 digits, optionally starting with +';
//     }

//     if (formData.openingBalance.trim() !== '') {
//       const num = Number(formData.openingBalance);
//       if (Number.isNaN(num)) {
//         errors.openingBalance = 'Opening balance must be a number';
//       }
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
//         name: formData.name.trim(),
//         notes: formData.notes.trim() || undefined,
//       };
//       if (formData.phone.trim()) payload.phone = formData.phone.trim();
//       if (formData.openingBalance.trim() !== '') {
//         payload.openingBalance = Number(formData.openingBalance);
//       }

//       const data = await createDebtor(payload);

//       if (data.success && data.data?._id) {
//         // Duplicate phone is a non-blocking warning, not an error — still
//         // proceed, just carry the flag forward so the Detail page (once
//         // it exists) can show a dismissible notice.
//         navigate(`/debtors/${data.data._id}`, {
//           replace: true,
//           state: { duplicateWarning: Boolean(data.duplicateWarning) },
//         });
//       } else {
//         setServerError(data.message || 'Failed to create debtor');
//       }
//     } catch (err) {
//       const status = err.response?.status;
//       const data = err.response?.data;

//       if (status === 400 && data?.errors) {
//         setFieldErrors(data.errors);
//         setServerError('Please correct the errors in the form.');
//       } else {
//         setServerError(data?.message || 'Something went wrong. Please try again.');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-6">
//       <div className="w-full max-w-md mx-auto pt-4 sm:pt-10 flex-1 flex flex-col justify-between">
//         <div>
//           {/* Top bar */}
//           <div className="flex items-center justify-between mb-6">
//             <button
//               type="button"
//               onClick={() => navigate('/debtors')}
//               disabled={loading}
//               className="text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 min-h-[36px] py-1 pr-2 transition"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
//               </svg>
//               <span>Back</span>
//             </button>
//           </div>

//           {/* Heading */}
//           <div className="mb-6">
//             <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
//               Add Debtor
//             </h1>
//             <p className="text-sm sm:text-base text-neutral-600 mt-1">
//               Add a new customer to your ledger
//             </p>
//           </div>

//           {/* Server error */}
//           {serverError && (
//             <div
//               role="alert"
//               className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
//             >
//               {serverError}
//             </div>
//           )}

//           {/* Form */}
//           <form id="add-debtor-form" onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label htmlFor="name" className="block text-sm font-medium text-neutral-800 mb-1.5">
//                 Full Name
//               </label>
//               <input
//                 id="name"
//                 type="text"
//                 placeholder="e.g. Ali Raza"
//                 value={formData.name}
//                 onChange={(e) => handleChange('name', e.target.value)}
//                 disabled={loading}
//                 className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
//                   fieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
//                 }`}
//               />
//               {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
//             </div>

//             <div>
//               <label htmlFor="phone" className="block text-sm font-medium text-neutral-800 mb-1.5">
//                 Phone Number <span className="text-neutral-400 font-normal">(optional)</span>
//               </label>
//               <input
//                 id="phone"
//                 type="tel"
//                 inputMode="tel"
//                 placeholder="03001234567 or +923001234567"
//                 value={formData.phone}
//                 onChange={(e) => handleChange('phone', e.target.value)}
//                 disabled={loading}
//                 className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
//                   fieldErrors.phone ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
//                 }`}
//               />
//               {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
//             </div>

//             <div>
//               <label
//                 htmlFor="openingBalance"
//                 className="block text-sm font-medium text-neutral-800 mb-1.5"
//               >
//                 Opening Balance <span className="text-neutral-400 font-normal">(optional)</span>
//               </label>
//               <input
//                 id="openingBalance"
//                 type="number"
//                 inputMode="decimal"
//                 placeholder="0"
//                 value={formData.openingBalance}
//                 onChange={(e) => handleChange('openingBalance', e.target.value)}
//                 disabled={loading}
//                 className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
//                   fieldErrors.openingBalance
//                     ? 'border-red-400 focus:ring-red-500'
//                     : 'border-neutral-300'
//                 }`}
//               />
//               {fieldErrors.openingBalance && (
//                 <p className="text-xs text-red-600 mt-1">{fieldErrors.openingBalance}</p>
//               )}
//               <p className="text-xs text-neutral-400 mt-1">
//                 Any amount this customer already owed before joining Udhaar Hub.
//               </p>
//             </div>

//             <div>
//               <label htmlFor="notes" className="block text-sm font-medium text-neutral-800 mb-1.5">
//                 Notes <span className="text-neutral-400 font-normal">(optional)</span>
//               </label>
//               <textarea
//                 id="notes"
//                 rows={3}
//                 placeholder="e.g. Pays late every Ramadan"
//                 value={formData.notes}
//                 onChange={(e) => handleChange('notes', e.target.value)}
//                 disabled={loading}
//                 className="w-full px-3.5 py-3 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition resize-none"
//               />
//             </div>
//           </form>
//         </div>

//         {/* Bottom pinned action */}
//         <div className="pt-8 pb-4">
//           <button
//             type="submit"
//             form="add-debtor-form"
//             disabled={loading}
//             className="w-full flex items-center justify-center min-h-[48px] px-4 py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-base font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
//           >
//             {loading ? (
//               <span className="flex items-center gap-2">
//                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                 </svg>
//                 <span>Adding debtor...</span>
//               </span>
//             ) : (
//               'Add Debtor'
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AddDebtor;




import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDebtor } from '../api/debtor.api';

const AddDebtor = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    openingBalance: '',
    notes: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const phoneTrim = formData.phone.trim();
    if (phoneTrim && !/^\+?[0-9]{10,15}$/.test(phoneTrim)) {
      errors.phone = 'Phone number must be 10-15 digits, optionally starting with +';
    }

    if (formData.openingBalance.trim() !== '') {
      const num = Number(formData.openingBalance);
      if (Number.isNaN(num)) {
        errors.openingBalance = 'Opening balance must be a number';
      }
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
        name: formData.name.trim(),
        notes: formData.notes.trim() || undefined,
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.openingBalance.trim() !== '') {
        payload.openingBalance = Number(formData.openingBalance);
      }

      const data = await createDebtor(payload);

      if (data.success && data.data?._id) {
        // Duplicate phone is a non-blocking warning, not an error — still
        // proceed, just carry the flag forward so the Detail page (once
        // it exists) can show a dismissible notice.
        navigate(`/debtors/${data.data._id}`, {
          replace: true,
          state: { duplicateWarning: Boolean(data.duplicateWarning) },
        });
      } else {
        setServerError(data.message || 'Failed to create debtor');
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 400 && data?.errors) {
        setFieldErrors(data.errors);
        setServerError('Please correct the errors in the form.');
      } else {
        setServerError(data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-neutral-50 flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto pt-4 sm:pt-10 flex-1 flex flex-col justify-between">
        <div>
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => navigate('/debtors')}
              disabled={loading}
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 min-h-[36px] py-1 pr-2 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Add Debtor
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-1">
              Add a new customer to your ledger
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {serverError}
            </div>
          )}

          {/* Form */}
          <form id="add-debtor-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-800 mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Ali Raza"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={loading}
                className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  fieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                }`}
              />
              {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-800 mb-1.5">
                Phone Number <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="03001234567 or +923001234567"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={loading}
                className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  fieldErrors.phone ? 'border-red-400 focus:ring-red-500' : 'border-neutral-300'
                }`}
              />
              {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
            </div>

            <div>
              <label
                htmlFor="openingBalance"
                className="block text-sm font-medium text-neutral-800 mb-1.5"
              >
                Opening Balance <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="openingBalance"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formData.openingBalance}
                onChange={(e) => handleChange('openingBalance', e.target.value)}
                disabled={loading}
                className={`w-full px-3.5 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition ${
                  fieldErrors.openingBalance
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-neutral-300'
                }`}
              />
              {fieldErrors.openingBalance && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.openingBalance}</p>
              )}
              <p className="text-xs text-neutral-400 mt-1">
                Any amount this customer already owed before joining Udhaar Hub.
              </p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-neutral-800 mb-1.5">
                Notes <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="e.g. Pays late every Ramadan"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-3 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 bg-white text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 transition resize-none"
              />
            </div>
          </form>
        </div>

        {/* Bottom pinned action */}
        <div className="pt-8 pb-4">
          <button
            type="submit"
            form="add-debtor-form"
            disabled={loading}
            className="w-full flex items-center justify-center min-h-[48px] px-4 py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white text-base font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Adding debtor...</span>
              </span>
            ) : (
              'Add Debtor'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDebtor;
