import React from 'react';
import { SummaryCardSkeleton } from './ui';
import { formatPKR } from '../utils/format';

// Mobile keeps the original look (coloured dot + label). From lg up each card gets a tinted
// icon tile and a soft gradient, chosen by the `tone` prop.
const DOT = { neutral: 'bg-neutral-400', green: 'bg-emerald-500', red: 'bg-rose-500' };

const TONES = {
  indigo: { tile: 'bg-indigo-100 text-indigo-600', card: 'lg:from-white lg:to-indigo-50 lg:border-indigo-100' },
  emerald: { tile: 'bg-emerald-100 text-emerald-600', card: 'lg:from-white lg:to-emerald-50 lg:border-emerald-100' },
  sky: { tile: 'bg-sky-100 text-sky-600', card: 'lg:from-white lg:to-sky-50 lg:border-sky-100' },
  rose: { tile: 'bg-rose-100 text-rose-600', card: 'lg:from-white lg:to-rose-50 lg:border-rose-100' },
};

const svgProps = {
  className: 'h-5 w-5',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const ICONS = {
  indigo: (
    <svg {...svgProps}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" />
    </svg>
  ),
  emerald: (
    <svg {...svgProps}>
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  sky: (
    <svg {...svgProps}>
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  rose: (
    <svg {...svgProps}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.5" />
    </svg>
  ),
};

const SummaryCard = ({ label, value, isCurrency, accent = 'neutral', tone = 'indigo', sub, loading }) => {
  if (loading) return <SummaryCardSkeleton />;

  const t = TONES[tone] || TONES.indigo;
  const hasValue = value !== undefined && value !== null;
  const display = !hasValue ? '—' : isCurrency ? formatPKR(value) : value;

  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition duration-200 lg:rounded-2xl lg:bg-gradient-to-br lg:p-5 lg:shadow-md lg:shadow-slate-200/60 lg:hover:-translate-y-0.5 lg:hover:shadow-lg ${t.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <span className={`h-2 w-2 flex-shrink-0 rounded-full lg:hidden ${DOT[accent] || DOT.neutral}`} />
            {label}
          </p>
          <p className="mt-1.5 text-xl font-bold text-neutral-900 lg:mt-3 lg:text-3xl">{display}</p>
          {sub && <p className="mt-1 text-xs text-neutral-400 lg:text-sm">{sub}</p>}
        </div>
        <span className={`hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl lg:flex ${t.tile}`}>
          {ICONS[tone] || ICONS.indigo}
        </span>
      </div>
    </div>
  );
};

export default SummaryCard;
