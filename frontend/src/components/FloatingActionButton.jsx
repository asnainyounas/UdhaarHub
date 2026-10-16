import React from 'react';
import ReactDOM from 'react-dom';

/**
 * FloatingActionButton
 *
 * Renders its content via ReactDOM.createPortal() into document.body, making
 * it completely immune to any ancestor's transform / filter / backdrop-filter /
 * will-change / contain that would otherwise create a new fixed-positioning
 * containing block and push the button off-screen.
 *
 * Also accounts for the iOS home-indicator / Android gesture bar via
 * env(safe-area-inset-bottom), which requires viewport-fit=cover in the
 * meta viewport tag (already present in index.html).
 *
 * Props
 *   onClick   - click handler
 *   children  - button label / content
 *   label     - convenience string label (used if children is omitted)
 *   className - optional extra Tailwind classes to override defaults
 */
const FloatingActionButton = ({ onClick, children, label, className = '' }) => {
  const button = (
    <button
      onClick={onClick}
      aria-label={typeof children === 'string' ? children : label}
      style={{
        bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))',
        right: '1.5rem',
      }}
      className={[
        'fixed z-50',
        'bg-neutral-900 text-white text-sm font-semibold rounded-full',
        'px-5 py-3.5 shadow-lg',
        'active:scale-95 transition',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children ?? label}
    </button>
  );

  return ReactDOM.createPortal(button, document.body);
};

export default FloatingActionButton;
