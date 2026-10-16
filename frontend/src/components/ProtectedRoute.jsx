import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authChecked } = useAuth();
  const location = useLocation();

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Spinner className="h-8 w-8 text-neutral-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
