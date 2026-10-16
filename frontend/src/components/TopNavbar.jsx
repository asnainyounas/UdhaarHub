import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/debtors', label: 'Debtors' },
  { path: '/activity', label: 'Activity' },
];

/**
 * Desktop top navigation (lg and up only). Dark bar, full width;
 * the max-width limit lives on the INNER wrapper.
 */
const TopNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const onMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const isActive = (path) =>
    path === '/debtors' ? location.pathname.startsWith('/debtors') : location.pathname === path;

  return (
    <header className="hidden lg:block sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 shadow-lg shadow-slate-900/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-lg font-semibold text-white shadow-md shadow-indigo-500/30">
            U
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">Udhaar Hub</span>
            {company?.name && <span className="block text-xs text-slate-400">{company.name}</span>}
          </span>
        </Link>

        {/* Links - wider gaps and padding */}
        <nav className="flex items-center gap-3" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-sm font-bold text-white ring-2 ring-white/20 transition active:scale-[0.97]"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>

          {open && (
            <div className="dropdown-pop absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
              <p className="truncate px-4 py-2 text-sm font-medium text-slate-900">
                {user?.name || 'User'}
              </p>
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
