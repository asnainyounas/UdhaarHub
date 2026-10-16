import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNavbar from './TopNavbar';

/**
 * Wraps every protected page. The navbar only shows at lg and up
 * (it hides itself below that), so mobile is unchanged.
 * `page-fade-in` is defined in index.css and only animates at lg+.
 */
const Layout = () => {
  const location = useLocation();
  return (
    <>
      <TopNavbar />
      <div key={location.pathname} className="page-fade-in">
        <Outlet />
      </div>
    </>
  );
};

export default Layout;
