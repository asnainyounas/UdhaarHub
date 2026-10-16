/**
 * formatPKR – Format a number as PKR currency with thousands separators.
 * e.g. 12500 → "PKR 12,500"
 * Negative values → "PKR -12,500"
 */
export const formatPKR = (value) => {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return num < 0 ? `PKR -${formatted}` : `PKR ${formatted}`;
};

/**
 * daysOverdue – Compute how many days ago a date was relative to today.
 * Returns a positive integer (e.g. 5 for 5 days ago).
 * Returns null if dateString is falsy.
 */
export const daysOverdue = (dateString) => {
  if (!dateString) return null;
  const ref = new Date(dateString);
  const today = new Date();
  const diff = (today - ref) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(diff));
};

/**
 * formatShortDate – Format a date as "Sep 10" or "Sep 10, 2024" if year differs.
 */
export const formatShortDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  const now = new Date();
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-PK', opts);
};
