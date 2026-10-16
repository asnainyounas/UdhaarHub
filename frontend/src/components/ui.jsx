import React from 'react';

/**
 * SectionSkeleton – Generic skeleton placeholder for a loading section.
 * `rows` controls how many skeleton rows to render.
 */
export const SectionSkeleton = ({ rows = 3 }) => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-neutral-200 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-neutral-200 rounded w-3/4" />
          <div className="h-3 bg-neutral-200 rounded w-1/2" />
        </div>
        <div className="h-3 bg-neutral-200 rounded w-16" />
      </div>
    ))}
  </div>
);

/**
 * SummaryCardSkeleton – Skeleton for each summary card.
 */
export const SummaryCardSkeleton = () => (
  <div className="animate-pulse bg-white border border-neutral-200 rounded-xl p-4 space-y-2">
    <div className="h-3 bg-neutral-200 rounded w-2/3" />
    <div className="h-6 bg-neutral-200 rounded w-1/2 mt-1" />
    <div className="h-2.5 bg-neutral-100 rounded w-1/3 mt-1" />
  </div>
);

/**
 * Spinner – Minimal inline spinner for small loading states.
 */
export const Spinner = ({ className = 'h-5 w-5 text-neutral-400' }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

/**
 * SectionError – Per-section error state with a retry button.
 */
export const SectionError = ({ message = 'Something went wrong.', onRetry }) => (
  <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
    <p className="text-sm text-red-600">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs font-medium text-neutral-700 border border-neutral-300 rounded-lg px-3 py-1.5 hover:bg-neutral-50 transition"
      >
        Retry
      </button>
    )}
  </div>
);

/**
 * EmptyState – Minimal empty placeholder for a section.
 */
export const EmptyState = ({ message = 'Nothing here yet.' }) => (
  <div className="flex items-center justify-center py-8 text-center">
    <p className="text-sm text-neutral-400">{message}</p>
  </div>
);
