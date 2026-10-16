import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import BottomTabBar from './components/BottomTabBar';
import { Spinner } from './components/ui';
import useMediaQuery from './hooks/useMediaQuery';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DebtorList from './pages/DebtorList';
import DebtorsDesktop from './pages/DebtorsDesktop';
import AddDebtor from './pages/AddDebtor';
import DebtorDetail from './pages/DebtorDetail';
import AddCharge from './pages/AddCharge';
import AddPayment from './pages/AddPayment';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import ActivityDesktop from './pages/ActivityDesktop';

// Phones keep the existing page file; desktop (1024px+) gets its own desktop page.
// Only one of the two is ever mounted, so there are no duplicate API calls.
const Responsive = ({ mobile: Mobile, desktop: Desktop }) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isDesktop ? <Desktop /> : <Mobile />;
};

// Root path redirect: /dashboard if logged in, /login if not
const RootRedirect = () => {
  const { isAuthenticated, authChecked } = useAuth();

  if (!authChecked) {
    return (
      <div className="min-h-dvh bg-neutral-50 flex items-center justify-center">
        <Spinner className="h-8 w-8 text-neutral-900" />
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* One protected layout route: auth check first, then navbar + page */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/debtors" element={<Responsive mobile={DebtorList} desktop={DebtorsDesktop} />} />
            <Route path="/debtors/new" element={<AddDebtor />} />
            <Route path="/debtors/:id" element={<DebtorDetail />} />
            <Route path="/debtors/:id/add-charge" element={<AddCharge />} />
            <Route path="/debtors/:id/add-payment" element={<AddPayment />} />
            <Route path="/activity" element={<Responsive mobile={Activity} desktop={ActivityDesktop} />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomTabBar />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
