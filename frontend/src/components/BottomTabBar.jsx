import React from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    path: '/debtors',
    label: 'Debtors',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    path: '/activity',
    label: 'Activity',
    icon: (
      // Fixed: the old path had a typo ("9 9 9 0 0118") which drew a broken squiggle.
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const ALLOWED_PATHS = ['/dashboard', '/debtors', '/activity'];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated || !ALLOWED_PATHS.includes(location.pathname)) {
    return null;
  }

  const content = (
    <nav
      aria-label="Bottom Navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-lg"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-2 rounded-xl transition ${
                isActive
                  ? 'text-neutral-900 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-600 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg transition ${isActive ? 'bg-neutral-100 text-neutral-900' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default BottomTabBar;
